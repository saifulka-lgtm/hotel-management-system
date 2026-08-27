import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/api/bookings/${id}`)
      .then(r => setBooking(r.data))
      .catch(() => toast.error('বুকিং তথ্য লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>⏳ Loading...</div>;
  }

  if (!booking) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Booking পাওয়া যায়নি</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ printColorAdjust: 'exact' }}>
        <h2>🧾 Invoice</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/bookings')}>
            ← Back
          </button>
          <button className="btn btn-cta" onClick={() => window.print()}>
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="card" id="invoice-print" style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '3px solid #1F3A5F', paddingBottom: '16px', marginBottom: '24px'
        }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1F3A5F' }}>
              Enterprise Hospitality Platform
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Bangladesh</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#FF2147' }}>INVOICE</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>#{booking.id}</div>
          </div>
        </div>

        {/* Guest & Booking Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px' }}>
              BILL TO
            </div>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{booking.customer}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px' }}>
              STATUS
            </div>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
              background: booking.payment_status === 'Paid' ? '#dcfce7' : '#fef9c3',
              color: booking.payment_status === 'Paid' ? '#16a34a' : '#ca8a04'
            }}>
              {booking.payment_status || 'Due'}
            </span>
          </div>
        </div>

        {/* Room / Stay Details */}
        <table style={{ marginBottom: '24px' }}>
          <thead>
            <tr>
              <th>Description</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Room {booking.room}</td>
              <td>{booking.checkin_date}</td>
              <td>{booking.checkout_date}</td>
              <td style={{ textAlign: 'right', fontWeight: '600' }}>
                ৳{booking.total_amount?.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#64748b' }}>Total Amount</span>
            <span style={{ fontWeight: '600' }}>৳{booking.total_amount?.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#64748b' }}>Paid Amount</span>
            <span style={{ fontWeight: '600', color: '#16a34a' }}>
              ৳{booking.paid_amount?.toLocaleString()}
            </span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            paddingTop: '12px', borderTop: '2px solid #1F3A5F'
          }}>
            <span style={{ fontSize: '16px', fontWeight: '700' }}>Due Amount</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#FF2147' }}>
              ৳{booking.due_amount?.toLocaleString()}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
          Thank you for choosing Enterprise Hospitality Platform
        </div>
      </div>
    </div>
  );
}