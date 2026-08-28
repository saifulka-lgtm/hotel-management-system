import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Housekeeping() {
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    room_id: '',
    task_type: 'cleaning',
    notes: ''
  });

  const fetchTasks = () => {
    setLoading(true);
    API.get('/api/housekeeping/tasks')
      .then(r => setTasks(r.data))
      .catch(() => toast.error('টাস্ক লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
    API.get('/api/rooms').then(r => setRooms(r.data)).catch(() => {});
  }, []);

  const statusColor = {
    pending:     { bg: '#fef9c3', color: '#ca8a04' },
    in_progress: { bg: '#fed7aa', color: '#ea580c' },
    completed:   { bg: '#dcfce7', color: '#16a34a' },
  };

  const nextStatus = {
    pending: 'in_progress',
    in_progress: 'completed',
  };

  const resetForm = () => setForm({ room_id: '', task_type: 'cleaning', notes: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.room_id) {
      toast.error('একটি রুম সিলেক্ট করুন');
      return;
    }
    try {
      await API.post('/api/housekeeping/tasks', form);
      toast.success('টাস্ক তৈরি হয়েছে!');
      setShowModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'টাস্ক তৈরি ব্যর্থ হয়েছে');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await API.put(`/api/housekeeping/tasks/${taskId}/status`, { status: newStatus });
      toast.success(`Task #${taskId} → ${newStatus}`);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>🧹 Housekeeping</h2>
        <button className="btn btn-cta" onClick={() => setShowModal(true)}>
          ➕ New Task
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
                  <th>Task ID</th>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No housekeeping tasks yet
                    </td>
                  </tr>
                ) : tasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: '700' }}>#{t.id}</td>
                    <td>Room {t.room_number}</td>
                    <td style={{ textTransform: 'capitalize' }}>{t.task_type}</td>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>{t.notes || '—'}</td>
                    <td>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px',
                        fontSize: '12px', fontWeight: '600',
                        background: statusColor[t.status]?.bg || '#f1f5f9',
                        color: statusColor[t.status]?.color || '#64748b'
                      }}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      {nextStatus[t.status] && (
                        <button
                          className="btn btn-info"
                          style={{ padding: '5px 10px', fontSize: '11px' }}
                          onClick={() => handleStatusChange(t.id, nextStatus[t.status])}
                        >
                          → {nextStatus[t.status]}
                        </button>
                      )}
                      {t.status === 'completed' && (
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
              <h3>➕ New Housekeeping Task</h3>
              <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Room *</label>
                <select
                  value={form.room_id}
                  onChange={e => setForm({ ...form, room_id: e.target.value })}
                  required
                >
                  <option value="">— Select Room —</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} — {r.room_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Task Type</label>
                <select
                  value={form.task_type}
                  onChange={e => setForm({ ...form, task_type: e.target.value })}
                >
                  <option value="cleaning">Cleaning</option>
                  <option value="turnover">Turnover</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-cta" style={{ flex: 1 }}>
                  ✅ Create Task
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