import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    API.get('/api/customers')
      .then(r => setCustomers(r.data))
      .catch(() => toast.error('কাস্টমার লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    search === '' ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <h2>👥 Customers</h2>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <input
          className="search-box"
          placeholder="🔍 নাম বা ফোন দিয়ে খুঁজুন..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            ⏳ Loading...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Total Bookings</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No customers found
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: '700' }}>#{c.id}</td>
                  <td>{c.full_name}</td>
                  <td>{c.phone}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.total_bookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}