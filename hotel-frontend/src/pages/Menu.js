import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

const categoryImages = {
  Main:    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&q=80',
  Starter: 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=200&q=80',
  Drink:   'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&q=80',
  Dessert: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&q=80',
};

export default function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: '', category: 'Main', price: '', description: '', is_available: true
  });

  const fetchItems = () => {
    setLoading(true);
    API.get('/api/menu/all')
      .then(r => setItems(r.data))
      .catch(() => toast.error('মেনু লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, []);

  const resetForm = () => {
    setForm({ name: '', category: 'Main', price: '', description: '', is_available: true });
    setEditingId(null);
  };

  const openEdit = (item) => {
    setForm({
      name: item.name, category: item.category || 'Main',
      price: item.price, description: item.description || '',
      is_available: item.is_available
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      toast.error('নাম ও দাম দিন');
      return;
    }
    try {
      if (editingId) {
        await API.put(`/api/menu/${editingId}`, form);
        toast.success('মেনু আইটেম আপডেট হয়েছে!');
      } else {
        await API.post('/api/menu', form);
        toast.success('নতুন মেনু আইটেম তৈরি হয়েছে!');
      }
      setShowModal(false);
      resetForm();
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ব্যর্থ হয়েছে');
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await API.put(`/api/menu/${item.id}`, { is_available: !item.is_available });
      toast.success(`${item.name} — ${!item.is_available ? 'Available' : 'Unavailable'}`);
      fetchItems();
    } catch (err) {
      toast.error('আপডেট ব্যর্থ হয়েছে');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>🍲 Menu Management</h2>
        <button className="btn btn-cta" onClick={() => { resetForm(); setShowModal(true); }}>
          ➕ New Item
        </button>
      </div>

      {/* Visual grid of menu items */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px', marginBottom: '24px'
      }}>
        {items.map(m => (
          <div key={m.id} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
            <img
              src={categoryImages[m.category] || categoryImages.Main}
              alt={m.name}
              style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
            />
            {!m.is_available && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '100px',
                background: 'rgba(0,0,0,0.55)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '12px', fontWeight: '700'
              }}>
                UNAVAILABLE
              </div>
            )}
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontWeight: '600', fontSize: '13px' }}>{m.name}</div>
              <div style={{ color: '#1F3A5F', fontWeight: '700', fontSize: '14px' }}>৳{m.price}</div>
            </div>
          </div>
        ))}
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
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No menu items
                    </td>
                  </tr>
                ) : items.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: '700' }}>#{m.id}</td>
                    <td>{m.name}</td>
                    <td>{m.category || '—'}</td>
                    <td style={{ color: '#1F3A5F', fontWeight: '600' }}>৳{m.price}</td>
                    <td>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px',
                        fontSize: '12px', fontWeight: '600',
                        background: m.is_available ? '#dcfce7' : '#fee2e2',
                        color: m.is_available ? '#16a34a' : '#dc2626'
                      }}>
                        {m.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-info"
                          style={{ padding: '5px 10px', fontSize: '11px' }}
                          onClick={() => openEdit(m)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '11px' }}
                          onClick={() => toggleAvailability(m)}
                        >
                          {m.is_available ? '🚫 Disable' : '✅ Enable'}
                        </button>
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
              <h3>{editingId ? '✏️ Edit Menu Item' : '➕ New Menu Item'}</h3>
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

              <div className="form-group">
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Main">Main</option>
                  <option value="Starter">Starter</option>
                  <option value="Drink">Drink</option>
                  <option value="Dessert">Dessert</option>
                </select>
              </div>

              <div className="form-group">
                <label>Price (৳) *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-cta" style={{ flex: 1 }}>
                  ✅ {editingId ? 'Update' : 'Create'}
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