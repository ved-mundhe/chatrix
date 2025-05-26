import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

const VerifyReset = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!location.state?.email) {
      // If no email in state, redirect to forgot password
      navigate('/forgot-password');
    }
  }, [location, navigate]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/reset-password', {
        email,
        otp,
        newPassword,
      });
      setMessage(res.data.message || 'Password reset successfully!');
      
      // Redirect to home after successful reset
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP or something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/send-otp', { email });
      setMessage('OTP resent successfully!');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
      setMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Reset Password</h2>
      <p>We've sent an OTP to your email. Please check your inbox.</p>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleResetPassword}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled
          style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
        />
        
        <input
          type="text"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength="6"
          required
          disabled={isLoading}
          style={{ 
            fontSize: '18px', 
            textAlign: 'center', 
            letterSpacing: '2px',
            fontWeight: 'bold'
          }}
        />
        
        <input
          type="password"
          placeholder="Enter new password (min 6 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={isLoading}
          minLength="6"
        />
        
        <button type="submit" disabled={isLoading || otp.length !== 6}>
          {isLoading ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </form>
      
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <button 
          onClick={handleResendOtp}
          disabled={isLoading}
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '14px',
            marginRight: '15px'
          }}
        >
          Resend OTP
        </button>
        
        <button 
          onClick={() => navigate('/forgot-password')}
          disabled={isLoading}
          style={{
            background: 'none',
            border: 'none',
            color: '#6c757d',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Back to Forgot Password
        </button>
      </div>
    </div>
  );
};

export default VerifyReset;