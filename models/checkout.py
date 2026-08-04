from extensions import db
from datetime import datetime

class CheckOut(db.Model):
    __tablename__ = 'checkouts'
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    checkout_time = db.Column(db.DateTime, default=datetime.utcnow)