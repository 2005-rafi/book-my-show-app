import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Booking = ({ token }) => {
  const { showId } = useParams();
  const [tickets, setTickets] = useState(1);
  const navigate = useNavigate();

  const handleBooking = async () => {
    try {
      const response = await axios.post(
        'http://localhost:5000/book',
        { showId, tickets },
        { headers: { Authorization: token } }
      );
      navigate(`/payment/${response.data.bookingId}`);
    } catch (error) {
      alert(error.response?.data?.error || 'Booking failed');
    }
  };

  return (
    <div className="booking-container">
      <h2>Book Tickets</h2>
      <div className="booking-form">
        <label>
          Number of Tickets:
          <select value={tickets} onChange={(e) => setTickets(parseInt(e.target.value))}>
            {[1,2,3,4,5].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </label>
        <button onClick={handleBooking}>Proceed to Payment</button>
        <button onClick={() => navigate('/shows')}>Back to Shows</button>
      </div>
    </div>
  );
};

export default Booking;