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
from models.service_request import ServiceRequest
from config import Config
from extensions import db, login_manager, migrate, jwt

# ── App Factory ───────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)
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
        {'name': 'Auth',       'description': 'Login, logout, token management'},
        {'name': 'Rooms',      'description': 'Room availability and management'},
        {'name': 'Bookings',   'description': 'Booking operations'},
        {'name': 'Customers',  'description': 'Customer management'},
        {'name': 'Payments',   'description': 'Payment operations'},
        {'name': 'Reports',    'description': 'Revenue and financial reports'},
        {'name': 'Menu',       'description': 'Restaurant menu management'},
        {'name': 'Restaurant', 'description': 'Restaurant table and order management'},
        {'name': 'Delivery',   'description': 'Delivery order management'},
        {'name': 'Notifications', 'description': 'In-app notifications'},
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
from models.role import Role, seed_roles
from models.permission import Permission, seed_permissions
from models.employee import Employee
from models.menu import MenuItem
from models.restaurant import RestaurantTable, RestaurantOrder, RestaurantOrderItem, WaiterAssignment
from models.delivery import DeliveryOrder, DeliveryOrderItem, DeliveryTracking
from models.supplier import Supplier
from models.inventory import InventoryItem, StockMovement
from models.notification import Notification, notify
from models.housekeeping import HousekeepingTask
from models.table_reservation import TableReservation

# ── Utils (RBAC) ──────────────────────────────────────────────────────────────
from utils.auth_decorators import module_required

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

    seed_roles()
    seed_permissions()

    admin = Admin.query.filter_by(username='admin').first()
    if admin and not admin.role_id:
        admin_role = Role.query.filter_by(name='admin').first()
        if admin_role:
            admin.role_id = admin_role.id
            db.session.commit()
            print(f"✅  Admin assigned role: {admin_role.name}")

    if admin and not admin.employee_profile:
        db.session.add(Employee(
            admin_id=admin.id,
            full_name='System Administrator',
            department='Admin',
            designation='Admin'
        ))
        db.session.commit()
        print("✅  Employee profile created for admin")

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

    if not MenuItem.query.first():
        menu_items = [
            MenuItem(name='Chicken Biryani', category='Main',   price=280, description='Classic Dhaka-style biryani'),
            MenuItem(name='Beef Tehari',      category='Main',   price=250, description='Spicy beef tehari'),
            MenuItem(name='Vegetable Curry',  category='Main',   price=150, description='Mixed vegetable curry'),
            MenuItem(name='Mutton Rezala',    category='Main',   price=350, description='Rich mutton rezala'),
            MenuItem(name='Borhani',          category='Drink',  price=50,  description='Traditional yogurt drink'),
            MenuItem(name='Firni',            category='Dessert', price=80, description='Rice pudding dessert'),
        ]
        db.session.add_all(menu_items)
        db.session.commit()
        print("✅  6 menu items inserted")

    if not RestaurantTable.query.first():
        tables = [
            RestaurantTable(table_number='T1', capacity=2),
            RestaurantTable(table_number='T2', capacity=4),
            RestaurantTable(table_number='T3', capacity=4),
            RestaurantTable(table_number='T4', capacity=6),
        ]
        db.session.add_all(tables)
        db.session.commit()
        print("✅  4 restaurant tables inserted")

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

# ── Employees API ────────────────────────────────────────────────────────────
@app.route('/api/employees', methods=['GET'])
@jwt_required()
def api_employees():
    employees = Employee.query.all()
    return jsonify([e.to_dict() for e in employees])


@app.route('/api/employees', methods=['POST'])
@jwt_required()
@module_required('staff_management')
def api_create_employee():
    data = request.get_json() or {}
    required = ['admin_id', 'full_name']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400

    admin = Admin.query.get(data['admin_id'])
    if not admin:
        return jsonify({'error': 'Admin not found'}), 404
    if admin.employee_profile:
        return jsonify({'error': 'This admin already has an employee profile'}), 400

    emp = Employee(
        admin_id=admin.id,
        full_name=data['full_name'],
        phone=data.get('phone'),
        department=data.get('department'),
        designation=data.get('designation')
    )
    db.session.add(emp)
    db.session.commit()
    return jsonify(emp.to_dict()), 201

