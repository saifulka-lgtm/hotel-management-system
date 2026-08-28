from extensions import db
from datetime import datetime

class TableReservation(db.Model):
    __tablename__ = 'table_reservations'
    id = db.Column(db.Integer, primary_key=True)
    table_id = db.Column(db.Integer, db.ForeignKey('restaurant_tables.id'), nullable=False)
    customer_name = db.Column(db.String(100), nullable=False)
    customer_phone = db.Column(db.String(20))

    reservation_date = db.Column(db.Date, nullable=False)
    reservation_time = db.Column(db.String(10), nullable=False)  # যেমন "19:30"
    party_size = db.Column(db.Integer, default=2)

    status = db.Column(db.String(20), default='confirmed')
    # confirmed -> seated -> completed -> cancelled

    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    table = db.relationship('RestaurantTable', backref='reservations')

    def to_dict(self):
        return {
            "id": self.id,
            "table_id": self.table_id,
            "table_number": self.table.table_number if self.table else None,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "reservation_date": self.reservation_date.isoformat(),
            "reservation_time": self.reservation_time,
            "party_size": self.party_size,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat()
        }