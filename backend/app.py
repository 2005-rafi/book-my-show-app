from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import redis
import json
import uuid
from datetime import datetime
import bcrypt
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

try:
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client.bookmyshow
    logger.info("✓ MongoDB connected")
except (ConnectionFailure, ServerSelectionTimeoutError) as e:
    logger.error(f"✗ MongoDB failed: {e}")
    db = None

try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    redis_client.ping()
    logger.info("✓ Redis connected")
except Exception as e:
    logger.error(f"✗ Redis failed: {e}")
    redis_client = None

users = db.users if db is not None else None
shows = db.shows if db is not None else None
bookings = db.bookings if db is not None else None

memory_cache = {}
fallback_db = {
    'users': [],
    'shows': [
        {"id": "1", "title": "Avengers", "time": "18:00", "date": "2024-01-15", "price": 250, 
         "totalSeats": 100, "bookedSeats": [], "seatLayout": {"rows": 10, "cols": 10}},
        {"id": "2", "title": "Spider-Man", "time": "21:00", "date": "2024-01-15", "price": 300, 
         "totalSeats": 80, "bookedSeats": [], "seatLayout": {"rows": 8, "cols": 10}},
        {"id": "3", "title": "Batman", "time": "15:00", "date": "2024-01-16", "price": 280, 
         "totalSeats": 120, "bookedSeats": [], "seatLayout": {"rows": 12, "cols": 10}}
    ],
    'bookings': []
}

for show in fallback_db['shows']:
    if 'bookedSeats' not in show:
        show['bookedSeats'] = []
    if 'seatLayout' not in show:
        show['seatLayout'] = {"rows": 10, "cols": 10}

def cache_get(key):
    if redis_client:
        try:
            return redis_client.get(key)
        except:
            pass
    return memory_cache.get(key)

def cache_set(key, value, ttl=3600):
    if redis_client:
        try:
            redis_client.setex(key, ttl, value)
            return
        except:
            pass
    memory_cache[key] = value

def cache_delete(key):
    if redis_client:
        try:
            redis_client.delete(key)
        except:
            pass
    memory_cache.pop(key, None)