@app.route('/api/roles', methods=['GET'])
@jwt_required()
def api_list_roles():
    roles = Role.query.all()
    return jsonify([r.to_dict() for r in roles])

# ── Menu API ─────────────────────────────────────────────────────────────────
@app.route('/api/menu', methods=['GET'])
def api_menu():
    items = MenuItem.query.filter_by(is_available=True).all()
    return jsonify([i.to_dict() for i in items])


@app.route('/api/menu', methods=['POST'])
@jwt_required()
@module_required('restaurant')
def api_create_menu_item():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('price'):
        return jsonify({'error': 'name and price are required'}), 400
    item = MenuItem(
        name=data['name'].strip(),
        category=data.get('category'),
        price=float(data['price']),
        description=data.get('description', ''),
        image_url=data.get('image_url', '')
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/debug-db-check')
def debug_db_check():
    import os
    db_url = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    return jsonify({
        'DATABASE_URL_env_var_present': 'DATABASE_URL' in os.environ,
        'db_uri_has_at_symbol': '@' in db_url,
        'db_host_part': db_url.split('@')[-1] if '@' in db_url else 'NO @ FOUND',
        'db_uri_starts_with': db_url[:15] if db_url else 'EMPTY'
    })
@app.route('/api/menu/<int:id>', methods=['PUT'])
@jwt_required()
@module_required('restaurant')
def api_update_menu_item(id):
    item = MenuItem.query.get_or_404(id)
    data = request.get_json() or {}
    item.name = data.get('name', item.name)
    item.category = data.get('category', item.category)
    item.price = float(data.get('price', item.price))
    item.is_available = data.get('is_available', item.is_available)
    item.description = data.get('description', item.description)
    db.session.commit()
    return jsonify(item.to_dict())


@app.route('/api/menu/all', methods=['GET'])
@jwt_required()
def api_menu_all():
    """Admin panel-এর জন্য — is_available=False আইটেমও দেখাবে"""
    items = MenuItem.query.all()
    return jsonify([i.to_dict() for i in items])


@app.route('/api/debug-fix-db')
def debug_fix_db():
    from sqlalchemy import text
    try:
        db.session.execute(text(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_percent FLOAT DEFAULT 0"
        ))
        db.session.commit()
        return jsonify({"status": "success", "message": "discount_percent column ensured"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)})

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

    rooms = Room.query.filter(Room.status != 'Maintenance').order_by(Room.room_number).all()
    return render_template('book_room.html', today=date.today().isoformat(), rooms=rooms)

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
    identity     = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({'access_token': access_token}), 200


@app.route('/api/auth/logout', methods=['DELETE'])
@jwt_required()
def api_logout():
    jti = get_jwt()['jti']
    token_blocklist.add(jti)
    return jsonify({'message': 'Successfully logged out. Token revoked.'}), 200


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def api_me():
    admin_id = get_jwt_identity()
    admin    = Admin.query.get(int(admin_id))
    if not admin:
        return jsonify({'error': 'Admin not found'}), 404
    return jsonify(admin.to_dict()), 200


