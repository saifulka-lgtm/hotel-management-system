import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/api/payments')
      .then(r => setPayments(r.data))
      .catch(() => toast.error('পেমেন্ট লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = {
    Paid:    { bg: '#dcfce7', color: '#16a34a' },
    Partial: { bg: '#fef9c3', color: '#ca8a04' },
    Due:     { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div>
      <div className="page-header">
        <h2>💳 Payments</h2>
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
                  <th>Booking</th>
                  <th>Paid Amount</th>
                  <th>Due Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No payments found
                    </td>
                  </tr>
                ) : payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '700' }}>#{p.id}</td>
                    <td>Booking #{p.booking_id}</td>
                    <td style={{ color: '#1F3A5F', fontWeight: '600' }}>৳{p.paid_amount?.toLocaleString()}</td>
                    <td>৳{p.due_amount?.toLocaleString()}</td>
                    <td>{p.payment_method || '—'}</td>
                    <td>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px',
                        fontSize: '12px', fontWeight: '600',
                        background: statusColor[p.payment_status]?.bg || '#f1f5f9',
                        color: statusColor[p.payment_status]?.color || '#64748b'
                      }}>
                        {p.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}