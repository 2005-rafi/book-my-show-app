import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BookingHistory = ({ token }) => {
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/user/bookings',
        { headers: { Authorization: token } }
      );
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await axios.post(
        'http://localhost:5000/cancel',
        { bookingId },
        { headers: { Authorization: token } }
      );
      alert('Booking cancelled successfully');
      fetchBookings();
    } catch (error) {
      alert(error.response?.data?.error || 'Cancellation failed');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#28a745';
      case 'pending': return '#ffc107';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="booking-history">
      <h2>My Bookings</h2>
      {bookings.length === 0 ? (
        <p>No bookings found</p>
      ) : (
        <div className="bookings-list">
          {bookings.map(booking => (
            <div key={booking.id} className="booking-card">
              <div className="booking-header">
                <h3>{booking.showTitle}</h3>
                <span 
                  className="status"
                  style={{ color: getStatusColor(booking.status) }}
                >
                  {booking.status.toUpperCase()}
                </span>
              </div>
              <div className="booking-details">
                <p><strong>Booking ID:</strong> {booking.id}</p>
                <p><strong>Seats:</strong> {booking.selectedSeats?.join(', ') || `${booking.tickets} seats`}</p>
                <p><strong>Amount:</strong> ₹{booking.amount}</p>
                <p><strong>Date:</strong> {new Date(booking.created).toLocaleDateString()}</p>
              </div>
              {booking.status === 'confirmed' && (
                <button 
                  onClick={() => handleCancel(booking.id)}
                  className="cancel-btn"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <button onClick={() => navigate('/shows')} className="back-btn">
        Back to Shows
      </button>
    </div>
  );
};

export default BookingHistory;