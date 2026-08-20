import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const menu = [
  { path: '/dashboard',  icon: '📊', label: 'Dashboard'  },
  { path: '/rooms',      icon: '🛏️', label: 'Rooms'      },
  { path: '/bookings',   icon: '📋', label: 'Bookings'   },
  { path: '/restaurant', icon: '🍽️', label: 'Restaurant' },
  { path: '/delivery',   icon: '🛵', label: 'Delivery'   },
  { path: '/customers',  icon: '👥', label: 'Customers'  },
  { path: '/payments',   icon: '💳', label: 'Payments'   },
  { path: '/reports',    icon: '📈', label: 'Reports'    },
  { path: '/notifications', icon: '🔔', label: 'Notifications' },
  { path: '/housekeeping', icon: '🧹', label: 'Housekeeping' },
  { path: '/menu', icon: '🍲', label: 'Menu' },
  { path: '/waiter-assignments', icon: '🧑‍🍳', label: 'Waiter Duty' },
  { path: '/employees', icon: '👥', label: 'Staff & Roles' },
  { path: '/inventory', icon: '📦', label: 'Inventory' },
];

export default function Sidebar() {
  const { logout, admin } = useAuth();

  return (
    <div style={{
      width: '240px', minHeight: '100vh',
      background: '#1F3A5F', color: 'white',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh'
    }}>

      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#FF2147' }}>
          🏨 Enterprise Hospitality Platform
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
          Management System
        </div>
      </div>

      {/* Menu */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {menu.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '8px',
              marginBottom: '4px', textDecoration: 'none',
              fontSize: '14px', fontWeight: '500',
              background: isActive ? '#FF2147' : 'transparent',
              color: isActive ? 'white' : '#cbd5e1',
              transition: 'all 0.2s',
            })}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>
          👤 {admin?.username}
        </div>
        <button
          onClick={logout}
          className="btn btn-danger"
          style={{ width: '100%', fontSize: '13px' }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}