@app.route('/api/auth/change-password', methods=['PUT'])
@jwt_required()
def api_change_password():
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
@module_required('staff_management')
def api_register_admin():
    data     = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    role_name = data.get('role', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if Admin.query.filter_by(username=username).first():
        return jsonify({'error': f"Username '{username}' already exists"}), 400

    new_admin = Admin(username=username, password=generate_password_hash(password))

    if role_name:
        role = Role.query.filter_by(name=role_name).first()
        if role:
            new_admin.role_id = role.id

    db.session.add(new_admin)
    db.session.commit()
    return jsonify({'message': f"Admin {username} created", 'id': new_admin.id}), 201


# =============================================================================
# ── API: ROOMS ────────────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/rooms')
def api_rooms():
    rooms = Room.query.filter_by(status='Available').all()
    return jsonify([{
        'id': r.id, 'room_number': r.room_number,
        'room_type': r.room_type, 'ac_type': r.ac_type,
        'price': r.price
    } for r in rooms])


@app.route('/api/rooms', methods=['POST'])
@jwt_required()
@module_required('hotel')
def api_create_room():
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
    r = Room.query.get_or_404(id)
    return jsonify({
        'id': r.id, 'room_number': r.room_number,
        'room_type': r.room_type, 'ac_type': r.ac_type,
        'price': r.price, 'status': r.status
    })


@app.route('/api/rooms/<int:id>', methods=['PUT'])
@jwt_required()
@module_required('hotel')
def api_update_room(id):
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
@module_required('hotel')
def api_delete_room(id):
    r = Room.query.get_or_404(id)
    if r.bookings:
        return jsonify({'error': 'Cannot delete room with existing bookings'}), 400
    db.session.delete(r)
    db.session.commit()
    return jsonify({'message': f"Room {r.room_number} deleted"})


@app.route('/api/available-rooms')
def api_available_rooms():
    checkin_str = request.args.get('checkin')
    checkout_str = request.args.get('checkout')

    try:
        ci = datetime.strptime(checkin_str, '%Y-%m-%d').date()
        co = datetime.strptime(checkout_str, '%Y-%m-%d').date()
    except Exception:
        return jsonify({"error": "Invalid dates"}), 400

    rooms = Room.query.filter(Room.status != "Maintenance").all()
    available = [r for r in rooms if is_room_available(r.id, ci, co)]

    return jsonify([{
        "id": r.id, "room_number": r.room_number,
        "room_type": r.room_type, "ac_type": r.ac_type,
        "price": float(r.price)
    } for r in available])


# =============================================================================
# ── API: CUSTOMERS ────────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/customers')
@jwt_required()
def api_customers():
    customers = Customer.query.all()
    return jsonify([{
        'id': c.id, 'full_name': c.full_name,
        'phone': c.phone, 'email': c.email,
        'total_bookings': len(c.bookings)
    } for c in customers])


@app.route('/api/customers', methods=['POST'])
@jwt_required()
@module_required('hotel')
def api_create_customer():
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
@module_required('hotel')
def api_update_customer(id):
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
@module_required('hotel')
def api_delete_customer(id):
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
@module_required('hotel')
def api_create_booking():
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

    nights = (co - ci).days
    subtotal = room.price * nights
    discount_percent = float(data.get('discount_percent', 0))
    discount_percent = max(0, min(discount_percent, 100))  # 0-100% এর মধ্যে সীমাবদ্ধ
    total = subtotal * (1 - discount_percent / 100)

    booking = Booking(customer_id=customer.id, room_id=room.id,
                      checkin_date=ci, checkout_date=co,
                      total_amount=total, discount_percent=discount_percent)
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
@module_required('hotel')
def api_cancel_booking(id):
    b = Booking.query.get_or_404(id)
    if b.booking_status in ['Completed', 'Cancelled']:
        return jsonify({'error': f'Cannot cancel a {b.booking_status} booking'}), 400
    b.booking_status = 'Cancelled'
    b.room.status    = 'Available'
    db.session.commit()
    return jsonify({'message': f"Booking #{id} cancelled"})


@app.route('/api/bookings/<int:id>/checkin', methods=['PUT'])
@jwt_required()
@module_required('hotel')
def api_checkin(id):
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
@module_required('hotel')
def api_checkout(id):
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
    payments = Payment.query.order_by(Payment.created_at.desc()).all()
    return jsonify([{
        'id': p.id, 'booking_id': p.booking_id,
        'paid_amount': p.paid_amount, 'due_amount': p.due_amount,
        'payment_method': p.payment_method, 'payment_status': p.payment_status
    } for p in payments])


@app.route('/api/payments/<int:id>', methods=['GET'])
@jwt_required()
def api_get_payment(id):
    p = Payment.query.get_or_404(id)
    return jsonify({
        'id': p.id, 'booking_id': p.booking_id,
        'paid_amount': p.paid_amount, 'due_amount': p.due_amount,
        'payment_method': p.payment_method, 'payment_status': p.payment_status,
        'created_at': p.created_at.isoformat() if p.created_at else None
    })


@app.route('/api/payments/<int:id>', methods=['PUT'])
@jwt_required()
@module_required('hotel')
def api_update_payment(id):
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


@app.route('/api/reports/business-summary', methods=['GET'])
@jwt_required()
def api_business_summary():
    hotel_revenue = db.session.query(func.coalesce(func.sum(Payment.paid_amount), 0)).scalar() or 0

    restaurant_revenue = db.session.query(
        func.coalesce(func.sum(RestaurantOrder.total_amount), 0)
    ).filter(RestaurantOrder.status == 'billed').scalar() or 0

    delivery_revenue = db.session.query(
        func.coalesce(func.sum(DeliveryOrder.total_amount), 0)
    ).filter(DeliveryOrder.status == 'delivered').scalar() or 0

    return jsonify({
        'hotel_revenue': float(hotel_revenue),
        'restaurant_revenue': float(restaurant_revenue),
        'delivery_revenue': float(delivery_revenue),
        'total_revenue': float(hotel_revenue) + float(restaurant_revenue) + float(delivery_revenue),
        'restaurant_orders_count': RestaurantOrder.query.count(),
        'delivery_orders_count': DeliveryOrder.query.count(),
        'pending_restaurant_orders': RestaurantOrder.query.filter(
            RestaurantOrder.status != 'billed'
        ).count(),
        'pending_delivery_orders': DeliveryOrder.query.filter(
            DeliveryOrder.status.notin_(['delivered', 'cancelled'])
        ).count(),
    })


# =============================================================================
# ── API: RESTAURANT ───────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/restaurant/tables', methods=['GET'])
def api_restaurant_tables():
    tables = RestaurantTable.query.all()
    return jsonify([t.to_dict() for t in tables])


@app.route('/api/restaurant/orders', methods=['POST'])
@jwt_required()
@module_required('restaurant')
def api_create_restaurant_order():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    table_id = data.get('table_id')
    items = data.get('items', [])
    customer_name = data.get('customer_name', '')

    if not items:
        return jsonify({'error': 'At least one item is required'}), 400

    table = None
    if table_id:
        table = RestaurantTable.query.get(table_id)
        if not table:
            return jsonify({'error': 'Table not found'}), 404

    order = RestaurantOrder(table_id=table_id, customer_name=customer_name)
    db.session.add(order)
    db.session.flush()

    total = 0
    for it in items:
        menu_item = MenuItem.query.get(it.get('menu_item_id'))
        if not menu_item:
            continue
        qty = int(it.get('quantity', 1))
        db.session.add(RestaurantOrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            quantity=qty,
            price_at_order=menu_item.price
        ))
        total += menu_item.price * qty

    order.total_amount = total

    if table:
        table.status = 'occupied'

    db.session.commit()
    return jsonify(order.to_dict()), 201


