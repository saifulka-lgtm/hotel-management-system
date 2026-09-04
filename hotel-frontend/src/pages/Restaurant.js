import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Restaurant() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    table_id: '',
    customer_name: '',
    items: []
  });

  const fetchOrders = () => {
    setLoading(true);
    API.get('/api/restaurant/orders')
      .then(r => setOrders(r.data))
      .catch(() => toast.error('অর্ডার লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  };

  const fetchTables = () => {
    API.get('/api/restaurant/tables').then(r => setTables(r.data)).catch(() => {});
  };

  useEffect(() => {
    fetchOrders();
    fetchTables();
    API.get('/api/menu').then(r => setMenu(r.data)).catch(() => {});
  }, []);

  const statusColor = {
    placed:    { bg: '#fef9c3', color: '#ca8a04' },
    preparing: { bg: '#fed7aa', color: '#ea580c' },
    ready:     { bg: '#dbeafe', color: '#2563eb' },
    served:    { bg: '#dcfce7', color: '#16a34a' },
    billed:    { bg: '#e2e8f0', color: '#475569' },
  };

  const getTableNumber = (tableId) => {
    const t = tables.find(t => t.id === tableId);
    return t ? t.table_number : '—';
  };

  const addItem = (menuItemId) => {
    setForm(prev => {
      const existing = prev.items.find(i => i.menu_item_id === menuItemId);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i =>
            i.menu_item_id === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
          )
        };
      }
      return { ...prev, items: [...prev.items, { menu_item_id: menuItemId, quantity: 1 }] };
    });
  };

  const removeItem = (menuItemId) => {
    setForm(prev => ({
      ...prev,
      items: prev.items
        .map(i => i.menu_item_id === menuItemId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0)
    }));
  };

  const calcTotal = () => {
    return form.items.reduce((sum, it) => {
      const m = menu.find(m => m.id === it.menu_item_id);
      return sum + (m ? m.price * it.quantity : 0);
    }, 0);
  };

  const resetForm = () => {
    setForm({ table_id: '', customer_name: '', items: [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) {
      toast.error('অন্তত একটি আইটেম যোগ করুন');
      return;
    }
    try {
      await API.post('/api/restaurant/orders', {
        table_id: form.table_id ? parseInt(form.table_id) : null,
        customer_name: form.customer_name,
        items: form.items
      });
      toast.success('অর্ডার তৈরি হয়েছে!');
      setShowModal(false);
      resetForm();
      fetchOrders();
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.error || 'অর্ডার তৈরি ব্যর্থ হয়েছে');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await API.put(`/api/restaurant/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order #${orderId} → ${newStatus}`);
      fetchOrders();
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.error || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে');
    }
  };

  const nextStatus = {
    placed: 'preparing',
    preparing: 'ready',
    ready: 'served',
    served: 'billed',
  };

  return (
    <div>
      <div className="page-header">
        <h2>🍽️ Restaurant Orders</h2>
        <button className="btn btn-cta" onClick={() => setShowModal(true)}>
          ➕ New Order
        </button>
      </div>

      {/* Table status overview */}
      <div className="stat-grid">
        {tables.map(t => (
          <div key={t.id} className="card" style={{
            padding: '16px',
            borderLeft: `4px solid ${t.status === 'available' ? '#22c55e' : '#ef4444'}`
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700' }}>{t.table_number}</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Capacity: {t.capacity} · {t.status}
            </div>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            ⏳ Loading orders...
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Table</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No orders yet
                    </td>
                  </tr>
                ) : orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: '700' }}>#{o.id}</td>
                    <td>{getTableNumber(o.table_id)}</td>
                    <td>{o.customer_name || '—'}</td>
                    <td>{o.items?.length || 0} item(s)</td>
                    <td style={{ color: '#1F3A5F', fontWeight: '600' }}>
                      ৳{o.total_amount?.toLocaleString()}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px',
                        fontSize: '12px', fontWeight: '600',
                        background: statusColor[o.status]?.bg || '#f1f5f9',
                        color: statusColor[o.status]?.color || '#64748b'
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      {nextStatus[o.status] && (
                        <button
                          className="btn btn-info"
                          style={{ padding: '5px 10px', fontSize: '11px' }}
                          onClick={() => handleStatusChange(o.id, nextStatus[o.status])}
                        >
                          → {nextStatus[o.status]}
                        </button>
                      )}
                      {o.status === 'billed' && (
                        <button
                          className="btn btn-info"
                          style={{ padding: '5px 10px', fontSize: '11px' }}
                          onClick={() => navigate(`/restaurant-bill/${o.id}`)}
                        >
                          🧾 Bill
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ New Restaurant Order</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Table (optional)</label>
                <select
                  value={form.table_id}
                  onChange={e => setForm({ ...form, table_id: e.target.value })}
                >
                  <option value="">— No table (takeaway) —</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.table_number} — Capacity {t.capacity} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  value={form.customer_name}
                  onChange={e => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="Guest name"
                />
              </div>

              <div className="form-group">
                <label>Menu Items *</label>
                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  {menu.map(m => {
                    const inCart = form.items.find(i => i.menu_item_id === m.id);
                    return (
                      <div key={m.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderBottom: '1px solid #f1f5f9'
                      }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>{m.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>৳{m.price}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 10px' }}
                            onClick={() => removeItem(m.id)}
                            disabled={!inCart}
                          >−</button>
                          <span style={{ minWidth: '20px', textAlign: 'center' }}>
                            {inCart ? inCart.quantity : 0}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 10px' }}
                            onClick={() => addItem(m.id)}
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {form.items.length > 0 && (
                <div style={{
                  background: '#f8fafc', borderRadius: '8px',
                  padding: '12px 16px', marginBottom: '16px',
                  border: '1px solid #e2e8f0',
                  display: 'flex', justifyContent: 'space-between'
                }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>
                    {form.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                  </span>
                  <span style={{ color: '#1F3A5F', fontWeight: '700', fontSize: '16px' }}>
                    Total: ৳{calcTotal().toLocaleString()}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-cta" style={{ flex: 1 }}>
                  ✅ Place Order
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