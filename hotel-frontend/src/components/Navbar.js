import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import API from '../api/axios';

const titles = {
  '/dashboard':          { icon: '📊', title: 'Dashboard' },
  '/rooms':              { icon: '🛏️', title: 'Rooms' },
  '/bookings':           { icon: '📋', title: 'Bookings' },
  '/customers':          { icon: '👥', title: 'Customers' },
  '/payments':           { icon: '💳', title: 'Payments' },
  '/reports':            { icon: '📈', title: 'Financial Reports' },
  '/housekeeping':       { icon: '🧹', title: 'Housekeeping' },
  '/service-requests':   { icon: '🛎️', title: 'Service Requests' },
  '/restaurant':         { icon: '🍽️', title: 'Restaurant Orders' },
  '/menu':               { icon: '🍲', title: 'Menu Management' },
  '/waiter-assignments': { icon: '🧑‍🍳', title: 'Waiter Duty' },
  '/delivery':           { icon: '🛵', title: 'Delivery Orders' },
  '/employees':          { icon: '👤', title: 'Staff & Roles' },
  '/inventory':          { icon: '📦', title: 'Inventory' },
  '/table-reservations': { icon: '📅', title: 'Table Reservations' },
};

export default function Navbar({ onMenuClick, showMenuButton }) {
  const { pathname } = useLocation();
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const getPage = () => {
    if (pathname.startsWith('/invoice')) {
      return { icon: 'logo', title: 'Invoice' };
    }
    return titles[pathname] || { icon: 'logo', title: 'Enterprise Hospitality Platform' };
  };
  const page = getPage();

  const now = new Date().toLocaleString('en-BD', {
    dateStyle: 'medium', timeStyle: 'short'
  });

  const fetchNotifications = () => {
    API.get('/api/notifications')
      .then(r => setNotifications(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id) => {
    try {
      await API.put(`/api/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    try {
      await Promise.all(unread.map(n => API.put(`/api/notifications/${n.id}/read`)));
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read');
    }
  };

  const categoryColor = {
    order: '#22c55e',
    delivery: '#3b82f6',
    housekeeping: '#f59e0b',
    service_request: '#8b5cf6',
    reservation: '#0ea5e9',
    general: '#64748b',
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'এইমাত্র';
    if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
    return `${Math.floor(diff / 86400)} দিন আগে`;
  };

  return (
    <div style={{
      background: 'white', padding: '0 24px', height: '60px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            style={{
              background: 'none', border: 'none', fontSize: '22px',
              cursor: 'pointer', color: '#1F3A5F', padding: '4px'
            }}
          >
            ☰
          </button>
        )}

        {/* Page Title */}
        <h1 style={{
          fontSize: '18px', fontWeight: '700', color: '#1e293b',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {page.icon === 'logo' ? (
            <img src="/logo.png" alt="Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
          ) : (
            <span>{page.icon}</span>
          )}
          <span>{page.title}</span>
        </h1>
      </div>

      {/* Right Side */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>

        {/* Date/Time */}
        <div className="navbar-date-pill" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', color: '#64748b',
          background: '#f8fafc', padding: '6px 12px',
          borderRadius: '20px', border: '1px solid #e2e8f0'
        }}>
          <span>🕐</span>
          <span>{now}</span>
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            style={{
              width: '36px', height: '36px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '16px',
              position: 'relative'
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-2px', right: '-2px',
                width: '16px', height: '16px',
                background: '#FF2147', borderRadius: '50%',
                fontSize: '9px', color: 'white',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: '700',
                border: '2px solid white'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotif && (
            <div style={{
              position: 'absolute', right: 0, top: '44px',
              width: '320px', maxHeight: '400px', overflowY: 'auto',
              background: 'white',
              borderRadius: '12px', border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontWeight:'700', fontSize:'14px', color:'#1e293b' }}>
                  🔔 Notifications
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{ fontSize:'11px', color:'#FF2147', cursor:'pointer', fontWeight:'600' }}
                    onClick={markAllRead}
                  >
                    Mark all read
                  </span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  কোনো notification নেই
                </div>
              ) : notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    background: n.is_read ? 'white' : '#fffbeb',
                    cursor: n.is_read ? 'default' : 'pointer'
                  }}
                >
                  <div style={{
                    width: '8px', height: '8px',
                    background: categoryColor[n.category] || '#64748b',
                    borderRadius: '50%', marginTop: '5px', flexShrink: 0
                  }} />
                  <div>
                    <div style={{ fontSize:'13px', fontWeight: '600', color:'#1e293b', lineHeight:'1.4' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize:'12px', color:'#64748b', lineHeight:'1.4', marginTop: '2px' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'2px' }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Online indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          fontSize: '12px', color: '#22c55e', fontWeight: '600'
        }}>
          <div style={{
            width: '8px', height: '8px', background: '#22c55e',
            borderRadius: '50%', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)'
          }} />
          Online
        </div>

      </div>
    </div>
  );
}