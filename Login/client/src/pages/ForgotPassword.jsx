import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/request-reset', {
        email,
        phone,
      });
      setMessage(res.data.message || 'OTP sent successfully!');
      setIsOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
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
      
      // Redirect to home page after successful reset
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP or something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/request-reset', {
        email,
        phone,
      });
      setMessage('OTP resent successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setIsOtpSent(false);
    setOtp('');
    setNewPassword('');
    setMessage('');
    setError('');
  };

  return (
    <div className="form-container">
      {!isOtpSent ? (
        // Step 1: Enter Email and Phone
        <form onSubmit={handleSendOtp}>
          <h2>Forgot Password</h2>
          <p>Enter your email and phone number to receive an OTP</p>
          
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
          
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <input
            type="tel"
            name="phone"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        // Step 2: Enter OTP and New Password
        <form onSubmit={handleVerifyAndReset}>
          <h2>Verify OTP & Reset Password</h2>
          <p>We've sent an OTP to your email and phone number</p>
          
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
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
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength="6"
          />
          
          <button type="submit" disabled={isLoading || otp.length !== 6}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
          
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <button 
              type="button" 
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
              type="button" 
              onClick={handleBackToEmail}
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
              Change Email/Phone
            </button>
          </div>
        </form>
      )}
    </div>
  );
}