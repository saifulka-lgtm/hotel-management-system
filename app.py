"""
Smart Hotel Management System Bangladesh
Run: python app.py
Visit: http://127.0.0.1:5000
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_cors import CORS
from flask_login import login_user, logout_user, login_required, current_user
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date, timedelta
from sqlalchemy import func
from flasgger import Swagger

from config import Config
from extensions import db, login_manager, migrate, jwt

# ── App Factory ───────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)
app.config.from_object(Config)

db.init_app(app)
login_manager.init_app(app)
migrate.init_app(app, db)
jwt.init_app(app)

# ── JWT Error Handlers ────────────────────────────────────────────────────────
@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        'error': 'Authorization token is missing',
        'hint': 'Add header: Authorization: Bearer <your_token>',
        'how_to_get_token': 'POST /api/auth/login'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'error': 'Token is invalid or malformed',
        'hint': 'Login again to get a fresh token'
    }), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'error': 'Token has expired',
        'hint': 'Use POST /api/auth/refresh with your refresh token'
    }), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'error': 'Token has been revoked',
        'hint': 'Please login again'
    }), 401

# ── Swagger Config ────────────────────────────────────────────────────────────
swagger_config = {
    'headers': [],
    'specs': [
        {
            'endpoint': 'apispec',
            'route': '/apispec.json',
            'rule_filter': lambda rule: True,
            'model_filter': lambda tag: True,
        }
    ],
    'static_url_path': '/flasgger_static',
    'swagger_ui': True,
    'specs_route': '/apidocs/',
    'ui_params': {
        'displayOperationId': False,
        'defaultModelsExpandDepth': -1,
        'docExpansion': 'list',
        'filter': True,
        'operationsSorter': 'alpha',
        'tagsSorter': 'alpha',
    }
}

swagger_template = {
    'swagger': '2.0',
    'info': {
        'title': 'Enterprise Hospitality Platform API',
        'description': 'REST API for Smart Hotel Management System Bangladesh',
        'version': '1.0.0',
    },
    'securityDefinitions': {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description': 'Enter: Bearer {your_token}'
        }
    },
    'tags': [
        {'name': 'Auth',      'description': 'Login, logout, token management'},
        {'name': 'Rooms',     'description': 'Room availability and management'},
        {'name': 'Bookings',  'description': 'Booking operations'},
        {'name': 'Customers', 'description': 'Customer management'},
        {'name': 'Payments',  'description': 'Payment operations'},
        {'name': 'Reports',   'description': 'Revenue and financial reports'},
    ]
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

# ── Models ────────────────────────────────────────────────────────────────────
from models.admin    import Admin
from models.room     import Room
from models.customer import Customer
from models.booking  import Booking
from models.payment  import Payment
from models.checkin  import CheckIn
from models.checkout import CheckOut

@login_manager.user_loader
def load_user(user_id):
    return Admin.query.get(int(user_id))

# ── Seed ──────────────────────────────────────────────────────────────────────
def seed_db():
    if not Admin.query.first():
        db.session.add(Admin(
            username='admin',
            password=generate_password_hash('admin123')
        ))
        db.session.commit()
        print("✅  Admin created  →  admin / admin123")

    if not Room.query.first():
        rooms = [
            Room(room_number='101', room_type='Single', ac_type='AC',     price=1500),
            Room(room_number='102', room_type='Single', ac_type='AC',     price=1500),
            Room(room_number='103', room_type='Single', ac_type='Non-AC', price=1000),
            Room(room_number='104', room_type='Single', ac_type='Non-AC', price=1000),
            Room(room_number='105', room_type='Single', ac_type='AC',     price=1500),
            Room(room_number='201', room_type='Double', ac_type='AC',     price=2500),
            Room(room_number='202', room_type='Double', ac_type='AC',     price=2500),
            Room(room_number='203', room_type='Double', ac_type='Non-AC', price=1800),
            Room(room_number='204', room_type='Double', ac_type='Non-AC', price=1800),
            Room(room_number='205', room_type='Double', ac_type='AC',     price=2500),
        ]
        db.session.add_all(rooms)
        db.session.commit()
        print("✅  10 rooms inserted")

# ── Helpers ───────────────────────────────────────────────────────────────────
def today():
    return date.today()

def is_room_available(room_id, checkin, checkout, exclude_booking_id=None):
    query = Booking.query.filter(
        Booking.room_id == room_id,
        Booking.booking_status != 'Cancelled',
        Booking.checkin_date < checkout,
        Booking.checkout_date > checkin
    )
    if exclude_booking_id:
        query = query.filter(Booking.id != exclude_booking_id)
    return query.first() is None

# ── Token Blocklist ───────────────────────────────────────────────────────────
token_blocklist = set()

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    return jwt_payload['jti'] in token_blocklist

# ── Web Auth ──────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return redirect(url_for('dashboard') if current_user.is_authenticated else url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        admin = Admin.query.filter_by(username=username).first()
        if admin and check_password_hash(admin.password, password):
            login_user(admin)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'danger')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.route('/dashboard')
@login_required
def dashboard():
    td          = date.today()
    month_start = td.replace(day=1)

    total_rooms     = Room.query.count()
    available_rooms = Room.query.filter_by(status='Available').count()
    occupied_rooms  = Room.query.filter_by(status='Occupied').count()
    total_customers = Customer.query.count()

    daily_rev = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
        .join(Booking).filter(func.date(Payment.created_at) == td).scalar() or 0

    monthly_rev = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
        .filter(Payment.created_at >= month_start).scalar() or 0

    recent_bookings = Booking.query.order_by(Booking.created_at.desc()).limit(8).all()

    chart_labels, chart_data = [], []
    for i in range(5, -1, -1):
        m   = (td.replace(day=1) - timedelta(days=30 * i))
        ms  = m.replace(day=1)
        me  = (ms + timedelta(days=32)).replace(day=1)
        rev = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
                .filter(Payment.created_at >= ms, Payment.created_at < me).scalar() or 0
        chart_labels.append(ms.strftime('%b %Y'))
        chart_data.append(float(rev))

    return render_template('dashboard.html',
        total_rooms=total_rooms, available_rooms=available_rooms,
        occupied_rooms=occupied_rooms, total_customers=total_customers,
        daily_rev=daily_rev, monthly_rev=monthly_rev,
        recent_bookings=recent_bookings,
        chart_labels=chart_labels, chart_data=chart_data,
        now=datetime.now()
    )

# ── Rooms ─────────────────────────────────────────────────────────────────────
@app.route('/rooms')
@login_required
def rooms():
    all_rooms = Room.query.order_by(Room.room_number).all()
    return render_template('rooms.html', rooms=all_rooms)

@app.route('/add-room', methods=['POST'])
@login_required
def add_room():
    rn = request.form.get('room_number', '').strip()
    if Room.query.filter_by(room_number=rn).first():
        flash(f'Room {rn} already exists.', 'warning')
        return redirect(url_for('rooms'))
    db.session.add(Room(
        room_number=rn,
        room_type=request.form.get('room_type'),
        ac_type=request.form.get('ac_type'),
        price=float(request.form.get('price', 0))
    ))
    db.session.commit()
    flash(f'Room {rn} added!', 'success')
    return redirect(url_for('rooms'))

@app.route('/edit-room/<int:id>', methods=['POST'])
@login_required
def edit_room(id):
    r = Room.query.get_or_404(id)
    r.room_number = request.form.get('room_number', r.room_number).strip()
    r.room_type   = request.form.get('room_type', r.room_type)
    r.ac_type     = request.form.get('ac_type', r.ac_type)
    r.price       = float(request.form.get('price', r.price))
    r.status      = request.form.get('status', r.status)
    db.session.commit()
    flash(f'Room {r.room_number} updated!', 'success')
    return redirect(url_for('rooms'))

@app.route('/delete-room/<int:id>', methods=['POST'])
@login_required
def delete_room(id):
    r = Room.query.get_or_404(id)
    if r.bookings:
        flash('Cannot delete room with bookings.', 'warning')
        return redirect(url_for('rooms'))
    db.session.delete(r)
    db.session.commit()
    flash('Room deleted.', 'success')
    return redirect(url_for('rooms'))

# ── Customers ─────────────────────────────────────────────────────────────────
@app.route('/customers')
@login_required
def customers():
    q = request.args.get('search', '').strip()
    if q:
        cs = Customer.query.filter(
            (Customer.full_name.ilike(f'%{q}%')) |
            (Customer.phone.ilike(f'%{q}%')) |
            (Customer.nid_passport.ilike(f'%{q}%'))
        ).order_by(Customer.created_at.desc()).all()
    else:
        cs = Customer.query.order_by(Customer.created_at.desc()).all()
    return render_template('customers.html', customers=cs, search=q)

@app.route('/add-customer', methods=['POST'])
@login_required
def add_customer():
    c = Customer(
        full_name=request.form.get('full_name','').strip(),
        phone=request.form.get('phone','').strip(),
        email=request.form.get('email','').strip(),
        nid_passport=request.form.get('nid_passport','').strip(),
        address=request.form.get('address','').strip()
    )
    db.session.add(c)
    db.session.commit()
    flash(f'Customer {c.full_name} added!', 'success')
    return redirect(url_for('customers'))

@app.route('/edit-customer/<int:id>', methods=['POST'])
@login_required
def edit_customer(id):
    c = Customer.query.get_or_404(id)
    c.full_name    = request.form.get('full_name', c.full_name).strip()
    c.phone        = request.form.get('phone', c.phone).strip()
    c.email        = request.form.get('email', c.email).strip()
    c.nid_passport = request.form.get('nid_passport', c.nid_passport).strip()
    c.address      = request.form.get('address', c.address).strip()
    db.session.commit()
    flash('Customer updated!', 'success')
    return redirect(url_for('customers'))

@app.route('/delete-customer/<int:id>', methods=['POST'])
@login_required
def delete_customer(id):
    c = Customer.query.get_or_404(id)
    db.session.delete(c)
    db.session.commit()
    flash('Customer deleted.', 'success')
    return redirect(url_for('customers'))

@app.route('/customer-history/<int:id>')
@login_required
def customer_history(id):
    c = Customer.query.get_or_404(id)
    return render_template('customer_history.html', customer=c)

# ── Booking ───────────────────────────────────────────────────────────────────
@app.route('/book-room', methods=['GET', 'POST'])
def book_room():
    if request.method == 'POST':
        full_name    = request.form.get('full_name','').strip()
        phone        = request.form.get('phone','').strip()
        email        = request.form.get('email','').strip()
        nid_passport = request.form.get('nid_passport','').strip()
        address      = request.form.get('address','').strip()
        room_id      = int(request.form.get('room_id'))
        ci_str       = request.form.get('checkin_date','')
        co_str       = request.form.get('checkout_date','')

        try:
            ci = datetime.strptime(ci_str, '%Y-%m-%d').date()
            co = datetime.strptime(co_str, '%Y-%m-%d').date()
        except ValueError:
            flash('Invalid dates.', 'danger')
            return redirect(url_for('book_room'))

        if co <= ci:
            flash('Check-out must be after check-in.', 'danger')
            return redirect(url_for('book_room'))

        room = Room.query.get_or_404(room_id)

        if room.status == 'Maintenance':
            flash('This room is currently under maintenance.', 'warning')
            return redirect(url_for('book_room'))

        if not is_room_available(room_id, ci, co):
            flash('Sorry, this room is no longer available for the selected dates.', 'warning')
            return redirect(url_for('book_room'))

        nights = (co - ci).days
        total  = room.price * nights

        customer = Customer.query.filter_by(phone=phone).first()
        if not customer:
            customer = Customer(full_name=full_name, phone=phone,
                                email=email, nid_passport=nid_passport, address=address)
            db.session.add(customer)
            db.session.flush()

        booking = Booking(customer_id=customer.id, room_id=room_id,
                          checkin_date=ci, checkout_date=co, total_amount=total)
        db.session.add(booking)
        db.session.flush()

        payment = Payment(booking_id=booking.id, paid_amount=0,
                          due_amount=total, payment_status='Due')
        db.session.add(payment)
        db.session.commit()

        flash(f'Booking #{booking.id} confirmed! Total: ৳{total:,.0f}', 'success')
        return redirect(url_for('booking_confirmation', id=booking.id))

    return render_template('book_room.html', today=date.today().isoformat())

@app.route('/booking-confirmation/<int:id>')
def booking_confirmation(id):
    b = Booking.query.get_or_404(id)
    return render_template('booking_confirmation.html', booking=b)
@app.route('/my-booking', methods=['GET', 'POST'])
def my_booking():
    bookings = []
    phone    = ''
    if request.method == 'POST':
        phone    = request.form.get('phone', '').strip()
        customer = Customer.query.filter_by(phone=phone).first()
        if customer:
            bookings = Booking.query.filter_by(
                customer_id=customer.id
            ).order_by(Booking.created_at.desc()).all()
        else:
            flash('No bookings found for this phone number.', 'warning')
    return render_template('my_booking.html', bookings=bookings, phone=phone)


@app.route('/cancel-my-booking/<int:id>', methods=['POST'])
def cancel_my_booking(id):
    phone = request.form.get('phone', '').strip()
    b     = Booking.query.get_or_404(id)

    # Security check — make sure the phone matches the booking's customer
    if not b.customer or b.customer.phone != phone:
        flash('Unauthorized action.', 'danger')
        return redirect(url_for('my_booking'))

    if b.booking_status in ['Completed', 'Cancelled']:
        flash(f'Booking #{id} cannot be cancelled — it is already {b.booking_status}.', 'warning')
    else:
        b.booking_status = 'Cancelled'
        b.room.status    = 'Available'
        db.session.commit()
        flash(f'Booking #{id} has been cancelled successfully.', 'success')

    return redirect(url_for('my_booking'))

@app.route('/booking-history')
@login_required
def booking_history():
    bs = Booking.query.order_by(Booking.created_at.desc()).all()
    return render_template('bookings.html', bookings=bs)

@app.route('/cancel-booking/<int:id>', methods=['POST'])
@login_required
def cancel_booking(id):
    b = Booking.query.get_or_404(id)
    b.booking_status = 'Cancelled'
    b.room.status    = 'Available'
    db.session.commit()
    flash(f'Booking #{id} cancelled.', 'warning')
    return redirect(url_for('booking_history'))

# ── Check-In / Check-Out ──────────────────────────────────────────────────────
@app.route('/checkin/<int:id>', methods=['POST'])
@login_required
def checkin(id):
    b = Booking.query.get_or_404(id)
    if b.checkin:
        flash('Already checked in.', 'warning')
    else:
        db.session.add(CheckIn(booking_id=id))
        b.room.status    = 'Occupied'
        b.booking_status = 'Confirmed'
        db.session.commit()
        flash(f'Check-in done for Booking #{id}!', 'success')
    return redirect(url_for('booking_history'))

@app.route('/checkout/<int:id>', methods=['GET', 'POST'])
@login_required
def checkout(id):
    b = Booking.query.get_or_404(id)
    if request.method == 'POST':
        paid   = float(request.form.get('paid_amount', 0))
        method = request.form.get('payment_method', 'Cash')

        db.session.add(CheckOut(booking_id=id))
        b.room.status    = 'Available'
        b.booking_status = 'Completed'

        p = b.payment
        if p:
            p.paid_amount   += paid
            p.due_amount     = max(b.total_amount - p.paid_amount, 0)
            p.payment_method = method
            p.payment_status = 'Paid' if p.due_amount <= 0 else ('Partial' if p.paid_amount > 0 else 'Due')
        else:
            due    = max(b.total_amount - paid, 0)
            status = 'Paid' if due <= 0 else ('Partial' if paid > 0 else 'Due')
            db.session.add(Payment(booking_id=id, payment_method=method,
                                   paid_amount=paid, due_amount=due, payment_status=status))
        db.session.commit()
        flash(f'Check-out complete for Booking #{id}!', 'success')
        return redirect(url_for('invoice', id=id))

    return render_template('checkout.html', booking=b)

# ── Payments ──────────────────────────────────────────────────────────────────
@app.route('/payments')
@login_required
def payments():
    ps = Payment.query.order_by(Payment.created_at.desc()).all()
    return render_template('payments.html', payments=ps)

@app.route('/add-payment/<int:booking_id>', methods=['POST'])
@login_required
def add_payment(booking_id):
    b      = Booking.query.get_or_404(booking_id)
    paid   = float(request.form.get('paid_amount', 0))
    method = request.form.get('payment_method', 'Cash')
    p      = b.payment
    if p:
        p.paid_amount   += paid
        p.due_amount     = max(b.total_amount - p.paid_amount, 0)
        p.payment_method = method
        p.payment_status = 'Paid' if p.due_amount <= 0 else ('Partial' if p.paid_amount > 0 else 'Due')
    else:
        due    = max(b.total_amount - paid, 0)
        status = 'Paid' if due <= 0 else ('Partial' if paid > 0 else 'Due')
        db.session.add(Payment(booking_id=booking_id, payment_method=method,
                               paid_amount=paid, due_amount=due, payment_status=status))
    db.session.commit()
    flash('Payment recorded!', 'success')
    return redirect(url_for('payments'))

# ── Invoice ───────────────────────────────────────────────────────────────────
@app.route('/invoice/<int:id>')
@login_required
def invoice(id):
    return render_template('invoice.html', booking=Booking.query.get_or_404(id))

# ── Reports ───────────────────────────────────────────────────────────────────
@app.route('/reports')
@login_required
def reports():
    td = date.today()
    ms = td.replace(day=1)

    selected_date_str = request.args.get('date', td.isoformat())
    try:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
    except ValueError:
        selected_date = td

    selected_month_str = request.args.get('month', td.strftime('%Y-%m'))
    try:
        selected_month_start = datetime.strptime(selected_month_str, '%Y-%m').date().replace(day=1)
    except ValueError:
        selected_month_start = ms

    if selected_month_start.month == 12:
        next_month = selected_month_start.replace(year=selected_month_start.year + 1, month=1)
    else:
        next_month = selected_month_start.replace(month=selected_month_start.month + 1)

    daily_rev = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
        .filter(func.date(Payment.created_at) == selected_date).scalar() or 0

    monthly_rev = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
        .filter(Payment.created_at >= selected_month_start,
                Payment.created_at < next_month).scalar() or 0

    total_rev     = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0)).scalar() or 0
    paid_count    = Payment.query.filter_by(payment_status='Paid').count()
    partial_count = Payment.query.filter_by(payment_status='Partial').count()
    due_count     = Payment.query.filter_by(payment_status='Due').count()

    last_7_days = []
    for i in range(6, -1, -1):
        d   = td - timedelta(days=i)
        rev = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
                .filter(func.date(Payment.created_at) == d).scalar() or 0
        last_7_days.append({'label': d.strftime('%d %b'), 'revenue': float(rev)})

    last_6_months = []
    for i in range(5, -1, -1):
        m_start = (ms - timedelta(days=30 * i)).replace(day=1)
        m_end   = (m_start.replace(day=28) + timedelta(days=7)).replace(day=1)
        rev     = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
                    .filter(Payment.created_at >= m_start,
                            Payment.created_at < m_end).scalar() or 0
        last_6_months.append({'label': m_start.strftime('%b %Y'), 'revenue': float(rev)})

    return render_template('reports.html',
        daily_rev=daily_rev, monthly_rev=monthly_rev, total_rev=total_rev,
        paid_count=paid_count, partial_count=partial_count, due_count=due_count,
        selected_date=selected_date.isoformat(),
        selected_month=selected_month_start.strftime('%Y-%m'),
        last_7_days=last_7_days, last_6_months=last_6_months)


# =============================================================================
# ── API: AUTH ─────────────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """
    Login and get JWT access + refresh tokens
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              example: "admin"
            password:
              type: string
              example: "admin123"
    responses:
      200:
        description: Login successful
        schema:
          type: object
          properties:
            message:
              type: string
              example: "Login successful"
            access_token:
              type: string
            refresh_token:
              type: string
      401:
        description: Invalid username or password
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    admin = Admin.query.filter_by(username=username).first()
    if not admin or not check_password_hash(admin.password, password):
        return jsonify({'error': 'Invalid username or password'}), 401

    access_token  = create_access_token(identity=str(admin.id))
    refresh_token = create_refresh_token(identity=str(admin.id))

    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token_type': 'Bearer',
        'admin': {'id': admin.id, 'username': admin.username}
    }), 200


