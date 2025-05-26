import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    avatar: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        avatar: form.avatar.trim(),
        phone: form.phone.trim(),
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <h2>Register</h2>

      {error && <p className="error-message">{error}</p>}

      <label htmlFor="username">Username</label>
      <input
        id="username"
        type="text"
        name="username"
        value={form.username}
        onChange={handleChange}
        placeholder="Enter username"
        required
      />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="Enter email"
        required
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        name="password"
        value={form.password}
        onChange={handleChange}
        placeholder="Enter password"
        required
      />

      <label htmlFor="phone">Phone Number</label>
      <input
        id="phone"
        type="tel"
        name="phone"
        value={form.phone}
        onChange={handleChange}
        placeholder="Enter phone number"
        required
      />

      <label htmlFor="avatar">Avatar URL (optional)</label>
      <input
        id="avatar"
        type="text"
        name="avatar"
        value={form.avatar}
        onChange={handleChange}
        placeholder="Avatar URL (optional)"
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>

      <p className="redirect-text">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </form>
  );
}
