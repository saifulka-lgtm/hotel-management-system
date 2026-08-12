from extensions import db
from datetime import datetime


class RestaurantTable(db.Model):
    __tablename__ = 'restaurant_tables'
    id = db.Column(db.Integer, primary_key=True)
    table_number = db.Column(db.String(10), unique=True, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='available')  # available/reserved/occupied

    def to_dict(self):
        return {"id": self.id, "table_number": self.table_number,
                "capacity": self.capacity, "status": self.status}


class RestaurantOrder(db.Model):
    __tablename__ = 'restaurant_orders'
    id = db.Column(db.Integer, primary_key=True)
    table_id = db.Column(db.Integer, db.ForeignKey('restaurant_tables.id'))
    waiter_id = db.Column(db.Integer, db.ForeignKey('admins.id'))
    customer_name = db.Column(db.String(100))

    status = db.Column(db.String(20), default='placed')
    # placed -> preparing -> ready -> served -> billed

    payment_status = db.Column(db.String(20), default='Due')  # Due/Partial/Paid
    payment_method = db.Column(db.String(20))
    paid_amount = db.Column(db.Float, default=0)
    total_amount = db.Column(db.Float, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('RestaurantOrderItem', backref='order', cascade="all, delete-orphan")
    table = db.relationship('RestaurantTable', backref='orders')

    @property
    def due_amount(self):
        return max(self.total_amount - self.paid_amount, 0)

    def to_dict(self):
        return {
            "id": self.id, "table_id": self.table_id, "waiter_id": self.waiter_id,
            "customer_name": self.customer_name, "status": self.status,
            "payment_status": self.payment_status, "payment_method": self.payment_method,
            "paid_amount": self.paid_amount, "due_amount": self.due_amount,
            "total_amount": self.total_amount,
            "created_at": self.created_at.isoformat(),
            "items": [i.to_dict() for i in self.items]
        }


class RestaurantOrderItem(db.Model):
    __tablename__ = 'restaurant_order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('restaurant_orders.id'))
    menu_item_id = db.Column(db.Integer, db.ForeignKey('menu_items.id'))
    quantity = db.Column(db.Integer, default=1)
    price_at_order = db.Column(db.Float, nullable=False)

    menu_item = db.relationship('MenuItem')

    def to_dict(self):
        return {
            "id": self.id, "menu_item_id": self.menu_item_id,
            "name": self.menu_item.name if self.menu_item else None,
            "quantity": self.quantity, "price_at_order": self.price_at_order,
            "subtotal": self.quantity * self.price_at_order
        }


class WaiterAssignment(db.Model):
    __tablename__ = 'waiter_assignments'
    id = db.Column(db.Integer, primary_key=True)
    waiter_id = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=False)
    table_id = db.Column(db.Integer, db.ForeignKey('restaurant_tables.id'), nullable=False)
    shift_date = db.Column(db.Date, nullable=False)

    def to_dict(self):
        return {"id": self.id, "waiter_id": self.waiter_id,
                "table_id": self.table_id, "shift_date": str(self.shift_date)}