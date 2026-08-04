import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid,
         Tooltip, ResponsiveContainer } from 'recharts';
import API from '../api/axios';

export default function Dashboard() {
  const [stats,  setStats]  = useState(null);
  const [chart,  setChart]  = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    API.get('/api/reports/summary').then(r => setStats(r.data));
    API.get('/api/bookings').then(r => {
      const bookings = r.data.slice(0, 8);
      setRecent(bookings);
      // Build chart data from last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push({
          month: d.toLocaleString('default', { month: 'short' }),
          revenue: Math.random() * 50000  // replace with real API data
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

      {/* Revenue Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>💰 Revenue</h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Today</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#c8973a' }}>
              ৳{stats?.daily_revenue?.toLocaleString() ?? 0}
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
          <div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>This Month</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#c8973a' }}>
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
                    stroke="#c8973a" strokeWidth={2} dot={false} />
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