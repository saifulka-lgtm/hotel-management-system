from extensions import db

class MenuItem(db.Model):
    __tablename__ = 'menu_items'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(50))     # starter/main/dessert/drink
    price = db.Column(db.Float, nullable=False)
    is_available = db.Column(db.Boolean, default=True)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(255))

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "category": self.category,
            "price": self.price, "is_available": self.is_available,
            "description": self.description, "image_url": self.image_url
        }