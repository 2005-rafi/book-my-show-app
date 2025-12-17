import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Shows = ({ token }) => {
  const [shows, setShows] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchShows();
  }, []);

  const fetchShows = async () => {
    try {
      const response = await axios.get('http://localhost:5000/shows');
      setShows(response.data);
    } catch (error) {
      console.error('Error fetching shows:', error);
    }
  };

  const handleBooking = (showId) => {
    navigate(`/seats/${showId}`);
  };

  return (
    <div className="shows-container">
      <h2>Available Shows</h2>
      <div className="shows-grid">
        {shows.map(show => (
          <div key={show.id} className="show-card">
            <h3>{show.title}</h3>
            <p>Date: {show.date}</p>
            <p>Time: {show.time}</p>
            <p>Price: ₹{show.price}</p>
            <p>Available Seats: {show.availableSeats || show.totalSeats}</p>
            <button 
              onClick={() => handleBooking(show.id)}
              disabled={show.availableSeats === 0}
            >
              {show.availableSeats > 0 ? 'Select Seats' : 'Sold Out'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shows;