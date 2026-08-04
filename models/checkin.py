from extensions import db
from datetime import datetime

class CheckIn(db.Model):
    __tablename__ = 'checkins'
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    checkin_time = db.Column(db.DateTime, default=datetime.utcnow)