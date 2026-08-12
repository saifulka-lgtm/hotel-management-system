import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/api/reports/summary'),
      API.get('/api/reports/business-summary')
    ])
      .then(([a, b]) => { setSummary(a.data); setBusiness(b.data); })
      .catch(() => toast.error('রিপোর্ট লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>⏳ Loading reports...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>📈 Reports</h2>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>🏢 Business Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #1F3A5F' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>🛏️ Hotel Revenue</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1F3A5F' }}>
              ৳{business?.hotel_revenue?.toLocaleString() ?? 0}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #1F3A5F' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>🍽️ Restaurant Revenue</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1F3A5F' }}>
              ৳{business?.restaurant_revenue?.toLocaleString() ?? 0}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #1F3A5F' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>🛵 Delivery Revenue</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1F3A5F' }}>
              ৳{business?.delivery_revenue?.toLocaleString() ?? 0}
            </div>
          </div>
        </div>
        <div style={{
          marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Combined Total Revenue</span>
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#FF2147' }}>
            ৳{business?.total_revenue?.toLocaleString() ?? 0}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
        <div className="card">
          <div style={{ fontSize: '13px', color: '#64748b' }}>Total Rooms</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{summary?.total_rooms}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '13px', color: '#64748b' }}>Total Customers</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{summary?.total_customers}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '13px', color: '#64748b' }}>Paid Bookings</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>{summary?.paid_bookings}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '13px', color: '#64748b' }}>Due Bookings</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{summary?.due_bookings}</div>
        </div>
      </div>
    </div>
  );
}