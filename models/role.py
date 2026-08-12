from extensions import db

class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(30), unique=True, nullable=False)
    # e.g. admin, manager, reception, housekeeping, kitchen, waiter, delivery_staff

    permissions = db.relationship('Permission', backref='role', lazy=True)
    admins = db.relationship('Admin', backref='role', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "permissions": [p.module for p in self.permissions]
        }


def seed_roles():
    """প্রাথমিক role গুলো ইনসার্ট করে যদি না থাকে।"""
    defaults = ['admin', 'manager', 'reception', 'housekeeping',
                'kitchen', 'waiter', 'delivery_staff']
    for name in defaults:
        if not Role.query.filter_by(name=name).first():
            db.session.add(Role(name=name))
    db.session.commit()