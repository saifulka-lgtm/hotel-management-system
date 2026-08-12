from extensions import db
from datetime import datetime

class Employee(db.Model):
    """Admin (login identity)-এর সাথে ১:১ — HR-type অতিরিক্ত তথ্য।"""
    __tablename__ = 'employees'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admins.id'), unique=True, nullable=False)

    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    department = db.Column(db.String(50))   # Hotel / Restaurant / Delivery / Admin
    designation = db.Column(db.String(50))  # Waiter, Kitchen Staff, Rider, Receptionist...
    join_date = db.Column(db.Date, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    admin = db.relationship('Admin', backref=db.backref('employee_profile', uselist=False))

    def to_dict(self):
        return {
            "id": self.id, "admin_id": self.admin_id,
            "full_name": self.full_name, "phone": self.phone,
            "department": self.department, "designation": self.designation,
            "join_date": self.join_date.isoformat() if self.join_date else None,
            "is_active": self.is_active,
            "role": self.admin.role.name if self.admin and self.admin.role else None
        }