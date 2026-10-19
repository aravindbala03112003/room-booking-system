import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Calendar, CheckCircle2, XCircle, ArrowRight, Ban } from 'lucide-react';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const fetchMyBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosClient.get('/bookings/my');
      setBookings(response.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Could not retrieve your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This will free up the room for other guests.')) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await axiosClient.patch(`/bookings/${bookingId}/cancel`);
      // Update state locally
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      );
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      alert(err.response?.data?.message || 'Could not cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--color-primary)' }}>
          My Reservations
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Review your upcoming stays and reservation history
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading your reservations...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">No bookings found</h3>
          <p className="empty-state-text">
            You haven't reserved any suites yet. Discover our collection of luxury rooms!
          </p>
          <Link to="/" className="btn btn-accent">
            <span>Browse Available Rooms</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Suite</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Duration</th>
                <th>Total Price</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} id={`booking-row-${b.id}`}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <img
                        src={b.room_image}
                        alt={b.room_title}
                        style={{ width: '56px', height: '44px', objectFit: 'cover', borderRadius: '6px' }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      <div>
                        <Link
                          to={`/rooms/${b.room_id}`}
                          style={{ fontWeight: 600, color: 'var(--color-primary)' }}
                        >
                          {b.room_title}
                        </Link>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          Booking #{b.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{b.check_in}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{b.check_out}</span>
                  </td>
                  <td>
                    {b.total_nights} {b.total_nights === 1 ? 'night' : 'nights'}
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
                        onClick={() => handleCancelBooking(b.id)}
                        disabled={cancellingId === b.id}
                        className="btn btn-danger-outline btn-sm"
                        id={`btn-cancel-booking-${b.id}`}
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

export default MyBookings;
