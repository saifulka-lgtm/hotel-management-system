import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    username: '', password: '', role: '',
    full_name: '', phone: '', department: '', designation: ''
  });

  const fetchEmployees = () => {
    setLoading(true);
    API.get('/api/employees')
      .then(r => setEmployees(r.data))
      .catch(() => toast.error('স্টাফ লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEmployees();
    API.get('/api/roles').then(r => setRoles(r.data)).catch(() => {});
  }, []);

  const resetForm = () => setForm({
    username: '', password: '', role: '',
    full_name: '', phone: '', department: '', designation: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.full_name || !form.role) {
      toast.error('Username, password, name ও role আবশ্যক');
      return;
    }
    try {
      // Step 1 — Admin account তৈরি
      const adminRes = await API.post('/api/auth/register', {
        username: form.username,
        password: form.password,
        role: form.role
      });
      // Step 2 — Employee profile তৈরি
      await API.post('/api/employees', {
        admin_id: adminRes.data.id,
        full_name: form.full_name,
        phone: form.phone,
        department: form.department,
        designation: form.designation
      });
      toast.success('নতুন স্টাফ তৈরি হয়েছে!');
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error || 'তৈরি করতে ব্যর্থ হয়েছে');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>👥 Staff & Roles</h2>
        <button className="btn btn-cta" onClick={() => setShowModal(true)}>
          ➕ New Staff
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
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No staff found
                  </td>
                </tr>
              ) : employees.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: '700' }}>#{e.admin_id}</td>
                  <td>{e.full_name}</td>
                  <td>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px',
                      fontSize: '12px', fontWeight: '600',
                      background: '#e0e7ff', color: '#4338ca',
                      textTransform: 'capitalize'
                    }}>
                      {e.role || '—'}
                    </span>
                  </td>
                  <td>{e.department || '—'}</td>
                  <td>{e.designation || '—'}</td>
                  <td>{e.phone || '—'}</td>
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
              <h3>➕ New Staff Member</h3>
              <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  required
                >
                  <option value="">— Select Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    placeholder="Hotel / Restaurant / Delivery"
                  />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                    placeholder="Waiter / Receptionist"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-cta" style={{ flex: 1 }}>
                  ✅ Create Staff
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