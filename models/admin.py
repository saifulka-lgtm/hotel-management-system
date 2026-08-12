from extensions import db
from flask_login import UserMixin
from datetime import datetime

class Admin(UserMixin, db.Model):
    __tablename__ = 'admins'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=True)
    # nullable=True রাখলাম যাতে existing seeded admin (role ছাড়া) ভেঙে না যায়

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def has_permission(self, module):
        if not self.role:
            return False
        return module in {p.module for p in self.role.permissions}

    def to_dict(self):
        return {
            "id": self.id, "username": self.username,
            "role": self.role.name if self.role else None
        }