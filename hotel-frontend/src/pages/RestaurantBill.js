import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function RestaurantBill() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/api/restaurant/orders/${id}`)
      .then(r => setOrder(r.data))
      .catch(() => toast.error('অর্ডার তথ্য লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>⏳ Loading...</div>;
  }

  if (!order) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Order পাওয়া যায়নি</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>🧾 Restaurant Bill</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/restaurant')}>
            ← Back
          </button>
          <button className="btn btn-cta" onClick={() => window.print()}>
            🖨️ Print
          </button>
        </div>
      </div>

      <div id="invoice-print" className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          borderBottom: '3px solid #1F3A5F', paddingBottom: '16px', marginBottom: '20px'
        }}>
          <img src="/logo.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1F3A5F' }}>
              Enterprise Hospitality Platform
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Restaurant Bill</div>
          </div>
        </div>

        {/* Order Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
          <span>Order #{order.id}</span>
          <span>{new Date(order.created_at).toLocaleString()}</span>
        </div>
        <div style={{ marginBottom: '16px', fontSize: '13px' }}>
          <div>Table: <strong>{order.table_id ? `T-${order.table_id}` : 'Takeaway'}</strong></div>
          <div>Customer: <strong>{order.customer_name || 'Guest'}</strong></div>
        </div>

        {/* Items */}
        <table style={{ marginBottom: '16px' }}>
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>৳{item.subtotal?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div style={{
          borderTop: '2px solid #1F3A5F', paddingTop: '12px',
          display: 'flex', justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '16px', fontWeight: '700' }}>Total</span>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#FF2147' }}>
            ৳{order.total_amount?.toLocaleString()}
          </span>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
          Thank you for dining with us!
        </div>
      </div>
    </div>
  );
}