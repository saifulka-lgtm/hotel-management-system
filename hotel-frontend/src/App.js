import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Rooms         from './pages/Rooms';
import Bookings      from './pages/Bookings';
import Restaurant    from './pages/Restaurant';
import Delivery      from './pages/Delivery';
import Notifications from './pages/Notifications';
import Customers     from './pages/Customers';
import Payments      from './pages/Payments';
import Reports       from './pages/Reports';
import Housekeeping from './pages/Housekeeping';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route index               element={<Navigate to="/dashboard" />} />
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="rooms"        element={<Rooms />} />
            <Route path="bookings"     element={<Bookings />} />
            <Route path="restaurant"   element={<Restaurant />} />
            <Route path="delivery"     element={<Delivery />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="customers"    element={<Customers />} />
            <Route path="payments"     element={<Payments />} />
            <Route path="reports"      element={<Reports />} />
            <Route path="housekeeping" element={<Housekeeping />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}