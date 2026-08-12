from datetime import timedelta

class Config:
    SECRET_KEY = 'your-secret-key-here'

    # PostgreSQL কানেকশন — আপনার pgAdmin-এর username/password/db নাম বসান
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:1234@localhost:5432/hotel_management'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = 'jwt-secret-hotel-bd-2026'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)