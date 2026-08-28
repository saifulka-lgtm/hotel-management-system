import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function ServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ booking_id: '', request_type: 'food', details: '' });

  const fetchRequests = () => {
    setLoading(true);
    API.get('/api/service-requests')
      .then(r => setRequests(r.data))
      .catch(() => toast.error('লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
    API.get('/api/bookings').then(r => {
      setBookings(r.data.filter(b => b.status === 'Confirmed'));
    }).catch(() => {});
  }, []);

  const statusColor = {
    pending:     { bg: '#fef9c3', color: '#ca8a04' },
    in_progress: { bg: '#fed7aa', color: '#ea580c' },
    completed:   { bg: '#dcfce7', color: '#16a34a' },
  };

  const nextStatus = { pending: 'in_progress', in_progress: 'completed' };

  const resetForm = () => setForm({ booking_id: '', request_type: 'food', details: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.booking_id) {
      toast.error('একটি বুকিং সিলেক্ট করুন');
      return;
    }
    try {
      await API.post('/api/service-requests', form);
      toast.success('Service request তৈরি হয়েছে!');
      setShowModal(false);
      resetForm();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ব্যর্থ হয়েছে');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await API.put(`/api/service-requests/${id}/status`, { status: newStatus });
      toast.success(`Request #${id} → ${newStatus}`);
      fetchRequests();
    } catch (err) {
      toast.error('আপডেট ব্যর্থ হয়েছে');
    }
  };

  const typeIcon = { food: '🍽️', cleaning: '🧹', amenities: '🧴', other: '📋' };

  return (
    <div>
      <div className="page-header">
        <h2>🛎️ In-Room Service Requests</h2>
        <button className="btn btn-cta" onClick={() => setShowModal(true)}>
          ➕ New Request
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            ⏳ Loading...
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Room</th>
                  <th>Guest</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No service requests yet
                    </td>
                  </tr>
                ) : requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '700' }}>#{r.id}</td>
                    <td>Room {r.room_number}</td>
                    <td>{r.guest_name || '—'}</td>
                    <td>{typeIcon[r.request_type] || '📋'} {r.request_type}</td>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>{r.details || '—'}</td>
                    <td>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px',
                        fontSize: '12px', fontWeight: '600',
                        background: statusColor[r.status]?.bg || '#f1f5f9',
                        color: statusColor[r.status]?.color || '#64748b'
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {nextStatus[r.status] && (
                        <button
                          className="btn btn-info"
                          style={{ padding: '5px 10px', fontSize: '11px' }}
                          onClick={() => handleStatusChange(r.id, nextStatus[r.status])}
                        >
                          → {nextStatus[r.status]}
                        </button>
                      )}
                      {r.status === 'completed' && (
                        <span style={{ fontSize: '12px', color: '#22c55e' }}>✅ Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ New Service Request</h3>
              <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Booking (Checked-in Guest) *</label>
                <select
                  value={form.booking_id}
                  onChange={e => setForm({ ...form, booking_id: e.target.value })}
                  required
                >
                  <option value="">— Select Booking —</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      #{b.id} — {b.customer} — Room {b.room}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Request Type</label>
                <select
                  value={form.request_type}
                  onChange={e => setForm({ ...form, request_type: e.target.value })}
                >
                  <option value="food">Food</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="amenities">Amenities</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Details</label>
                <input
                  type="text"
                  value={form.details}
                  onChange={e => setForm({ ...form, details: e.target.value })}
                  placeholder="e.g. Extra towels, 2 bottles of water"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-cta" style={{ flex: 1 }}>
                  ✅ Submit Request
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}