import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch {
      toast.error('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
    }}>
      <div className="card" style={{ width: '380px' }}>

        {/* ── Logo Section ── */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
              marginBottom: '12px',
              boxShadow: '0 4px 16px rgba(232,25,60,0.3)'
            }}
          />
          <h2 style={{ color: '#e8193c', margin: '8px 0 4px' }}>
            Smart Hotel BD
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Admin Panel Login
          </p>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
            disabled={loading}
          >
            {loading ? '⏳ Logging in...' : '🔐 Login'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '16px',
          fontSize: '13px', color: '#64748b'
        }}>
          Default: admin / admin123
        </p>
      </div>
    </div>
  );
}