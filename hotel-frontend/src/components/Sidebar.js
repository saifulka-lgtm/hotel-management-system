import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const menuGroups = [
  {
    label: 'MAIN',
    items: [
      { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    label: 'HOTEL',
    items: [
      { path: '/rooms',       icon: '🛏️', label: 'Rooms' },
      { path: '/bookings',    icon: '📋', label: 'Bookings' },
      { path: '/customers',   icon: '👥', label: 'Customers' },
      { path: '/housekeeping',icon: '🧹', label: 'Housekeeping' },
      { path: '/service-requests', icon: '🛎️', label: 'Service Requests' },
    ],
  },
  {
    label: 'RESTAURANT',
    items: [
      { path: '/restaurant',      icon: '🍽️', label: 'Orders' },
      { path: '/menu',            icon: '🍲', label: 'Menu' },
      { path: '/waiter-assignments', icon: '🧑‍🍳', label: 'Waiter Duty' },
    ],
  },
  {
    label: 'DELIVERY',
    items: [
      { path: '/delivery', icon: '🛵', label: 'Delivery' },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { path: '/employees', icon: '👤', label: 'Staff & Roles' },
      { path: '/inventory', icon: '📦', label: 'Inventory' },
      { path: '/payments',  icon: '💳', label: 'Payments' },
      { path: '/reports',   icon: '📈', label: 'Reports' },
    ],
  },
];

export default function Sidebar() {
  const { logout, admin } = useAuth();

  return (
    <div style={{
      width: '240px', minHeight: '100vh',
      background: '#1F3A5F', color: 'white',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      overflowY: 'auto'
    }}>

      {/* ── Logo ── */}
<div style={{
  padding: '18px 16px',
  borderBottom: '1px solid #f1f5f9',
  flexShrink: 0
}}>
  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
    <img
      src="/logo.png"
      alt="Logo"
      style={{
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0
      }}
    />
    <div style={{ overflow:'hidden' }}>
      <div style={{
        fontSize: '13px', fontWeight: '700',
        color: '#e8193c', lineHeight: '1.3',
        whiteSpace: 'nowrap'
      }}>
        Smart Hotel BD
      </div>
      <div style={{ fontSize:'10px', color:'#94a3b8' }}>
        Management System
      </div>
    </div>
  </div>
</div>

      {/* Menu — grouped */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {menuGroups.map(group => (
          <div key={group.label} style={{ marginBottom: '14px' }}>
            <div style={{
              fontSize: '10px', fontWeight: '700', color: '#64748b',
              letterSpacing: '0.8px', padding: '0 10px 6px'
            }}>
              {group.label}
            </div>
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px',
                  marginBottom: '2px', textDecoration: 'none',
                  fontSize: '13px', fontWeight: '500',
                  background: isActive ? '#FF2147' : 'transparent',
                  color: isActive ? 'white' : '#cbd5e1',
                  transition: 'all 0.2s',
                })}
              >
                <span style={{ fontSize: '15px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
          👤 {admin?.username}
        </div>
        <button
          onClick={logout}
          className="btn btn-danger"
          style={{ width: '100%', fontSize: '12px', padding: '8px' }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}