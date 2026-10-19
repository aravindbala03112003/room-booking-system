import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { CheckCircle2, XCircle, Ban, Shield } from 'lucide-react';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const fetchAllBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosClient.get('/bookings');
      setBookings(response.data);
    } catch (err) {
      console.error('Failed to load all bookings:', err);
      setError('Could not retrieve bookings list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBookings();
  }, []);

  const handleAdminCancelBooking = async (bookingId, userName) => {
    if (!window.confirm(`Cancel reservation #${bookingId} for guest ${userName}?`)) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await axiosClient.patch(`/bookings/${bookingId}/cancel`);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      );
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      alert(err.response?.data?.message || 'Error cancelling booking.');
    } finally {
      setCancellingId(null);
    }
  };

  // Metrics summary
  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);

  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--color-primary)' }}>
          All Guest Reservations
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Comprehensive view of all customer bookings and occupancy
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total Bookings</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
            {bookings.length}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Active / Confirmed</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem' }}>
            {confirmedCount}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Confirmed Revenue</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-accent)', marginTop: '0.25rem' }}>
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading hotel reservations...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <Shield size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">No bookings registered yet</h3>
          <p className="empty-state-text">Customer bookings will appear here in real time.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Booking #</th>
                <th>Guest</th>
                <th>Suite Reserved</th>
                <th>Dates</th>
                <th>Total</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} id={`admin-booking-row-${b.id}`}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>#{b.id}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{b.user_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{b.user_email}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.room_title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      ${parseFloat(b.price_per_night).toFixed(0)} / night
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      {b.check_in} → {b.check_out}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {b.total_nights} {b.total_nights === 1 ? 'night' : 'nights'}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      ${parseFloat(b.total_price).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-status ${b.status}`}>
                      {b.status === 'confirmed' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      <span style={{ textTransform: 'capitalize' }}>{b.status}</span>
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => handleAdminCancelBooking(b.id, b.user_name)}
                        disabled={cancellingId === b.id}
                        className="btn btn-danger-outline btn-sm"
                        id={`btn-admin-cancel-${b.id}`}
                      >
                        <Ban size={14} />
                        <span>{cancellingId === b.id ? 'Cancelling...' : 'Cancel'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
