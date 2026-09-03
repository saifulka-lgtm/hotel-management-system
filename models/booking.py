from extensions import db
from datetime import datetime

class Booking(db.Model):
    __tablename__ = 'bookings'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    checkin_date = db.Column(db.Date, nullable=False)
    checkout_date = db.Column(db.Date, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    booking_status = db.Column(db.String(20), default='Pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    payment = db.relationship('Payment', backref='booking', uselist=False, lazy=True)
    checkin = db.relationship('CheckIn', backref='booking', uselist=False, lazy=True)
    checkout = db.relationship('CheckOut', backref='booking', uselist=False, lazy=True)