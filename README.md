# BookMyShow Prototype

A minimal movie ticket booking system with React frontend and Flask backend.

## Features
- User registration/login/logout
- View available shows with caching
- Book tickets with seat management
- Mock payment system with bypass option
- Cancel bookings with automatic refunds

## Tech Stack
- **Frontend**: React.js with React Router
- **Backend**: Python Flask with CORS
- **Database**: MongoDB
- **Caching**: Redis

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB running on localhost:27017
- Redis running on localhost:6379

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## API Endpoints
- POST `/register` - User registration
- POST `/login` - User login
- POST `/logout` - User logout
- GET `/shows` - Get available shows (cached)
- POST `/book` - Book tickets
- POST `/payment` - Process payment
- POST `/cancel` - Cancel booking with refund

## Usage
1. Register/Login to access the system
2. Browse available shows on the main page
3. Select a show and choose number of tickets
4. Use mock payment bypass to complete booking
5. Cancel bookings to get automatic refunds

### Docker Redis
``` bash
docker exec -it redis redis-cli
KEYS *
GET shows
TTL shows
```