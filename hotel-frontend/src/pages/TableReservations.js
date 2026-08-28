import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function TableReservations() {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    table_id: '', customer_name: '', customer_phone: '',
    reservation_date: '', reservation_time: '', party_size: 2, notes: ''
  });

  const fetchReservations = () => {
    setLoading(true);
    API.get('/api/restaurant/reservations')
      .then(r => setReservations(r.data))
      .catch(() => toast.error('লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReservations();
    API.get('/api/restaurant/tables').then(r => setTables(r.data)).catch(() => {});
  }, []);

  const statusColor = {
    confirmed: { bg: '#dbeafe', color: '#2563eb' },
    seated:    { bg: '#fed7aa', color: '#ea580c' },
    completed: { bg: '#dcfce7', color: '#16a34a' },
    cancelled: { bg: '#fee2e2', color: '#dc2626' },
  };

  const nextStatus = { confirmed: 'seated', seated: 'completed' };

  const resetForm = () => setForm({
    table_id: '', customer_name: '', customer_phone: '',
    reservation_date: '', reservation_time: '', party_size: 2, notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.table_id || !form.customer_name || !form.reservation_date || !form.reservation_time) {
      toast.error('সব প্রয়োজনীয় তথ্য দিন');
      return;
    }
    try {
      await API.post('/api/restaurant/reservations', form);
      toast.success('Reservation তৈরি হয়েছে!');
      setShowModal(false);
      resetForm();
      fetchReservations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ব্যর্থ হয়েছে');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await API.put(`/api/restaurant/reservations/${id}/status`, { status: newStatus });
      toast.success(`Reservation #${id} → ${newStatus}`);
      fetchReservations();
    } catch (err) {
      toast.error('আপডেট ব্যর্থ হয়েছে');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('এই reservation বাতিল করবেন?')) return;
    handleStatusChange(id, 'cancelled');
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="page-header">
        <h2>📅 Table Reservations</h2>
        <button className="btn btn-cta" onClick={() => setShowModal(true)}>
          ➕ New Reservation
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
                  <th>Table</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Party</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No reservations yet
                    </td>
                  </tr>
                ) : reservations.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '700' }}>#{r.id}</td>
                    <td>{r.table_number}</td>
                    <td>{r.customer_name}<br/><span style={{fontSize:'11px', color:'#94a3b8'}}>{r.customer_phone}</span></td>
                    <td>{r.reservation_date}</td>
                    <td>{r.reservation_time}</td>
                    <td>{r.party_size} 👤</td>
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
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {nextStatus[r.status] && (
                          <button
                            className="btn btn-info"
                            style={{ padding: '5px 10px', fontSize: '11px' }}
                            onClick={() => handleStatusChange(r.id, nextStatus[r.status])}
                          >
                            → {nextStatus[r.status]}
                          </button>
                        )}
                        {!['completed', 'cancelled'].includes(r.status) && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '5px 10px', fontSize: '11px' }}
                            onClick={() => handleCancel(r.id)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
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
              <h3>➕ New Table Reservation</h3>
              <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Table *</label>
                <select
                  value={form.table_id}
                  onChange={e => setForm({ ...form, table_id: e.target.value })}
                  required
                >
                  <option value="">— Select Table —</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.table_number} — Capacity {t.capacity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={form.customer_phone}
                    onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    min={today}
                    value={form.reservation_date}
                    onChange={e => setForm({ ...form, reservation_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input
                    type="time"
                    value={form.reservation_time}
                    onChange={e => setForm({ ...form, reservation_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Party Size</label>
                <input
                  type="number"
                  min="1"
                  value={form.party_size}
                  onChange={e => setForm({ ...form, party_size: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Special request, ইত্যাদি"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-cta" style={{ flex: 1 }}>
                  ✅ Reserve Table
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