import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid,
         Tooltip, ResponsiveContainer } from 'recharts';
import API from '../api/axios';

export default function Dashboard() {
  const [stats,    setStats]    = useState(null);
  const [business, setBusiness] = useState(null);
  const [chart,    setChart]    = useState([]);
  const [recent,   setRecent]   = useState([]);

  useEffect(() => {
    API.get('/api/reports/summary').then(r => setStats(r.data));
    API.get('/api/reports/business-summary').then(r => setBusiness(r.data));
    API.get('/api/bookings').then(r => {
      const bookings = r.data.slice(0, 8);
      setRecent(bookings);
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push({
          month: d.toLocaleString('default', { month: 'short' }),
          revenue: Math.random() * 50000
        });
      }
      setChart(months);
    });
  }, []);

  const statCards = [
    { label: 'Total Rooms',    value: stats?.total_rooms,    color: '#3b82f6', icon: '🛏️' },
    { label: 'Available',      value: stats?.available_rooms, color: '#22c55e', icon: '✅' },
    { label: 'Occupied',       value: stats?.occupied_rooms,  color: '#ef4444', icon: '🔴' },
    { label: 'Total Customers',value: stats?.total_customers, color: '#f59e0b', icon: '👥' },
  ];

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: s.color }}>
              {s.value ?? '...'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Business Overview — Cross-module */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>🏢 Business Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #1F3A5F' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>🛏️ Hotel Revenue</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F3A5F' }}>
              ৳{business?.hotel_revenue?.toLocaleString() ?? '...'}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #1F3A5F' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>🍽️ Restaurant Revenue</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F3A5F' }}>
              ৳{business?.restaurant_revenue?.toLocaleString() ?? '...'}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {business?.restaurant_orders_count ?? 0} orders total · {business?.pending_restaurant_orders ?? 0} pending
            </div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #1F3A5F' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>🛵 Delivery Revenue</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F3A5F' }}>
              ৳{business?.delivery_revenue?.toLocaleString() ?? '...'}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {business?.delivery_orders_count ?? 0} orders total · {business?.pending_delivery_orders ?? 0} pending
            </div>
          </div>
        </div>
        <div style={{
          marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Combined Total Revenue</span>
          <span style={{ fontSize: '26px', fontWeight: '700', color: '#FF2147' }}>
            ৳{business?.total_revenue?.toLocaleString() ?? '...'}
          </span>
        </div>
      </div>

      {/* Revenue Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>💰 Hotel Revenue</h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Today</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F3A5F' }}>
              ৳{stats?.daily_revenue?.toLocaleString() ?? 0}
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
          <div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>This Month</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F3A5F' }}>
              ৳{stats?.monthly_revenue?.toLocaleString() ?? 0}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>📈 Revenue Chart</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue"
                    stroke="#1F3A5F" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>📋 Recent Bookings</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Customer</th><th>Room</th>
              <th>Check-in</th><th>Check-out</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(b => (
              <tr key={b.id}>
                <td>#{b.id}</td>
                <td>{b.customer}</td>
                <td>Room {b.room}</td>
                <td>{b.checkin_date}</td>
                <td>{b.checkout_date}</td>
                <td>
                  <span className={`badge ${
                    b.status === 'Confirmed' ? 'badge-success' :
                    b.status === 'Completed' ? 'badge-info'    :
                    b.status === 'Cancelled' ? 'badge-danger'  : 'badge-warning'
                  }`}>{b.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}