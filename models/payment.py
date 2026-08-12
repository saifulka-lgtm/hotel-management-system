from extensions import db
from datetime import datetime

class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    payment_method = db.Column(db.String(20), nullable=True)
    paid_amount = db.Column(db.Float, default=0)
    due_amount = db.Column(db.Float, default=0)
    payment_status = db.Column(db.String(20), default='Due')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)