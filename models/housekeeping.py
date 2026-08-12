from extensions import db
from datetime import datetime

class HousekeepingTask(db.Model):
    __tablename__ = 'housekeeping_tasks'
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)

    status = db.Column(db.String(20), default='pending')
    # pending -> in_progress -> completed

    task_type = db.Column(db.String(30), default='cleaning')
    # cleaning / turnover / inspection

    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    room = db.relationship('Room', backref='housekeeping_tasks')
    staff = db.relationship('Admin', backref='housekeeping_tasks')

    def to_dict(self):
        return {
            "id": self.id,
            "room_id": self.room_id,
            "room_number": self.room.room_number if self.room else None,
            "assigned_to": self.assigned_to,
            "staff_name": self.staff.username if self.staff else None,
            "status": self.status,
            "task_type": self.task_type,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }