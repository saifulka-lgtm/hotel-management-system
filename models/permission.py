from extensions import db

class Permission(db.Model):
    __tablename__ = 'permissions'
    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    module = db.Column(db.String(40), nullable=False)
    # e.g. 'hotel', 'restaurant', 'restaurant_kitchen', 'delivery',
    #      'inventory', 'reports', 'staff_management'

    def to_dict(self):
        return {"id": self.id, "role_id": self.role_id, "module": self.module}


ROLE_MODULE_MAP = {
    'admin':          ['hotel', 'hotel_housekeeping', 'restaurant', 'restaurant_kitchen', 'delivery',
                        'inventory', 'reports', 'staff_management'],
    'manager':        ['hotel', 'hotel_housekeeping', 'restaurant', 'delivery', 'inventory', 'reports'],
    'reception':      ['hotel'],
    'housekeeping':   ['hotel_housekeeping'],
    'kitchen':        ['restaurant_kitchen'],
    'waiter':         ['restaurant'],
    'delivery_staff': ['delivery'],
}

def seed_permissions():
    """seed_roles() চালানোর পরে এটা চালাবেন।"""
    from models.role import Role
    for role_name, modules in ROLE_MODULE_MAP.items():
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            continue
        existing = {p.module for p in role.permissions}
        for m in modules:
            if m not in existing:
                db.session.add(Permission(role_id=role.id, module=m))
    db.session.commit()