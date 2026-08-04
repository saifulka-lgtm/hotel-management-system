import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';

export default function ProtectedRoute() {
  const { admin, loading } = useAuth();

  if (loading) return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      alignItems: 'center', height: '100vh',
      fontSize: '18px', color: '#c8973a'
    }}>
      ⏳ Loading...
    </div>
  );

  if (!admin) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '24px', background: '#f1f5f9' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}