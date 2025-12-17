import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Payment = ({ token }) => {
  const { bookingId } = useParams();
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const handlePayment = async (bypass = false) => {
    setProcessing(true);
    try {
      const response = await axios.post(
        'http://localhost:5000/payment',
        { bookingId, bypass },
        { headers: { Authorization: token } }
      );
      alert(response.data.message);
      navigate('/shows');
    } catch (error) {
      alert(error.response?.data?.error || 'Payment failed');
    }
    setProcessing(false);
  };

  const handleCancel = async () => {
    try {
      const response = await axios.post(
        'http://localhost:5000/cancel',
        { bookingId },
        { headers: { Authorization: token } }
      );
      alert(response.data.message);
      navigate('/shows');
    } catch (error) {
      alert(error.response?.data?.error || 'Cancellation failed');
    }
  };

  return (
    <div className="payment-container">
      <h2>Payment</h2>
      <div className="payment-options">
        <p>Booking ID: {bookingId}</p>
        <button 
          onClick={() => handlePayment(true)} 
          disabled={processing}
        >
          {processing ? 'Processing...' : 'Mock Payment (Bypass)'}
        </button>
        <button onClick={handleCancel}>Cancel & Refund</button>
        <button onClick={() => navigate('/shows')}>Back to Shows</button>
      </div>
    </div>
  );
};

export default Payment;