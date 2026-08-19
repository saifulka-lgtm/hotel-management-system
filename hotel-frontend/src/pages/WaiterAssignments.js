import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function WaiterAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ waiter_id: '', table_id: '', shift_date: '' });

  const fetchAssignments = () => {
    setLoading(true);
    API.get('/api/restaurant/waiter-assignments')
      .then(r => setAssignments(r.data))
      .catch(() => toast.error('লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssignments();
    API.get('/api/employees').then(r => setWaiters(r.data)).catch(() => {});
    API.get('/api/restaurant/tables').then(r => setTables(r.data)).catch(() => {});
  }, []);

  const resetForm = () => setForm({ waiter_id: '', table_id: '', shift_date: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.waiter_id || !form.table_id || !form.shift_date) {
      toast.error('সব ফিল্ড পূরণ করুন');
      return;
    }
    try {
      await API.post('/api/restaurant/waiter-assignments', form);
      toast.success('Assignment তৈরি হয়েছে!');
      setShowModal(false);
      resetForm();
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ব্যর্থ হয়েছে');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('এই assignment বাতিল করবেন?')) return;
    try {
      await API.delete(`/api/restaurant/waiter-assignments/${id}`);
      toast.success('Assignment মুছে ফেলা হয়েছে');
      fetchAssignments();
    } catch (err) {
      toast.error('মুছতে ব্যর্থ হয়েছে');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="page-header">
        <h2>🧑‍🍳 Waiter Assignments</h2>
        <button className="btn btn-cta" onClick={() => setShowModal(true)}>
          ➕ New Assignment
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            ⏳ Loading...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Waiter</th>
                <th>Table</th>
                <th>Shift Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No assignments yet
                  </td>
                </tr>
              ) : assignments.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: '700' }}>#{a.id}</td>
                  <td>{a.waiter_name || `Staff #${a.waiter_id}`}</td>
                  <td>{a.table_number || `Table #${a.table_id}`}</td>
                  <td>{a.shift_date}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '5px 10px', fontSize: '11px' }}
                      onClick={() => handleDelete(a.id)}
                    >
                      ✕ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ New Waiter Assignment</h3>
              <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Waiter *</label>
                <select
                  value={form.waiter_id}
                  onChange={e => setForm({ ...form, waiter_id: e.target.value })}
                  required
                >
                  <option value="">— Select Staff —</option>
                  {waiters.map(w => (
                    <option key={w.admin_id} value={w.admin_id}>
                      {w.full_name} ({w.role || 'staff'})
                    </option>
                  ))}
                </select>
              </div>

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
                      {t.table_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Shift Date *</label>
                <input
                  type="date"
                  min={today}
                  value={form.shift_date}
                  onChange={e => setForm({ ...form, shift_date: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-cta" style={{ flex: 1 }}>
                  ✅ Assign
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