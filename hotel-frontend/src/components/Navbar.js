import { useLocation } from 'react-router-dom';
import { useState } from 'react';

const titles = {
  '/dashboard': { icon: '📊', title: 'Dashboard'                    },
  '/rooms':     { icon: '🛏️', title: 'Rooms'                        },
  '/bookings':  { icon: '📋', title: 'Bookings'                     },
  '/customers': { icon: '👥', title: 'Customers'                    },
  '/payments':  { icon: '💳', title: 'Payments'                     },
  '/reports':   { icon: '📈', title: 'Financial Reports'            },
};

export default function Navbar() {
  const { pathname }   = useLocation();
  const [showNotif, setShowNotif] = useState(false);
  const page = titles[pathname] || { icon: '🏨', title: 'Enterprise Hospitality Platform' };

  const now = new Date().toLocaleString('en-BD', {
    dateStyle: 'medium', timeStyle: 'short'
  });

  const notifications = [
    { id:1, text:'New booking received — Room 102', time:'2 min ago',   color:'#22c55e' },
    { id:2, text:'Guest checkout pending — Room 101', time:'1 hour ago', color:'#f59e0b' },
    { id:3, text:'Payment due — Booking #3',          time:'3 hours ago',color:'#ef4444' },
  ];

  return (
    <div style={{
      background: 'white', padding: '0 24px', height: '60px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>

      {/* Page Title */}
      <h1 style={{
        fontSize: '18px', fontWeight: '700', color: '#1e293b',
        display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <span>{page.icon}</span>
        <span>{page.title}</span>
      </h1>

      {/* Right Side */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>

        {/* Date/Time */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', color: '#64748b',
          background: '#f8fafc', padding: '6px 12px',
          borderRadius: '20px', border: '1px solid #e2e8f0'
        }}>
          <span>📍</span>
          <span>Bangladesh · {now}</span>
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
            <span style={{
              position: 'absolute', top: '-2px', right: '-2px',
              width: '16px', height: '16px',
              background: '#ef4444', borderRadius: '50%',
              fontSize: '9px', color: 'white',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: '700',
              border: '2px solid white'
            }}>
              {notifications.length}
            </span>
          </button>

          {/* Dropdown */}
          {showNotif && (
            <div style={{
              position: 'absolute', right: 0, top: '44px',
              width: '300px', background: 'white',
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
                <span
                  style={{ fontSize:'11px', color:'#c8973a', cursor:'pointer', fontWeight:'600' }}
                  onClick={() => setShowNotif(false)}
                >
                  Mark all read
                </span>
              </div>

              {notifications.map(n => (
                <div key={n.id} style={{
                  padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                  display: 'flex', alignItems: 'flex-start', gap: '10px'
                }}>
                  <div style={{
                    width: '8px', height: '8px', background: n.color,
                    borderRadius: '50%', marginTop: '5px', flexShrink: 0
                  }} />
                  <div>
                    <div style={{ fontSize:'13px', color:'#1e293b', lineHeight:'1.4' }}>
                      {n.text}
                    </div>
                    <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'2px' }}>
                      {n.time}
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