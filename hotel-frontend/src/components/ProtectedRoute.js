import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';

export default function ProtectedRoute() {
  const { admin, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      alignItems: 'center', height: '100vh',
      fontSize: '18px', color: '#1F3A5F'
    }}>
      ⏳ Loading...
    </div>
  );

  if (!admin) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* Mobile overlay — sidebar খোলা থাকলে বাকি স্ক্রিন dim করে, বাইরে ক্লিক করলে বন্ধ হবে */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 150
          }}
        />
      )}

      {/* Sidebar — mobile-এ off-canvas (slide in/out), desktop-এ সবসময় visible */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (sidebarOpen ? 0 : '-240px') : 'auto',
        top: 0, height: '100vh', zIndex: 200,
        transition: 'left 0.25s ease'
      }}>
        <Sidebar onNavigate={() => isMobile && setSidebarOpen(false)} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} showMenuButton={isMobile} />
        <main style={{ flex: 1, padding: isMobile ? '14px' : '24px', background: '#f1f5f9' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}