@app.route('/api/restaurant/orders', methods=['GET'])
@jwt_required()
@module_required('restaurant')
def api_list_restaurant_orders():
    orders = RestaurantOrder.query.order_by(RestaurantOrder.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@app.route('/api/restaurant/orders/<int:id>', methods=['GET'])
@jwt_required()
@module_required('restaurant')
def api_get_restaurant_order(id):
    order = RestaurantOrder.query.get_or_404(id)
    return jsonify(order.to_dict())


@app.route('/api/restaurant/orders/<int:id>/status', methods=['PUT'])
@jwt_required()
@module_required('restaurant_kitchen')
def api_update_restaurant_order_status(id):
    order = RestaurantOrder.query.get_or_404(id)
    data = request.get_json() or {}
    new_status = data.get('status')

    valid_statuses = ['placed', 'preparing', 'ready', 'served', 'billed']
    if new_status not in valid_statuses:
        return jsonify({'error': f'status must be one of {valid_statuses}'}), 400

    order.status = new_status

    if new_status == 'billed' and order.table:
        order.table.status = 'available'

    new_notification = Notification(
        title=f'Restaurant Order #{order.id} Update',
        message=f'Order status changed to "{new_status}"',
        category='order'
    )
    db.session.add(new_notification)

    db.session.commit()
    return jsonify(order.to_dict())

# =============================================================================
# ── API: TABLE RESERVATIONS ───────────────────────────────────────────────────
# =============================================================================

@app.route('/api/restaurant/reservations', methods=['GET'])
@jwt_required()
def api_list_reservations():
    reservations = TableReservation.query.filter(
        TableReservation.status != 'cancelled'
    ).order_by(TableReservation.reservation_date, TableReservation.reservation_time).all()
    return jsonify([r.to_dict() for r in reservations])


@app.route('/api/restaurant/reservations', methods=['POST'])
@jwt_required()
@module_required('restaurant')
def api_create_reservation():
    data = request.get_json()
    if not data or not data.get('table_id') or not data.get('customer_name') \
       or not data.get('reservation_date') or not data.get('reservation_time'):
        return jsonify({'error': 'table_id, customer_name, reservation_date, reservation_time প্রয়োজন'}), 400

    table = RestaurantTable.query.get(data['table_id'])
    if not table:
        return jsonify({'error': 'Table not found'}), 404

    try:
        res_date = datetime.strptime(data['reservation_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    # একই টেবিল, একই তারিখ ও সময়ে আগে থেকে reservation আছে কিনা চেক
    existing = TableReservation.query.filter_by(
        table_id=table.id,
        reservation_date=res_date,
        reservation_time=data['reservation_time']
    ).filter(TableReservation.status != 'cancelled').first()

    if existing:
        return jsonify({'error': 'এই টেবিল ওই তারিখ ও সময়ে ইতিমধ্যে reserved'}), 400

    reservation = TableReservation(
        table_id=table.id,
        customer_name=data['customer_name'],
        customer_phone=data.get('customer_phone', ''),
        reservation_date=res_date,
        reservation_time=data['reservation_time'],
        party_size=data.get('party_size', 2),
        notes=data.get('notes', '')
    )
    db.session.add(reservation)

    db.session.add(Notification(
        title='New Table Reservation',
        message=f'{data["customer_name"]} reserved {table.table_number} on {res_date} at {data["reservation_time"]}',
        category='reservation'
    ))

    db.session.commit()
    return jsonify(reservation.to_dict()), 201


@app.route('/api/restaurant/reservations/<int:id>/status', methods=['PUT'])
@jwt_required()
@module_required('restaurant')
def api_update_reservation_status(id):
    reservation = TableReservation.query.get_or_404(id)
    data = request.get_json() or {}
    new_status = data.get('status')

    valid_statuses = ['confirmed', 'seated', 'completed', 'cancelled']
    if new_status not in valid_statuses:
        return jsonify({'error': f'status must be one of {valid_statuses}'}), 400

    reservation.status = new_status
    db.session.commit()
    return jsonify(reservation.to_dict())

# =============================================================================
# ── API: WAITER ASSIGNMENT ────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/restaurant/waiter-assignments', methods=['GET'])
@jwt_required()
def api_list_waiter_assignments():
    assignments = WaiterAssignment.query.order_by(WaiterAssignment.shift_date.desc()).all()
    result = []
    for a in assignments:
        d = a.to_dict()
        waiter = Admin.query.get(a.waiter_id)
        table = RestaurantTable.query.get(a.table_id)
        d['waiter_name'] = waiter.username if waiter else None
        d['table_number'] = table.table_number if table else None
        result.append(d)
    return jsonify(result)


@app.route('/api/restaurant/waiter-assignments', methods=['POST'])
@jwt_required()
@module_required('restaurant')
def api_create_waiter_assignment():
    data = request.get_json()
    if not data or not data.get('waiter_id') or not data.get('table_id') or not data.get('shift_date'):
        return jsonify({'error': 'waiter_id, table_id, and shift_date are required'}), 400

    try:
        shift_date = datetime.strptime(data['shift_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    assignment = WaiterAssignment(
        waiter_id=data['waiter_id'],
        table_id=data['table_id'],
        shift_date=shift_date
    )
    db.session.add(assignment)
    db.session.commit()
    return jsonify(assignment.to_dict()), 201


@app.route('/api/restaurant/waiter-assignments/<int:id>', methods=['DELETE'])
@jwt_required()
@module_required('restaurant')
def api_delete_waiter_assignment(id):
    assignment = WaiterAssignment.query.get_or_404(id)
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment removed'})


# =============================================================================
# ── API: DELIVERY ─────────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/delivery/orders', methods=['POST'])
@jwt_required()
@module_required('delivery')
def api_create_delivery_order():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    customer_id = data.get('customer_id')
    address = data.get('address')
    items = data.get('items', [])

    if not customer_id or not address:
        return jsonify({'error': 'customer_id and address are required'}), 400
    if not items:
        return jsonify({'error': 'At least one item is required'}), 400

    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404

    order = DeliveryOrder(customer_id=customer_id, address=address)
    db.session.add(order)
    db.session.flush()

    total = 0
    for it in items:
        menu_item = MenuItem.query.get(it.get('menu_item_id'))
        if not menu_item:
            continue
        qty = int(it.get('quantity', 1))
        db.session.add(DeliveryOrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            quantity=qty,
            price_at_order=menu_item.price
        ))
        total += menu_item.price * qty

    order.total_amount = total
    db.session.add(DeliveryTracking(order_id=order.id, status='placed', note='Order placed'))
    db.session.commit()
    return jsonify(order.to_dict()), 201


@app.route('/api/delivery/orders', methods=['GET'])
@jwt_required()
@module_required('delivery')
def api_list_delivery_orders():
    orders = DeliveryOrder.query.order_by(DeliveryOrder.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@app.route('/api/delivery/orders/<int:id>', methods=['GET'])
@jwt_required()
@module_required('delivery')
def api_get_delivery_order(id):
    order = DeliveryOrder.query.get_or_404(id)
    return jsonify(order.to_dict())


@app.route('/api/delivery/orders/<int:id>/status', methods=['PUT'])
@jwt_required()
@module_required('delivery')
def api_update_delivery_order_status(id):
    order = DeliveryOrder.query.get_or_404(id)
    data = request.get_json() or {}
    new_status = data.get('status')

    valid_statuses = ['placed', 'preparing', 'assigned', 'out_for_delivery', 'delivered', 'cancelled']
    if new_status not in valid_statuses:
        return jsonify({'error': f'status must be one of {valid_statuses}'}), 400

    order.status = new_status
    if data.get('delivery_staff_id'):
        order.delivery_staff_id = data['delivery_staff_id']

    db.session.add(DeliveryTracking(order_id=order.id, status=new_status,
                                     note=data.get('note', '')))

    new_notification = Notification(
        title=f'Delivery Order #{order.id} Update',
        message=f'Order status changed to "{new_status}"',
        category='delivery'
    )
    db.session.add(new_notification)

    db.session.commit()
    return jsonify(order.to_dict())

# =============================================================================
# ── API: CUSTOMER AUTH (self-service) ─────────────────────────────────────────
# =============================================================================

@app.route('/api/customer/register', methods=['POST'])
def api_customer_register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['full_name', 'phone', 'password']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400

    existing = Customer.query.filter_by(phone=data['phone'].strip()).first()
    if existing and existing.has_account:
        return jsonify({'error': 'An account already exists with this phone number'}), 400

    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if existing:
        # আগে থেকে হোটেল guest হিসেবে রেকর্ড আছে (booking করেছিল কিন্তু account ছিল না) — একই রেকর্ডে account যোগ করি
        customer = existing
        customer.full_name = data['full_name'].strip()
        customer.email = data.get('email', customer.email)
    else:
        customer = Customer(
            full_name=data['full_name'].strip(),
            phone=data['phone'].strip(),
            email=data.get('email', '').strip(),
            address=data.get('address', '').strip()
        )
        db.session.add(customer)

    customer.set_password(data['password'])
    db.session.commit()

    access_token = create_access_token(identity=f"customer:{customer.id}")
    return jsonify({
        'message': 'Account created successfully',
        'access_token': access_token,
        'customer': {'id': customer.id, 'full_name': customer.full_name, 'phone': customer.phone}
    }), 201


@app.route('/api/customer/login', methods=['POST'])
def api_customer_login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    phone = data.get('phone', '').strip()
    password = data.get('password', '')

    if not phone or not password:
        return jsonify({'error': 'Phone and password are required'}), 400

    customer = Customer.query.filter_by(phone=phone).first()
    if not customer or not customer.check_password(password):
        return jsonify({'error': 'Invalid phone or password'}), 401

    access_token = create_access_token(identity=f"customer:{customer.id}")
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'customer': {'id': customer.id, 'full_name': customer.full_name, 'phone': customer.phone}
    }), 200


def get_current_customer():
    """JWT identity থেকে customer বের করে (identity format: 'customer:<id>')"""
    identity = get_jwt_identity()
    if not identity or not identity.startswith('customer:'):
        return None
    customer_id = int(identity.split(':')[1])
    return Customer.query.get(customer_id)


@app.route('/api/customer/me', methods=['GET'])
@jwt_required()
def api_customer_me():
    customer = get_current_customer()
    if not customer:
        return jsonify({'error': 'Not a customer account'}), 403
    return jsonify({
        'id': customer.id, 'full_name': customer.full_name,
        'phone': customer.phone, 'email': customer.email
    })


@app.route('/api/customer/my-orders', methods=['GET'])
@jwt_required()
def api_customer_my_orders():
    """নিজের delivery order history — customer শুধু নিজের অর্ডারই দেখতে পাবে"""
    customer = get_current_customer()
    if not customer:
        return jsonify({'error': 'Not a customer account'}), 403

    orders = DeliveryOrder.query.filter_by(customer_id=customer.id)\
        .order_by(DeliveryOrder.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@app.route('/api/customer/orders', methods=['POST'])
@jwt_required()
def api_customer_place_order():
    """Customer নিজে delivery order প্লেস করে — admin-এর দরকার নেই"""
    customer = get_current_customer()
    if not customer:
        return jsonify({'error': 'Not a customer account'}), 403

    data = request.get_json()
    address = data.get('address')
    items = data.get('items', [])

    if not address:
        return jsonify({'error': 'address is required'}), 400
    if not items:
        return jsonify({'error': 'At least one item is required'}), 400

    order = DeliveryOrder(customer_id=customer.id, address=address)
    db.session.add(order)
    db.session.flush()

    total = 0
    for it in items:
        menu_item = MenuItem.query.get(it.get('menu_item_id'))
        if not menu_item:
            continue
        qty = int(it.get('quantity', 1))
        db.session.add(DeliveryOrderItem(
            order_id=order.id, menu_item_id=menu_item.id,
            quantity=qty, price_at_order=menu_item.price
        ))
        total += menu_item.price * qty

    order.total_amount = total
    db.session.add(DeliveryTracking(order_id=order.id, status='placed', note='Order placed by customer'))
    db.session.commit()
    return jsonify(order.to_dict()), 201

# =============================================================================
# ── API: HOUSEKEEPING ─────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/housekeeping/tasks', methods=['GET'])
@jwt_required()
def api_list_housekeeping_tasks():
    tasks = HousekeepingTask.query.order_by(HousekeepingTask.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tasks])


@app.route('/api/housekeeping/tasks', methods=['POST'])
@jwt_required()
@module_required('hotel_housekeeping')
def api_create_housekeeping_task():
    data = request.get_json()
    if not data or not data.get('room_id'):
        return jsonify({'error': 'room_id is required'}), 400

    room = Room.query.get(data['room_id'])
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    task = HousekeepingTask(
        room_id=room.id,
        assigned_to=data.get('assigned_to'),
        task_type=data.get('task_type', 'cleaning'),
        notes=data.get('notes', '')
    )
    db.session.add(task)

    db.session.add(Notification(
        title='New Housekeeping Task',
        message=f'Room {room.room_number} needs {task.task_type}',
        category='housekeeping'
    ))

    db.session.commit()
    return jsonify(task.to_dict()), 201


@app.route('/api/housekeeping/tasks/<int:id>/status', methods=['PUT'])
@jwt_required()
@module_required('hotel_housekeeping')
def api_update_housekeeping_status(id):
    task = HousekeepingTask.query.get_or_404(id)
    data = request.get_json() or {}
    new_status = data.get('status')

    valid_statuses = ['pending', 'in_progress', 'completed']
    if new_status not in valid_statuses:
        return jsonify({'error': f'status must be one of {valid_statuses}'}), 400

    task.status = new_status
    if new_status == 'completed':
        task.completed_at = datetime.utcnow()

    db.session.commit()
    return jsonify(task.to_dict())

# =============================================================================
# ── API: IN-ROOM SERVICE REQUESTS ─────────────────────────────────────────────
# =============================================================================

@app.route('/api/service-requests', methods=['GET'])
@jwt_required()
def api_list_service_requests():
    requests_list = ServiceRequest.query.order_by(ServiceRequest.created_at.desc()).all()
    return jsonify([r.to_dict() for r in requests_list])


@app.route('/api/service-requests', methods=['POST'])
@jwt_required()
def api_create_service_request():
    data = request.get_json()
    if not data or not data.get('booking_id') or not data.get('request_type'):
        return jsonify({'error': 'booking_id and request_type are required'}), 400

    booking = Booking.query.get(data['booking_id'])
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404

    req = ServiceRequest(
        booking_id=booking.id,
        room_id=booking.room_id,
        request_type=data['request_type'],
        details=data.get('details', '')
    )
    db.session.add(req)

    db.session.add(Notification(
        title='New Service Request',
        message=f'Room {booking.room.room_number} requested {data["request_type"]}',
        category='service_request'
    ))

    db.session.commit()
    return jsonify(req.to_dict()), 201


@app.route('/api/service-requests/<int:id>/status', methods=['PUT'])
@jwt_required()
@module_required('hotel')
def api_update_service_request_status(id):
    req = ServiceRequest.query.get_or_404(id)
    data = request.get_json() or {}
    new_status = data.get('status')

    valid_statuses = ['pending', 'in_progress', 'completed']
    if new_status not in valid_statuses:
        return jsonify({'error': f'status must be one of {valid_statuses}'}), 400

    req.status = new_status
    if new_status == 'completed':
        req.completed_at = datetime.utcnow()

    db.session.commit()
    return jsonify(req.to_dict())

# =============================================================================
# ── API: INVENTORY ────────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/inventory', methods=['GET'])
@jwt_required()
def api_list_inventory():
    items = InventoryItem.query.all()
    return jsonify([i.to_dict() for i in items])


@app.route('/api/inventory', methods=['POST'])
@jwt_required()
@module_required('inventory')
def api_create_inventory_item():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('unit'):
        return jsonify({'error': 'name and unit are required'}), 400

    item = InventoryItem(
        name=data['name'],
        unit=data['unit'],
        quantity=float(data.get('quantity', 0)),
        reorder_level=float(data.get('reorder_level', 0)),
        used_by=data.get('used_by', 'shared')
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@app.route('/api/inventory/<int:id>/adjust', methods=['PUT'])
@jwt_required()
@module_required('inventory')
def api_adjust_inventory(id):
    """স্টক in/out — change positive হলে stock বাড়বে, negative হলে কমবে"""
    item = InventoryItem.query.get_or_404(id)
    data = request.get_json() or {}
    change = float(data.get('change', 0))
    reason = data.get('reason', 'adjustment')

    item.quantity += change
    db.session.add(StockMovement(item_id=item.id, change=change, reason=reason))
    db.session.commit()
    return jsonify(item.to_dict())
# =============================================================================
# ── API: NOTIFICATIONS ────────────────────────────────────────────────────────
# =============================================================================

@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def api_notifications():
    notifications = Notification.query.order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify([n.to_dict() for n in notifications])


@app.route('/api/notifications/<int:id>/read', methods=['PUT'])
@jwt_required()
def api_mark_notification_read(id):
    n = Notification.query.get_or_404(id)
    n.is_read = True
    db.session.commit()
    return jsonify(n.to_dict())


@app.route('/api/notifications/unread-count', methods=['GET'])
@jwt_required()
def api_unread_count():
    count = Notification.query.filter_by(is_read=False).count()
    return jsonify({'count': count})


# =============================================================================
# ── Run ───────────────────────────────────────────────────────────────────────
# =============================================================================

# gunicorn/production-এ এই মডিউল import হওয়ার সাথে সাথেই db.create_all()
# ও seed_db() চলে — __main__ ব্লকের ভেতরে থাকলে gunicorn এটা কখনো চালাবে না।
with app.app_context():
    db.create_all()
    seed_db()

if __name__ == '__main__':
    print("\n" + "="*55)
    print("  Smart Hotel Management System - Bangladesh")
    print("  Visit:   http://127.0.0.1:5000")
    print("  API:     http://127.0.0.1:5000/apidocs")
    print("  Login:   admin / admin123")
    print("="*55 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)