from extensions import db
from datetime import datetime

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)

    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(30), default='general')  # booking/order/delivery/system
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "message": self.message,
            "category": self.category, "is_read": self.is_read,
            "created_at": self.created_at.isoformat()
        }


def notify(title, message, category='general', admin_id=None, customer_id=None):
    """যেকোনো route থেকে সহজে নোটিফিকেশন বানানোর হেল্পার।"""
    n = Notification(title=title, message=message, category=category,
                      admin_id=admin_id, customer_id=customer_id)
    db.session.add(n)
    return n