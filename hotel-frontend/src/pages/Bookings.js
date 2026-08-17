import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [filter,   setFilter]   = useState('All');
  const [search,   setSearch]   = useState('');
  const [form, setForm] = useState({
    customer_id: '', room_id: '',
    checkin_date: '', checkout_date: '',
    new_customer_name: '', new_customer_phone: ''
  });
  const [customers, setCustomers] = useState([]);
  const [rooms,     setRooms]     = useState([]);

  const fetchBookings = () => {
    setLoading(true);
    API.get('/api/bookings')
      .then(r => setBookings(r.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  };

  const fetchCustomers = () => {
    API.get('/api/customers').then(r => setCustomers(r.data)).catch(() => {});
  };

  useEffect(() => {
    fetchBookings();
    fetchCustomers();
    API.get('/api/rooms').then(r => setRooms(r.data)).catch(() => {});
  }, []);

  const resetForm = () => {
    setForm({ customer_id:'', room_id:'', checkin_date:'', checkout_date:'', new_customer_name:'', new_customer_phone:'' });
    setIsNewCustomer(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let customerId = form.customer_id;

      if (isNewCustomer) {
        if (!form.new_customer_name || !form.new_customer_phone) {
          toast.error('Customer name and phone are required');
          return;
        }
        const custRes = await API.post('/api/customers', {
          full_name: form.new_customer_name,
          phone: form.new_customer_phone
        });
        customerId = custRes.data.id;
      } else if (!form.customer_id) {
        toast.error('Please select a customer');
        return;
      }

      await API.post('/api/bookings', {
        customer_id: parseInt(customerId),
        room_id:     parseInt(form.room_id),
        checkin_date: form.checkin_date,
        checkout_date: form.checkout_date
      });
      toast.success('Booking created successfully!');
      setShowModal(false);
      resetForm();
      fetchBookings();
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create booking');
    }
  };

  const handleCheckin = async (id) => {
    try {
      await API.put(`/api/bookings/${id}/checkin`);
      toast.success(`Booking #${id} checked in!`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-in failed');
    }
  };

  const handleCheckout = async (id) => {
    const paid = window.prompt('Enter paid amount (৳):');
    if (paid === null) return;
    const method = window.prompt('Payment method (Cash/Card/bKash/Nagad):', 'Cash');
    if (method === null) return;
    try {
      await API.put(`/api/bookings/${id}/checkout`, {
        paid_amount: parseFloat(paid) || 0,
        payment_method: method || 'Cash'
      });
      toast.success(`Booking #${id} checked out!`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-out failed');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm(`Cancel Booking #${id}?`)) return;
    try {
      await API.put(`/api/bookings/${id}/cancel`);
      toast.success(`Booking #${id} cancelled!`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cancel failed');
    }
  };

  const statusColor = {
    Pending:   { bg:'#fef9c3', color:'#ca8a04' },
    Confirmed: { bg:'#dcfce7', color:'#16a34a' },
    Completed: { bg:'#dbeafe', color:'#2563eb' },
    Cancelled: { bg:'#fee2e2', color:'#dc2626' },
  };

  const filtered = bookings.filter(b => {
    const matchFilter = filter === 'All' || b.status === filter;
    const matchSearch = search === '' ||
      b.customer?.toLowerCase().includes(search.toLowerCase()) ||
      b.room?.toString().includes(search) ||
      b.id?.toString().includes(search);
    return matchFilter && matchSearch;
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h2>📋 Bookings</h2>
        <button className="btn btn-cta" onClick={() => setShowModal(true)}>
          ➕ New Booking
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'24px' }}>
        {[
          { label:'Total',     value: bookings.length,                                       color:'#3b82f6' },
          { label:'Confirmed', value: bookings.filter(b=>b.status==='Confirmed').length,     color:'#22c55e' },
          { label:'Completed', value: bookings.filter(b=>b.status==='Completed').length,     color:'#6366f1' },
          { label:'Cancelled', value: bookings.filter(b=>b.status==='Cancelled').length,     color:'#ef4444' },
        ].map(s => (
          <div key={s.label} className="card" style={{ borderLeft:`4px solid ${s.color}`, padding:'16px' }}>
            <div style={{ fontSize:'24px', fontWeight:'700', color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'13px', color:'#64748b' }}>{s.label} Bookings</div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="card" style={{ marginBottom:'16px' }}>
        <div style={{ display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap' }}>
          <input
            className="search-box"
            placeholder="🔍 Search by customer, room, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display:'flex', gap:'8px' }}>
            {['All','Pending','Confirmed','Completed','Cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding:'8px 16px', borderRadius:'20px', border:'none',
                  cursor:'pointer', fontSize:'13px', fontWeight:'600',
                  background: filter === f ? '#1F3A5F' : '#f1f5f9',
                  color:      filter === f ? 'white'   : '#64748b',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>
            ⏳ Loading bookings...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Room</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>
                    No bookings found
                  </td>
                </tr>
              ) : filtered.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight:'700' }}>#{b.id}</td>
                  <td>{b.customer}</td>
                  <td>Room {b.room}</td>
                  <td>{b.checkin_date}</td>
                  <td>{b.checkout_date}</td>
                  <td style={{ color:'#1F3A5F', fontWeight:'600' }}>
                    ৳{b.total_amount?.toLocaleString()}
                  </td>
                  <td>
                    <span style={{
                      padding:'4px 12px', borderRadius:'20px',
                      fontSize:'12px', fontWeight:'600',
                      background: statusColor[b.status]?.bg || '#f1f5f9',
                      color:      statusColor[b.status]?.color || '#64748b'
                    }}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      {b.status === 'Pending' && (
                        <button
                          className="btn btn-success"
                          style={{ padding:'5px 10px', fontSize:'11px' }}
                          onClick={() => handleCheckin(b.id)}
                        >
                          ✅ Check-in
                        </button>
                      )}
                      {b.status === 'Confirmed' && (
                        <button
                          className="btn btn-info"
                          style={{ padding:'5px 10px', fontSize:'11px' }}
                          onClick={() => handleCheckout(b.id)}
                        >
                          🚪 Check-out
                        </button>
                      )}
                      {!['Completed','Cancelled'].includes(b.status) && (
                        <button
                          className="btn btn-danger"
                          style={{ padding:'5px 10px', fontSize:'11px' }}
                          onClick={() => handleCancel(b.id)}
                        >
                          ✕ Cancel
                        </button>
                      )}
                      {b.status === 'Completed' && (
                        <span style={{ fontSize:'12px', color:'#22c55e' }}>✅ Done</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Booking Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ New Booking</h3>
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
                    onChange={e => setForm({...form, customer_id: e.target.value})}
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
                      onChange={e => setForm({...form, new_customer_name: e.target.value})}
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={form.new_customer_phone}
                      onChange={e => setForm({...form, new_customer_phone: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Room *</label>
                <select
                  value={form.room_id}
                  onChange={e => setForm({...form, room_id: e.target.value})}
                  required
                >
                  <option value="">— Select Room —</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} — {r.room_type} · {r.ac_type} — ৳{r.price?.toLocaleString()}/night
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Check-in Date *</label>
                  <input
                    type="date"
                    min={today}
                    value={form.checkin_date}
                    onChange={e => setForm({...form, checkin_date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Check-out Date *</label>
                  <input
                    type="date"
                    min={form.checkin_date || today}
                    value={form.checkout_date}
                    onChange={e => setForm({...form, checkout_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Price Preview */}
              {form.room_id && form.checkin_date && form.checkout_date && (
                <div style={{
                  background:'#f8fafc', borderRadius:'8px',
                  padding:'12px 16px', marginBottom:'16px',
                  border:'1px solid #e2e8f0'
                }}>
                  {(() => {
                    const room   = rooms.find(r => r.id === parseInt(form.room_id));
                    const nights = Math.max(0, Math.round(
                      (new Date(form.checkout_date) - new Date(form.checkin_date)) / 86400000
                    ));
                    const total  = (room?.price || 0) * nights;
                    return (
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ color:'#64748b', fontSize:'13px' }}>
                          {nights} night{nights !== 1 ? 's' : ''} × ৳{room?.price?.toLocaleString()}
                        </span>
                        <span style={{ color:'#1F3A5F', fontWeight:'700', fontSize:'16px' }}>
                          Total: ৳{total.toLocaleString()}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ display:'flex', gap:'12px' }}>
                <button type="submit" className="btn btn-cta" style={{ flex:1 }}>
                  ✅ Confirm Booking
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex:1 }}
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