@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def api_refresh():
    """
    Get a new access token using refresh token
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: New access token issued
      401:
        description: Invalid or expired refresh token
    """
    identity     = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({'access_token': access_token}), 200


@app.route('/api/auth/logout', methods=['DELETE'])
@jwt_required()
def api_logout():
    """
    Logout and revoke current access token
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Successfully logged out
      401:
        description: Missing or invalid token
    """
    jti = get_jwt()['jti']
    token_blocklist.add(jti)
    return jsonify({'message': 'Successfully logged out. Token revoked.'}), 200


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def api_me():
    """
    Get current logged-in admin profile
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Current admin profile
      401:
        description: Missing or invalid token
    """
    admin_id = get_jwt_identity()
    admin    = Admin.query.get(int(admin_id))
    if not admin:
        return jsonify({'error': 'Admin not found'}), 404
    return jsonify({'id': admin.id, 'username': admin.username}), 200


@app.route('/api/auth/change-password', methods=['PUT'])
@jwt_required()
def api_change_password():
    """
    Change admin password
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - current_password
            - new_password
          properties:
            current_password:
              type: string
              example: "admin123"
            new_password:
              type: string
              example: "newpassword456"
    responses:
      200:
        description: Password changed successfully
      400:
        description: Missing fields or password too short
      401:
        description: Current password incorrect
    """
    admin_id         = get_jwt_identity()
    admin            = Admin.query.get(int(admin_id))
    data             = request.get_json() or {}
    current_password = data.get('current_password', '')
    new_password     = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({'error': 'Both current_password and new_password are required'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400
    if not check_password_hash(admin.password, current_password):
        return jsonify({'error': 'Current password is incorrect'}), 401

    admin.password = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({'message': 'Password changed successfully. Please login again.'}), 200


@app.route('/api/auth/register', methods=['POST'])
@jwt_required()
def api_register_admin():
    """
    Register a new admin (requires existing admin JWT token)
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              example: "manager"
            password:
              type: string
              example: "manager123"
    responses:
      201:
        description: New admin created
      400:
        description: Username already exists or missing fields
      401:
        description: Not authenticated
    """
    data     = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if Admin.query.filter_by(username=username).first():
        return jsonify({'error': f"Username '{username}' already exists"}), 400

    new_admin = Admin(username=username, password=generate_password_hash(password))
    db.session.add(new_admin)
    db.session.commit()
    return jsonify({'message': f"Admin {username} created", 'id': new_admin.id}), 201


# =============================================================================
# ── API: ROOMS ────────────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/rooms')
def api_rooms():
    """
    Get all available rooms
    ---
    tags:
      - Rooms
    responses:
      200:
        description: List of all available rooms
    """
    rooms = Room.query.filter_by(status='Available').all()
    return jsonify([{
        'id': r.id, 'room_number': r.room_number,
        'room_type': r.room_type, 'ac_type': r.ac_type,
        'price': r.price
    } for r in rooms])


@app.route('/api/rooms', methods=['POST'])
@jwt_required()
def api_create_room():
    """
    Create a new room
    ---
    tags:
      - Rooms
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - room_number
            - room_type
            - ac_type
            - price
          properties:
            room_number:
              type: string
              example: "301"
            room_type:
              type: string
              enum: [Single, Double, Suite]
              example: "Single"
            ac_type:
              type: string
              enum: [AC, Non-AC]
              example: "AC"
            price:
              type: number
              example: 1500
    responses:
      201:
        description: Room created successfully
      400:
        description: Missing fields or room already exists
      401:
        description: Unauthorized
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['room_number', 'room_type', 'ac_type', 'price']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400

    if Room.query.filter_by(room_number=data['room_number']).first():
        return jsonify({'error': f"Room {data['room_number']} already exists"}), 400

    room = Room(
        room_number=str(data['room_number']).strip(),
        room_type=data['room_type'],
        ac_type=data['ac_type'],
        price=float(data['price'])
    )
    db.session.add(room)
    db.session.commit()
    return jsonify({'message': f"Room {room.room_number} created", 'id': room.id}), 201


@app.route('/api/rooms/<int:id>', methods=['GET'])
def api_get_room(id):
    """
    Get a single room by ID
    ---
    tags:
      - Rooms
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Room details
      404:
        description: Room not found
    """
    r = Room.query.get_or_404(id)
    return jsonify({
        'id': r.id, 'room_number': r.room_number,
        'room_type': r.room_type, 'ac_type': r.ac_type,
        'price': r.price, 'status': r.status
    })


@app.route('/api/rooms/<int:id>', methods=['PUT'])
@jwt_required()
def api_update_room(id):
    """
    Update a room
    ---
    tags:
      - Rooms
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            room_number:
              type: string
              example: "101"
            room_type:
              type: string
              example: "Double"
            ac_type:
              type: string
              example: "AC"
            price:
              type: number
              example: 2000
            status:
              type: string
              enum: [Available, Occupied, Maintenance]
              example: "Available"
    responses:
      200:
        description: Room updated successfully
      401:
        description: Unauthorized
      404:
        description: Room not found
    """
    r    = Room.query.get_or_404(id)
    data = request.get_json() or {}
    r.room_number = data.get('room_number', r.room_number)
    r.room_type   = data.get('room_type',   r.room_type)
    r.ac_type     = data.get('ac_type',     r.ac_type)
    r.price       = float(data.get('price', r.price))
    r.status      = data.get('status',      r.status)
    db.session.commit()
    return jsonify({'message': f"Room {r.room_number} updated"})


@app.route('/api/rooms/<int:id>', methods=['DELETE'])
@jwt_required()
def api_delete_room(id):
    """
    Delete a room
    ---
    tags:
      - Rooms
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Room deleted
      400:
        description: Room has bookings and cannot be deleted
      401:
        description: Unauthorized
      404:
        description: Room not found
    """
    r = Room.query.get_or_404(id)
    if r.bookings:
        return jsonify({'error': 'Cannot delete room with existing bookings'}), 400
    db.session.delete(r)
    db.session.commit()
    return jsonify({'message': f"Room {r.room_number} deleted"})


@app.route('/api/available-rooms')
def api_available_rooms():
    """
    Get rooms available for specific dates
    ---
    tags:
      - Rooms
    parameters:
      - name: checkin
        in: query
        type: string
        required: true
        example: "2026-07-01"
      - name: checkout
        in: query
        type: string
        required: true
        example: "2026-07-05"
    responses:
      200:
        description: List of available rooms for selected dates
      400:
        description: Invalid or missing dates
    """
    checkin_str  = request.args.get('checkin')
    checkout_str = request.args.get('checkout')
    try:
        ci = datetime.strptime(checkin_str, '%Y-%m-%d').date()
        co = datetime.strptime(checkout_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid dates. Use YYYY-MM-DD format.'}), 400

    if co <= ci:
        return jsonify({'error': 'Check-out must be after check-in.'}), 400

    rooms     = Room.query.filter(Room.status != 'Maintenance').all()
    available = [r for r in rooms if is_room_available(r.id, ci, co)]
    return jsonify([{
        'id': r.id, 'room_number': r.room_number,
        'room_type': r.room_type, 'ac_type': r.ac_type,
        'price': r.price
    } for r in available])


# =============================================================================
# ── API: CUSTOMERS ────────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/customers')
@jwt_required()
def api_customers():
    """
    Get all customers
    ---
    tags:
      - Customers
    security:
      - Bearer: []
    responses:
      200:
        description: List of all customers
      401:
        description: Unauthorized
    """
    customers = Customer.query.all()
    return jsonify([{
        'id': c.id, 'full_name': c.full_name,
        'phone': c.phone, 'email': c.email,
        'total_bookings': len(c.bookings)
    } for c in customers])


@app.route('/api/customers', methods=['POST'])
@jwt_required()
def api_create_customer():
    """
    Create a new customer
    ---
    tags:
      - Customers
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - full_name
            - phone
          properties:
            full_name:
              type: string
              example: "Md. Syful Islam"
            phone:
              type: string
              example: "+8801712345678"
            email:
              type: string
              example: "syful@example.com"
            nid_passport:
              type: string
              example: "1234567890"
            address:
              type: string
              example: "Dhaka, Bangladesh"
    responses:
      201:
        description: Customer created
      400:
        description: Missing required fields
      401:
        description: Unauthorized
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    if not data.get('full_name') or not data.get('phone'):
        return jsonify({'error': 'full_name and phone are required'}), 400

    c = Customer(
        full_name=data['full_name'].strip(),
        phone=data['phone'].strip(),
        email=data.get('email', '').strip(),
        nid_passport=data.get('nid_passport', '').strip(),
        address=data.get('address', '').strip()
    )
    db.session.add(c)
    db.session.commit()
    return jsonify({'message': f"Customer {c.full_name} created", 'id': c.id}), 201


@app.route('/api/customers/<int:id>', methods=['GET'])
@jwt_required()
def api_get_customer(id):
    """
    Get a single customer by ID
    ---
    tags:
      - Customers
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Customer details with booking history
      401:
        description: Unauthorized
      404:
        description: Customer not found
    """
    c = Customer.query.get_or_404(id)
    return jsonify({
        'id': c.id, 'full_name': c.full_name,
        'phone': c.phone, 'email': c.email,
        'nid_passport': c.nid_passport, 'address': c.address,
        'total_bookings': len(c.bookings),
        'bookings': [{
            'id': b.id,
            'room': b.room.room_number if b.room else None,
            'checkin_date': b.checkin_date.isoformat(),
            'checkout_date': b.checkout_date.isoformat(),
            'total_amount': b.total_amount,
            'status': b.booking_status
        } for b in c.bookings]
    })


@app.route('/api/customers/<int:id>', methods=['PUT'])
@jwt_required()
def api_update_customer(id):
    """
    Update a customer
    ---
    tags:
      - Customers
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            full_name:
              type: string
              example: "Md. Syful Islam Bhuiyan"
            phone:
              type: string
              example: "+8801712345678"
            email:
              type: string
              example: "new@example.com"
            nid_passport:
              type: string
              example: "9876543210"
            address:
              type: string
              example: "Chittagong, Bangladesh"
    responses:
      200:
        description: Customer updated
      401:
        description: Unauthorized
      404:
        description: Customer not found
    """
    c    = Customer.query.get_or_404(id)
    data = request.get_json() or {}
    c.full_name    = data.get('full_name',    c.full_name).strip()
    c.phone        = data.get('phone',        c.phone).strip()
    c.email        = data.get('email',        c.email).strip()
    c.nid_passport = data.get('nid_passport', c.nid_passport).strip()
    c.address      = data.get('address',      c.address).strip()
    db.session.commit()
    return jsonify({'message': f"Customer {c.full_name} updated"})


@app.route('/api/customers/<int:id>', methods=['DELETE'])
@jwt_required()
def api_delete_customer(id):
    """
    Delete a customer
    ---
    tags:
      - Customers
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Customer deleted
      401:
        description: Unauthorized
      404:
        description: Customer not found
    """
    c = Customer.query.get_or_404(id)
    db.session.delete(c)
    db.session.commit()
    return jsonify({'message': f"Customer {c.full_name} deleted"})


# =============================================================================
# ── API: BOOKINGS ─────────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/bookings')
@jwt_required()
def api_bookings():
    """
    Get all bookings
    ---
    tags:
      - Bookings
    security:
      - Bearer: []
    responses:
      200:
        description: List of all bookings
      401:
        description: Unauthorized
    """
    bookings = Booking.query.order_by(Booking.created_at.desc()).all()
    return jsonify([{
        'id': b.id,
        'customer': b.customer.full_name if b.customer else None,
        'room': b.room.room_number if b.room else None,
        'checkin_date': b.checkin_date.isoformat(),
        'checkout_date': b.checkout_date.isoformat(),
        'total_amount': b.total_amount,
        'status': b.booking_status
    } for b in bookings])


@app.route('/api/bookings', methods=['POST'])
@jwt_required()
def api_create_booking():
    """
    Create a new booking
    ---
    tags:
      - Bookings
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - customer_id
            - room_id
            - checkin_date
            - checkout_date
          properties:
            customer_id:
              type: integer
              example: 1
            room_id:
              type: integer
              example: 2
            checkin_date:
              type: string
              example: "2026-07-10"
            checkout_date:
              type: string
              example: "2026-07-15"
    responses:
      201:
        description: Booking created
      400:
        description: Invalid data or room not available
      401:
        description: Unauthorized
      404:
        description: Customer or room not found
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['customer_id', 'room_id', 'checkin_date', 'checkout_date']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400

    try:
        ci = datetime.strptime(data['checkin_date'], '%Y-%m-%d').date()
        co = datetime.strptime(data['checkout_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    if co <= ci:
        return jsonify({'error': 'Check-out must be after check-in'}), 400

    customer = Customer.query.get(data['customer_id'])
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404

    room = Room.query.get(data['room_id'])
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    if room.status == 'Maintenance':
        return jsonify({'error': 'Room is under maintenance'}), 400

    if not is_room_available(room.id, ci, co):
        return jsonify({'error': 'Room is not available for the selected dates'}), 400

    nights  = (co - ci).days
    total   = room.price * nights
    booking = Booking(customer_id=customer.id, room_id=room.id,
                      checkin_date=ci, checkout_date=co, total_amount=total)
    db.session.add(booking)
    db.session.flush()

    db.session.add(Payment(booking_id=booking.id, paid_amount=0,
                           due_amount=total, payment_status='Due'))
    db.session.commit()

    return jsonify({
        'message': f"Booking #{booking.id} created",
        'id': booking.id, 'total_amount': total, 'nights': nights
    }), 201


@app.route('/api/bookings/<int:id>', methods=['GET'])
@jwt_required()
def api_get_booking(id):
    """
    Get a single booking by ID
    ---
    tags:
      - Bookings
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Booking details
      401:
        description: Unauthorized
      404:
        description: Booking not found
    """
    b = Booking.query.get_or_404(id)
    return jsonify({
        'id': b.id,
        'customer_id': b.customer_id,
        'customer': b.customer.full_name if b.customer else None,
        'room_id': b.room_id,
        'room': b.room.room_number if b.room else None,
        'checkin_date': b.checkin_date.isoformat(),
        'checkout_date': b.checkout_date.isoformat(),
        'total_amount': b.total_amount,
        'status': b.booking_status,
        'payment_status': b.payment.payment_status if b.payment else None,
        'paid_amount': b.payment.paid_amount if b.payment else 0,
        'due_amount': b.payment.due_amount if b.payment else b.total_amount
    })


@app.route('/api/bookings/<int:id>/cancel', methods=['PUT'])
@jwt_required()
def api_cancel_booking(id):
    """
    Cancel a booking
    ---
    tags:
      - Bookings
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Booking cancelled
      400:
        description: Already completed or cancelled
      401:
        description: Unauthorized
      404:
        description: Booking not found
    """
    b = Booking.query.get_or_404(id)
    if b.booking_status in ['Completed', 'Cancelled']:
        return jsonify({'error': f'Cannot cancel a {b.booking_status} booking'}), 400
    b.booking_status = 'Cancelled'
    b.room.status    = 'Available'
    db.session.commit()
    return jsonify({'message': f"Booking #{id} cancelled"})


@app.route('/api/bookings/<int:id>/checkin', methods=['PUT'])
@jwt_required()
def api_checkin(id):
    """
    Check in a guest
    ---
    tags:
      - Bookings
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Guest checked in successfully
      400:
        description: Already checked in or booking cancelled
      401:
        description: Unauthorized
      404:
        description: Booking not found
    """
    b = Booking.query.get_or_404(id)
    if b.checkin:
        return jsonify({'error': 'Guest already checked in'}), 400
    if b.booking_status == 'Cancelled':
        return jsonify({'error': 'Cannot check in a cancelled booking'}), 400
    db.session.add(CheckIn(booking_id=id))
    b.room.status    = 'Occupied'
    b.booking_status = 'Confirmed'
    db.session.commit()
    return jsonify({'message': f"Guest checked in for Booking #{id}"})


@app.route('/api/bookings/<int:id>/checkout', methods=['PUT'])
@jwt_required()
def api_checkout(id):
    """
    Check out a guest and record payment
    ---
    tags:
      - Bookings
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            paid_amount:
              type: number
              example: 7500
            payment_method:
              type: string
              enum: [Cash, Card, bKash, Nagad]
              example: "Cash"
    responses:
      200:
        description: Guest checked out and payment recorded
      400:
        description: Guest not checked in or already checked out
      401:
        description: Unauthorized
      404:
        description: Booking not found
    """
    b = Booking.query.get_or_404(id)
    if not b.checkin:
        return jsonify({'error': 'Guest has not checked in yet'}), 400
    if b.booking_status == 'Completed':
        return jsonify({'error': 'Guest already checked out'}), 400

    data   = request.get_json() or {}
    paid   = float(data.get('paid_amount', 0))
    method = data.get('payment_method', 'Cash')

    db.session.add(CheckOut(booking_id=id))
    b.room.status    = 'Available'
    b.booking_status = 'Completed'

    p = b.payment
    if p:
        p.paid_amount   += paid
        p.due_amount     = max(b.total_amount - p.paid_amount, 0)
        p.payment_method = method
        p.payment_status = 'Paid' if p.due_amount <= 0 else ('Partial' if p.paid_amount > 0 else 'Due')
    else:
        due    = max(b.total_amount - paid, 0)
        status = 'Paid' if due <= 0 else ('Partial' if paid > 0 else 'Due')
        db.session.add(Payment(booking_id=id, payment_method=method,
                               paid_amount=paid, due_amount=due, payment_status=status))
    db.session.commit()

    return jsonify({
        'message': f"Guest checked out for Booking #{id}",
        'paid_amount': paid,
        'due_amount': max(b.total_amount - paid, 0),
        'payment_status': b.payment.payment_status if b.payment else 'Due'
    })


# =============================================================================
# ── API: PAYMENTS ─────────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/payments')
@jwt_required()
def api_payments():
    """
    Get all payments
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    responses:
      200:
        description: List of all payments
      401:
        description: Unauthorized
    """
    payments = Payment.query.order_by(Payment.created_at.desc()).all()
    return jsonify([{
        'id': p.id, 'booking_id': p.booking_id,
        'paid_amount': p.paid_amount, 'due_amount': p.due_amount,
        'payment_method': p.payment_method, 'payment_status': p.payment_status
    } for p in payments])


@app.route('/api/payments/<int:id>', methods=['GET'])
@jwt_required()
def api_get_payment(id):
    """
    Get a single payment by ID
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Payment details
      401:
        description: Unauthorized
      404:
        description: Payment not found
    """
    p = Payment.query.get_or_404(id)
    return jsonify({
        'id': p.id, 'booking_id': p.booking_id,
        'paid_amount': p.paid_amount, 'due_amount': p.due_amount,
        'payment_method': p.payment_method, 'payment_status': p.payment_status,
        'created_at': p.created_at.isoformat() if p.created_at else None
    })


@app.route('/api/payments/<int:id>', methods=['PUT'])
@jwt_required()
def api_update_payment(id):
    """
    Add payment to an existing booking payment record
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        example: 1
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - paid_amount
          properties:
            paid_amount:
              type: number
              example: 5000
            payment_method:
              type: string
              enum: [Cash, Card, bKash, Nagad]
              example: "bKash"
    responses:
      200:
        description: Payment updated
      401:
        description: Unauthorized
      404:
        description: Payment not found
    """
    p            = Payment.query.get_or_404(id)
    data         = request.get_json() or {}
    additional   = float(data.get('paid_amount', 0))
    p.paid_amount   += additional
    p.due_amount     = max(p.booking.total_amount - p.paid_amount, 0)
    p.payment_method = data.get('payment_method', p.payment_method)
    p.payment_status = 'Paid' if p.due_amount <= 0 else ('Partial' if p.paid_amount > 0 else 'Due')
    db.session.commit()
    return jsonify({
        'message': 'Payment updated',
        'paid_amount': p.paid_amount,
        'due_amount': p.due_amount,
        'payment_status': p.payment_status
    })


# =============================================================================
# ── API: REPORTS ──────────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/reports/summary')
@jwt_required()
def api_reports_summary():
    """
    Get financial summary report
    ---
    tags:
      - Reports
    security:
      - Bearer: []
    responses:
      200:
        description: Revenue and booking summary
      401:
        description: Unauthorized
    """
    td  = date.today()
    ms  = td.replace(day=1)

    total_rev   = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0)).scalar() or 0
    daily_rev   = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
                    .filter(func.date(Payment.created_at) == td).scalar() or 0
    monthly_rev = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
                    .filter(Payment.created_at >= ms).scalar() or 0

    return jsonify({
        'total_revenue':   float(total_rev),
        'daily_revenue':   float(daily_rev),
        'monthly_revenue': float(monthly_rev),
        'total_rooms':     Room.query.count(),
        'available_rooms': Room.query.filter_by(status='Available').count(),
        'occupied_rooms':  Room.query.filter_by(status='Occupied').count(),
        'total_customers': Customer.query.count(),
        'paid_bookings':   Payment.query.filter_by(payment_status='Paid').count(),
        'due_bookings':    Payment.query.filter_by(payment_status='Due').count()
    })


@app.route('/api/reports/daily')
@jwt_required()
def api_daily_report():
    """
    Get revenue for a specific date
    ---
    tags:
      - Reports
    security:
      - Bearer: []
    parameters:
      - name: date
        in: query
        type: string
        required: false
        description: Date in YYYY-MM-DD format (defaults to today)
        example: "2026-05-08"
    responses:
      200:
        description: Daily revenue report
      400:
        description: Invalid date format
      401:
        description: Unauthorized
    """
    date_str = request.args.get('date', date.today().isoformat())
    try:
        selected = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    revenue = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
                .filter(func.date(Payment.created_at) == selected).scalar() or 0

    bookings_count = Booking.query.filter(
        func.date(Booking.created_at) == selected
    ).count()

    return jsonify({
        'date': selected.isoformat(),
        'revenue': float(revenue),
        'bookings_count': bookings_count
    })


@app.route('/api/reports/monthly')
@jwt_required()
def api_monthly_report():
    """
    Get revenue for a specific month
    ---
    tags:
      - Reports
    security:
      - Bearer: []
    parameters:
      - name: month
        in: query
        type: string
        required: false
        description: Month in YYYY-MM format (defaults to current month)
        example: "2026-05"
    responses:
      200:
        description: Monthly revenue report
      400:
        description: Invalid month format
      401:
        description: Unauthorized
    """
    month_str = request.args.get('month', date.today().strftime('%Y-%m'))
    try:
        ms = datetime.strptime(month_str, '%Y-%m').date().replace(day=1)
    except ValueError:
        return jsonify({'error': 'Invalid month format. Use YYYY-MM'}), 400

    me = ms.replace(year=ms.year + 1, month=1) if ms.month == 12 \
         else ms.replace(month=ms.month + 1)

    revenue = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0))\
                .filter(Payment.created_at >= ms, Payment.created_at < me).scalar() or 0

    total_bookings = Booking.query.filter(
        Booking.created_at >= ms, Booking.created_at < me
    ).count()

    paid_count = Payment.query.filter(
        Payment.created_at >= ms, Payment.created_at < me,
        Payment.payment_status == 'Paid'
    ).count()

    due_count = Payment.query.filter(
        Payment.created_at >= ms, Payment.created_at < me,
        Payment.payment_status == 'Due'
    ).count()

    return jsonify({
        'month': month_str,
        'revenue': float(revenue),
        'total_bookings': total_bookings,
        'paid_count': paid_count,
        'due_count': due_count
    })


# =============================================================================
# ── Run ───────────────────────────────────────────────────────────────────────
# =============================================================================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_db()
    print("\n" + "="*55)
    print("  Smart Hotel Management System - Bangladesh")
    print("  Visit:   http://127.0.0.1:5000")
    print("  API:     http://127.0.0.1:5000/apidocs")
    print("  Login:   admin / admin123")
    print("="*55 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)