from extensions import db
from datetime import datetime

class InventoryItem(db.Model):
    __tablename__ = 'inventory_items'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    unit = db.Column(db.String(20), nullable=False)   # kg, liter, piece
    quantity = db.Column(db.Float, default=0)
    reorder_level = db.Column(db.Float, default=0)

    used_by = db.Column(db.String(30), default='shared')  # hotel/kitchen/restaurant/shared
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True)

    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier = db.relationship('Supplier', backref='inventory_items')
    movements = db.relationship('StockMovement', backref='item', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "unit": self.unit,
            "quantity": self.quantity, "reorder_level": self.reorder_level,
            "used_by": self.used_by,
            "supplier": self.supplier.name if self.supplier else None,
            "low_stock": self.quantity <= self.reorder_level
        }


class StockMovement(db.Model):
    """স্টক in/out ট্র্যাক — reports-এর জন্য দরকার হবে।"""
    __tablename__ = 'stock_movements'
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.id'), nullable=False)
    change = db.Column(db.Float, nullable=False)  # +আসলে in, -হলে out
    reason = db.Column(db.String(100))            # 'purchase', 'kitchen_use', 'wastage'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "item_id": self.item_id, "change": self.change,
                "reason": self.reason, "created_at": self.created_at.isoformat()}