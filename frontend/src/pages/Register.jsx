import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', year: '', branch: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page">
      <div className="form-card">
        <h1 className="page-title" style={{ fontSize: 24, textAlign: 'center' }}>Create an account</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input name="name" required value={form.name} onChange={handleChange} />
          </div>
          <div className="field">
            <label>College email</label>
            <input name="email" type="email" required value={form.email} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" required minLength={6} value={form.password} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Year</label>
            <input name="year" type="number" min={1} max={5} value={form.year} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Branch</label>
            <input name="branch" value={form.branch} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-navy btn-block" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="helper-text">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
