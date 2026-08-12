import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    setLoading(true);
    API.get('/api/notifications')
      .then(r => setNotifications(r.data))
      .catch(() => toast.error('নোটিফিকেশন লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id) => {
    try {
      await API.put(`/api/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      toast.error('আপডেট ব্যর্থ হয়েছে');
    }
  };

  const categoryIcon = {
    order: '🍽️',
    delivery: '🛵',
    booking: '🛏️',
    system: '⚙️',
    general: '🔔',
  };

  return (
    <div>
      <div className="page-header">
        <h2>🔔 Notifications</h2>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            ⏳ Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            কোনো নোটিফিকেশন নেই
          </div>
        ) : (
          <div>
            {notifications.map(n => (
              <div
                key={n.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
                  background: n.is_read ? 'white' : '#fffbeb'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '20px' }}>{categoryIcon[n.category] || '🔔'}</span>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{n.title}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{n.message}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                {!n.is_read && (
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={() => markRead(n.id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}