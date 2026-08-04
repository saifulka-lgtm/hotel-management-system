import { useLocation } from 'react-router-dom';

const titles = {
  '/dashboard': 'Dashboard',
  '/rooms':     'Rooms',
  '/bookings':  'Bookings',
  '/customers': 'Customers',
  '/payments':  'Payments',
  '/reports':   'Financial Reports',
};

export default function Navbar() {
  const { pathname } = useLocation();
  const now = new Date().toLocaleString('en-BD', {
    dateStyle: 'medium', timeStyle: 'short'
  });

  return (
    <div style={{
      background: 'white', padding: '16px 24px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }}>
      <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
        {titles[pathname] || 'Enterprise Hospitality Platform'}
      </h1>
      <div style={{ fontSize: '13px', color: '#64748b' }}>
        📍 Bangladesh · {now}
      </div>
    </div>
  );
}