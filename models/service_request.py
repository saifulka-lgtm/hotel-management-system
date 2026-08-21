from extensions import db
from datetime import datetime

class ServiceRequest(db.Model):
    __tablename__ = 'service_requests'
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)

    request_type = db.Column(db.String(30), nullable=False)
    # food / cleaning / amenities / other

    details = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')
    # pending -> in_progress -> completed

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    room = db.relationship('Room', backref='service_requests')
    booking = db.relationship('Booking', backref='service_requests')

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "room_id": self.room_id,
            "room_number": self.room.room_number if self.room else None,
            "guest_name": self.booking.customer.full_name if self.booking and self.booking.customer else None,
            "request_type": self.request_type,
            "details": self.details,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }