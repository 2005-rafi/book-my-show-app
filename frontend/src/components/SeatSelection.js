import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const SeatSelection = ({ token }) => {
  const { showId } = useParams();
  const [seatLayout, setSeatLayout] = useState({ rows: 10, cols: 10 });
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [show, setShow] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSeats();
    fetchShowDetails();
  }, [showId]);

  const fetchSeats = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/shows/${showId}/seats`);
      setSeatLayout(response.data.seatLayout);
      setBookedSeats(response.data.bookedSeats);
    } catch (error) {
      console.error('Error fetching seats:', error);
    }
  };

  const fetchShowDetails = async () => {
    try {
      const response = await axios.get('http://localhost:5000/shows');
      const showData = response.data.find(s => s.id === showId);
      setShow(showData);
    } catch (error) {
      console.error('Error fetching show:', error);
    }
  };

  const handleSeatClick = (seatId) => {
    if (bookedSeats.includes(seatId)) return;
    
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const handleBooking = async () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }

    console.log('Booking with token:', token);
    try {
      const response = await axios.post(
        'http://localhost:5000/book',
        { showId, selectedSeats },
        { headers: { Authorization: token } }
      );
      navigate(`/payment/${response.data.bookingId}`);
    } catch (error) {
      console.error('Booking error:', error.response);
      alert(error.response?.data?.error || 'Booking failed');
    }
  };

  const getSeatClass = (seatId) => {
    if (bookedSeats.includes(seatId)) return 'seat booked';
    if (selectedSeats.includes(seatId)) return 'seat selected';
    return 'seat available';
  };

  const renderSeats = () => {
    const seats = [];
    for (let row = 0; row < seatLayout.rows; row++) {
      const rowSeats = [];
      for (let col = 0; col < seatLayout.cols; col++) {
        const seatId = `${String.fromCharCode(65 + row)}${col + 1}`;
        rowSeats.push(
          <div
            key={seatId}
            className={getSeatClass(seatId)}
            onClick={() => handleSeatClick(seatId)}
          >
            {seatId}
          </div>
        );
      }
      seats.push(
        <div key={row} className="seat-row">
          {rowSeats}
        </div>
      );
    }
    return seats;
  };

  return (
    <div className="seat-selection">
      <h2>Select Seats - {show?.title}</h2>
      <div className="screen">SCREEN</div>
      <div className="seat-map">
        {renderSeats()}
      </div>
      <div className="legend">
        <div className="legend-item">
          <div className="seat available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="seat selected"></div>
          <span>Selected</span>
        </div>
        <div className="legend-item">
          <div className="seat booked"></div>
          <span>Booked</span>
        </div>
      </div>
      <div className="booking-summary">
        <p>Selected Seats: {selectedSeats.join(', ')}</p>
        <p>Total: ₹{selectedSeats.length * (show?.price || 0)}</p>
        <button onClick={handleBooking} disabled={selectedSeats.length === 0}>
          Book {selectedSeats.length} Seats
        </button>
        <button onClick={() => navigate('/shows')}>Back</button>
      </div>
    </div>
  );
};

export default SeatSelection;