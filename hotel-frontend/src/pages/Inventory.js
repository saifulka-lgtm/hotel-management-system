import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: '', unit: 'kg', quantity: '', reorder_level: '', used_by: 'shared'
  });

  const fetchItems = () => {
    setLoading(true);
    API.get('/api/inventory')
      .then(r => setItems(r.data))
      .catch(() => toast.error('লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, []);

  const resetForm = () => setForm({ name: '', unit: 'kg', quantity: '', reorder_level: '', used_by: 'shared' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error('আইটেমের নাম দিন');
      return;
    }
    try {
      await API.post('/api/inventory', form);
      toast.success('নতুন আইটেম যোগ হয়েছে!');
      setShowModal(false);
      resetForm();
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ব্যর্থ হয়েছে');
    }
  };

  const handleAdjust = async (item) => {
    const changeStr = window.prompt(`"${item.name}" — কত পরিমাণ যোগ/বিয়োগ করবেন? (যোগ হলে + দিন, যেমন 5, কমাতে -5)`);
    if (changeStr === null || changeStr.trim() === '') return;
    const change = parseFloat(changeStr);
    if (isNaN(change)) {
      toast.error('সঠিক সংখ্যা দিন');
      return;
    }
    try {
      await API.put(`/api/inventory/${item.id}/adjust`, { change, reason: 'manual adjustment' });
      toast.success('স্টক আপডেট হয়েছে!');
      fetchItems();
    } catch (err) {
      toast.error('আপডেট ব্যর্থ হয়েছে');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>📦 Inventory</h2>
        <button className="btn btn-cta" onClick={() => setShowModal(true)}>
          ➕ New Item
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
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Reorder Level</th>
                  <th>Used By</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No inventory items
                    </td>
                  </tr>
                ) : items.map(i => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: '700' }}>#{i.id}</td>
                    <td>{i.name}</td>
                    <td>{i.quantity} {i.unit}</td>
                    <td>{i.reorder_level} {i.unit}</td>
                    <td style={{ textTransform: 'capitalize' }}>{i.used_by}</td>
                    <td>
                      {i.low_stock ? (
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: '600',
                          background: '#fee2e2', color: '#dc2626'
                        }}>
                          ⚠️ Low Stock
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: '600',
                          background: '#dcfce7', color: '#16a34a'
                        }}>
                          OK
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-info"
                        style={{ padding: '5px 10px', fontSize: '11px' }}
                        onClick={() => handleAdjust(i)}
                      >
                        ⚖️ Adjust Stock
                      </button>
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
              <h3>➕ New Inventory Item</h3>
              <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Unit</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                  >
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                    <option value="piece">piece</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Used By</label>
                  <select
                    value={form.used_by}
                    onChange={e => setForm({ ...form, used_by: e.target.value })}
                  >
                    <option value="shared">Shared</option>
                    <option value="hotel">Hotel</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="restaurant">Restaurant</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Initial Quantity</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    value={form.reorder_level}
                    onChange={e => setForm({ ...form, reorder_level: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-cta" style={{ flex: 1 }}>
                  ✅ Create Item
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