def init_data():
    if db is not None and shows is not None:
        try:
            if shows.count_documents({}) == 0:
                shows.insert_many(fallback_db['shows'])
                logger.info("✓ Sample data initialized")
            else:
                shows.update_many(
                    {"totalSeats": {"$exists": False}},
                    {"$set": {
                        "totalSeats": 100,
                        "bookedSeats": [],
                        "seatLayout": {"rows": 10, "cols": 10}
                    }}
                )
                shows.update_many(
                    {"seats": {"$exists": True}, "totalSeats": {"$exists": False}},
                    [{"$set": {"totalSeats": "$seats"}}]
                )
                shows.update_many({}, {"$unset": {"seats": ""}})
                logger.info("✓ Data migration completed")
        except Exception as e:
            logger.error(f"✗ Init failed: {e}")

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = {"email": data['email'], "password": hashed, "name": data['name']}
        
        if db is not None and users is not None:
            users.insert_one(user)
        else:
            fallback_db['users'].append(user)
        
        logger.info(f"✓ User registered: {data['email']}")
        return jsonify({"message": "User registered"})
    except Exception as e:
        logger.error(f"✗ Registration failed: {e}")
        return jsonify({"error": "Registration failed"}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        
        if db is not None and users is not None:
            user = users.find_one({"email": data['email']})
        else:
            user = next((u for u in fallback_db['users'] if u['email'] == data['email']), None)
        
        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
            token = str(uuid.uuid4())
            cache_set(f"session:{token}", user['email'])
            logger.info(f"✓ User logged in: {data['email']}")
            return jsonify({"token": token, "user": {"email": user['email'], "name": user['name']}})
        
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        logger.error(f"✗ Login failed: {e}")
        return jsonify({"error": "Login failed"}), 500

@app.route('/logout', methods=['POST'])
def logout():
    try:
        token = request.headers.get('Authorization')
        if token:
            cache_delete(f"session:{token}")
        return jsonify({"message": "Logged out"})
    except Exception as e:
        return jsonify({"error": "Logout failed"}), 500

@app.route('/verify-session', methods=['GET'])
def verify_session():
    try:
        token = request.headers.get('Authorization')
        session_data = cache_get(f"session:{token}") if token else None
        return jsonify({
            "token": token,
            "session": session_data,
            "valid": bool(token and session_data)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/shows', methods=['GET'])
def get_shows():
    try:
        cached = cache_get("shows")
        if cached:
            return jsonify(json.loads(cached))
        
        if db is not None and shows is not None:
            show_list = list(shows.find({}, {"_id": 0}))
        else:
            show_list = fallback_db['shows']
        
        for show in show_list:
            if 'totalSeats' not in show and 'seats' in show:
                show['totalSeats'] = show['seats']
            if 'totalSeats' not in show:
                show['totalSeats'] = 100
            if 'bookedSeats' not in show:
                show['bookedSeats'] = []
            if 'seatLayout' not in show:
                show['seatLayout'] = {"rows": 10, "cols": 10}
            
            show['availableSeats'] = show['totalSeats'] - len(show['bookedSeats'])
        
        cache_set("shows", json.dumps(show_list))
        return jsonify(show_list)
    except Exception as e:
        logger.error(f"✗ Get shows failed: {e}")
        return jsonify({"error": "Failed to get shows"}), 500

@app.route('/shows/<show_id>/seats', methods=['GET'])
def get_seats(show_id):
    try:
        if db is not None and shows is not None:
            show = shows.find_one({"id": show_id}, {"_id": 0})
        else:
            show = next((s for s in fallback_db['shows'] if s['id'] == show_id), None)
        
        if not show:
            return jsonify({"error": "Show not found"}), 404
        
        return jsonify({
            "seatLayout": show.get('seatLayout', {"rows": 10, "cols": 10}),
            "bookedSeats": show.get('bookedSeats', []),
            "totalSeats": show.get('totalSeats', 100)
        })
    except Exception as e:
        return jsonify({"error": "Failed to get seats"}), 500

@app.route('/book', methods=['POST'])
def book_tickets():
    try:
        data = request.json
        token = request.headers.get('Authorization')
        
        session_data = cache_get(f"session:{token}") if token else None
        logger.info(f"Book request - Token: {token}, Session: {session_data}")
        
        if not token:
            logger.info("No token provided")
            return jsonify({"error": "No token provided"}), 401
            
        if not session_data:
            logger.info(f"Invalid or expired session for token: {token}")
            return jsonify({"error": "Session expired, please login again"}), 401
        
        user_email = session_data
        selected_seats = data.get('selectedSeats', [])
        
        if db is not None and shows is not None:
            show = shows.find_one({"id": data['showId']})
        else:
            show = next((s for s in fallback_db['shows'] if s['id'] == data['showId']), None)
        
        if not show:
            return jsonify({"error": "Show not found"}), 404
        
        booked_seats = show.get('bookedSeats', [])
        for seat in selected_seats:
            if seat in booked_seats:
                return jsonify({"error": f"Seat {seat} already booked"}), 400
        
        booking_id = str(uuid.uuid4())
        booking = {
            "id": booking_id,
            "user": user_email,
            "showId": data['showId'],
            "showTitle": show['title'],
            "selectedSeats": selected_seats,
            "tickets": len(selected_seats),
            "amount": show['price'] * len(selected_seats),
            "status": "pending",
            "created": datetime.now().isoformat()
        }
        
        if db is not None and bookings is not None:
            bookings.insert_one(booking)
            shows.update_one({"id": data['showId']}, {"$push": {"bookedSeats": {"$each": selected_seats}}})
        else:
            fallback_db['bookings'].append(booking)
            if 'bookedSeats' not in show:
                show['bookedSeats'] = []
            show['bookedSeats'].extend(selected_seats)
        
        cache_delete("shows")
        logger.info(f"✓ Booking created: {booking_id}")
        return jsonify({"bookingId": booking_id, "amount": booking['amount']})
    except Exception as e:
        logger.error(f"✗ Booking failed: {e}")
        return jsonify({"error": "Booking failed"}), 500

@app.route('/user/bookings', methods=['GET'])
def get_user_bookings():
    try:
        token = request.headers.get('Authorization')
        session_data = cache_get(f"session:{token}") if token else None
        
        if not token or not session_data:
            return jsonify({"error": "Unauthorized"}), 401
        
        user_email = session_data
        
        if db is not None and bookings is not None:
            user_bookings = list(bookings.find({"user": user_email}, {"_id": 0}))
        else:
            user_bookings = [b for b in fallback_db['bookings'] if b['user'] == user_email]
        
        return jsonify(user_bookings)
    except Exception as e:
        return jsonify({"error": "Failed to get bookings"}), 500

@app.route('/payment', methods=['POST'])
def process_payment():
    try:
        data = request.json
        
        if db is not None and bookings is not None:
            booking = bookings.find_one({"id": data['bookingId']})
        else:
            booking = next((b for b in fallback_db['bookings'] if b['id'] == data['bookingId']), None)
        
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        if data.get('bypass'):
            if db is not None and bookings is not None:
                bookings.update_one({"id": data['bookingId']}, {"$set": {"status": "confirmed"}})
            else:
                booking['status'] = 'confirmed'
            
            logger.info(f"✓ Payment processed: {data['bookingId']}")
            return jsonify({"message": "Payment successful", "status": "confirmed"})
        
        return jsonify({"message": "Payment processed"})
    except Exception as e:
        return jsonify({"error": "Payment failed"}), 500

@app.route('/cancel', methods=['POST'])
def cancel_booking():
    try:
        data = request.json
        token = request.headers.get('Authorization')
        session_data = cache_get(f"session:{token}") if token else None
        
        if not token or not session_data:
            return jsonify({"error": "Unauthorized"}), 401
        
        if db is not None and bookings is not None:
            booking = bookings.find_one({"id": data['bookingId']})
        else:
            booking = next((b for b in fallback_db['bookings'] if b['id'] == data['bookingId']), None)
        
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        selected_seats = booking.get('selectedSeats', [])
        
        if db is not None and bookings is not None:
            bookings.update_one({"id": data['bookingId']}, {"$set": {"status": "cancelled"}})
            shows.update_one({"id": booking['showId']}, {"$pull": {"bookedSeats": {"$in": selected_seats}}})
        else:
            booking['status'] = 'cancelled'
            show = next((s for s in fallback_db['shows'] if s['id'] == booking['showId']), None)
            if show:
                for seat in selected_seats:
                    if seat in show['bookedSeats']:
                        show['bookedSeats'].remove(seat)
        
        cache_delete("shows")
        logger.info(f"✓ Booking cancelled: {data['bookingId']}")
        return jsonify({"message": "Booking cancelled, refund processed"})
    except Exception as e:
        return jsonify({"error": "Cancellation failed"}), 500

if __name__ == '__main__':
    init_data()
    logger.info("🚀 BookMyShow server starting...")
    app.run(debug=True)