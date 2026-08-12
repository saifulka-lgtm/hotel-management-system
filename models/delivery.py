from extensions import db
from datetime import datetime


class DeliveryOrder(db.Model):
    __tablename__ = 'delivery_orders'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    delivery_staff_id = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)

    address = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(20), default='placed')
    # placed -> preparing -> assigned -> out_for_delivery -> delivered -> cancelled

    payment_status = db.Column(db.String(20), default='Due')
    payment_method = db.Column(db.String(20))
    paid_amount = db.Column(db.Float, default=0)
    total_amount = db.Column(db.Float, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('DeliveryOrderItem', backref='order', cascade="all, delete-orphan")
    customer = db.relationship('Customer', backref='delivery_orders')

    @property
    def due_amount(self):
        return max(self.total_amount - self.paid_amount, 0)

    def to_dict(self):
        return {
            "id": self.id, "customer_id": self.customer_id,
            "customer_name": self.customer.full_name if self.customer else None,
            "delivery_staff_id": self.delivery_staff_id,
            "address": self.address, "status": self.status,
            "payment_status": self.payment_status, "payment_method": self.payment_method,
            "paid_amount": self.paid_amount, "due_amount": self.due_amount,
            "total_amount": self.total_amount,
            "created_at": self.created_at.isoformat(),
            "items": [i.to_dict() for i in self.items]
        }


class DeliveryOrderItem(db.Model):
    __tablename__ = 'delivery_order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('delivery_orders.id'))
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


class DeliveryTracking(db.Model):
    __tablename__ = 'delivery_tracking'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('delivery_orders.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    note = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "status": self.status, "note": self.note,
                "timestamp": self.timestamp.isoformat()}