import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Delivery() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  const [form, setForm] = useState({
    customer_id: '',
    new_customer_name: '',
    new_customer_phone: '',
    address: '',
    items: []
  });

  const fetchOrders = () => {
    setLoading(true);
    API.get('/api/delivery/orders')
      .then(r => setOrders(r.data))
      .catch(() => toast.error('অর্ডার লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  };

  const fetchCustomers = () => {
    API.get('/api/customers').then(r => setCustomers(r.data)).catch(() => {});
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    API.get('/api/menu').then(r => setMenu(r.data)).catch(() => {});
  }, []);

  const statusColor = {
    placed:           { bg: '#fef9c3', color: '#ca8a04' },
    preparing:        { bg: '#fed7aa', color: '#ea580c' },
    assigned:         { bg: '#e0e7ff', color: '#4338ca' },
    out_for_delivery: { bg: '#dbeafe', color: '#2563eb' },
    delivered:        { bg: '#dcfce7', color: '#16a34a' },
    cancelled:        { bg: '#fee2e2', color: '#dc2626' },
  };

  const nextStatus = {
    placed: 'preparing',
    preparing: 'assigned',
    assigned: 'out_for_delivery',
    out_for_delivery: 'delivered',
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
    setForm({ customer_id: '', new_customer_name: '', new_customer_phone: '', address: '', items: [] });
    setIsNewCustomer(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.address.trim()) {
      toast.error('ডেলিভারি ঠিকানা দিন');
      return;
    }
    if (form.items.length === 0) {
      toast.error('অন্তত একটি আইটেম যোগ করুন');
      return;
    }

    try {
      let customerId = form.customer_id;

      if (isNewCustomer) {
        if (!form.new_customer_name || !form.new_customer_phone) {
          toast.error('কাস্টমারের নাম ও ফোন নম্বর দিন');
          return;
        }
        const custRes = await API.post('/api/customers', {
          full_name: form.new_customer_name,
          phone: form.new_customer_phone
        });
        customerId = custRes.data.id;
      } else if (!form.customer_id) {
        toast.error('একজন কাস্টমার সিলেক্ট করুন');
        return;
      }

      await API.post('/api/delivery/orders', {
        customer_id: parseInt(customerId),
        address: form.address,
        items: form.items
      });
      toast.success('ডেলিভারি অর্ডার তৈরি হয়েছে!');
      setShowModal(false);
      resetForm();
      fetchOrders();
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'অর্ডার তৈরি ব্যর্থ হয়েছে');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await API.put(`/api/delivery/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order #${orderId} → ${newStatus}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>🛵 Delivery Orders</h2>
        <button className="btn btn-cta" onClick={() => setShowModal(true)}>
          ➕ New Delivery Order
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            ⏳ Loading orders...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Address</th>
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
                    No delivery orders yet
                  </td>
                </tr>
              ) : orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: '700' }}>#{o.id}</td>
                  <td>{o.customer_name || '—'}</td>
                  <td style={{ maxWidth: '200px', fontSize: '13px' }}>{o.address}</td>
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
                    {o.status === 'delivered' && (
                      <span style={{ fontSize: '12px', color: '#22c55e' }}>✅ Delivered</span>
                    )}
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
              <h3>➕ New Delivery Order</h3>
              <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Customer *</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1, padding: '6px', fontSize: '12px',
                      background: !isNewCustomer ? '#1F3A5F' : '#f1f5f9',
                      color: !isNewCustomer ? 'white' : '#64748b'
                    }}
                    onClick={() => setIsNewCustomer(false)}
                  >
                    Existing Customer
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1, padding: '6px', fontSize: '12px',
                      background: isNewCustomer ? '#FF2147' : '#f1f5f9',
                      color: isNewCustomer ? 'white' : '#64748b'
                    }}
                    onClick={() => setIsNewCustomer(true)}
                  >
                    + New Customer
                  </button>
                </div>

                {!isNewCustomer ? (
                  <select
                    value={form.customer_id}
                    onChange={e => setForm({ ...form, customer_id: e.target.value })}
                  >
                    <option value="">— Select Customer —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} — {c.phone}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={form.new_customer_name}
                      onChange={e => setForm({ ...form, new_customer_name: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={form.new_customer_phone}
                      onChange={e => setForm({ ...form, new_customer_phone: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Delivery Address *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="House, Road, Area, City"
                  required
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