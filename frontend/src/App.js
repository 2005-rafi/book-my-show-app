import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Shows from './components/Shows';
import SeatSelection from './components/SeatSelection';
import Payment from './components/Payment';
import BookingHistory from './components/BookingHistory';
import './App.css';

function AppContent() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    }
  }, [token]);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
      <div className="App">
        <header>
          <h1>BookMyShow</h1>
          {user && (
            <div className="header-actions">
              <span>Welcome, {user.name}</span>
              <button onClick={() => navigate('/bookings')}>My Bookings</button>
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </header>
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/shows" />} />
          <Route path="/shows" element={user ? <Shows token={token} /> : <Navigate to="/login" />} />
          <Route path="/seats/:showId" element={user ? <SeatSelection token={token} /> : <Navigate to="/login" />} />
          <Route path="/payment/:bookingId" element={user ? <Payment token={token} /> : <Navigate to="/login" />} />
          <Route path="/bookings" element={user ? <BookingHistory token={token} /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={user ? "/shows" : "/login"} />} />
        </Routes>
      </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;