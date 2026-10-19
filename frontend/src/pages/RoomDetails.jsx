import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import {
  Wifi,
  Tv,
  Coffee,
  Wind,
  ShieldCheck,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Users,
} from 'lucide-react';

const RoomDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Booking Form State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3);

  const [checkIn, setCheckIn] = useState(tomorrow.toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(dayAfterTomorrow.toISOString().split('T')[0]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    const fetchRoom = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get(`/rooms/${id}`);
        setRoom(response.data);
      } catch (err) {
        console.error('Error fetching room details:', err);
        setFetchError('Room not found or server error.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id]);

  // Calculate nights and total price
  const calculateTotal = () => {
    if (!checkIn || !checkOut || !room) return { nights: 0, total: 0 };
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diffTime = outDate - inDate;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights <= 0) return { nights: 0, total: 0 };
    const total = (nights * parseFloat(room.price_per_night)).toFixed(2);
    return { nights, total };
  };

  const { nights, total } = calculateTotal();

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/rooms/${id}` } });
      return;
    }

    if (nights <= 0) {
      setBookingError('Check-out date must be after check-in date.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess(null);

    try {
      const response = await axiosClient.post('/bookings', {
        room_id: parseInt(id, 10),
        check_in: checkIn,
        check_out: checkOut,
      });

      setBookingSuccess(response.data);
    } catch (err) {
      console.error('Booking failed:', err);
      const msg = err.response?.data?.message || 'Failed to complete booking. Please try different dates.';
      setBookingError(msg);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading room details...</p>
      </div>
    );
  }

  if (fetchError || !room) {
    return (
      <div className="empty-state">
        <AlertCircle size={48} className="empty-state-icon" style={{ color: 'var(--color-danger)' }} />
        <h3 className="empty-state-title">Room Not Found</h3>
        <p className="empty-state-text">
          The requested suite could not be found or may have been removed.
        </p>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft size={16} />
          Back to All Rooms
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" className="btn btn-outline btn-sm">
          <ArrowLeft size={16} />
          Back to Listings
        </Link>
      </div>

      <div className="room-details-container">
        {/* Main Content */}
        <div className="room-details-main">
          <img
            src={room.image_url}
            alt={room.title}
            className="room-details-hero-img"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80';
            }}
          />

          <div className="room-details-body">
            <h1 className="room-details-title">{room.title}</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-muted)' }}>
                <Users size={18} />
                <span>{room.total_rooms} Total Suites of this tier</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-success)', fontWeight: 600 }}>
                <ShieldCheck size={18} />
                <span>100% Verified Accommodation</span>
              </div>
            </div>

            <p style={{ fontSize: '1.05rem', color: 'var(--color-text-muted)', lineHeight: '1.8' }}>
              {room.description}
            </p>

            <h3 style={{ fontSize: '1.25rem', marginTop: '2.5rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
              Included Room Amenities
            </h3>
            <div className="room-amenities-grid">
              <div className="amenity-item">
                <Wifi size={18} color="var(--color-accent)" />
                <span>High-Speed Wi-Fi</span>
              </div>
              <div className="amenity-item">
                <Wind size={18} color="var(--color-accent)" />
                <span>Climate Control AC</span>
              </div>
              <div className="amenity-item">
                <Tv size={18} color="var(--color-accent)" />
                <span>55" 4K Smart TV</span>
              </div>
              <div className="amenity-item">
                <Coffee size={18} color="var(--color-accent)" />
                <span>Espresso Bar & Minibar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Sidebar Form */}
        <aside className="booking-card">
          <div className="booking-price-header">
            <div>
              <span className="booking-price-amount">${parseFloat(room.price_per_night).toFixed(0)}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}> / night</span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 600 }}>
              Free Cancellation
            </span>
          </div>

          {/* Success Notification */}
          {bookingSuccess && (
            <div className="alert alert-success" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <CheckCircle size={18} />
                <span>Booking Confirmed!</span>
              </div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
                Your reservation for {room.title} ({nights} nights) is locked in.
              </p>
              <Link
                to="/my-bookings"
                className="btn btn-sm btn-primary"
                style={{ marginTop: '0.75rem', width: '100%' }}
                id="btn-view-my-bookings"
              >
                View in My Bookings
              </Link>
            </div>
          )}

          {/* Error Notification */}
          {bookingError && <div className="alert alert-error">{bookingError}</div>}

          {!bookingSuccess && (
            <form onSubmit={handleBookingSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">
                  <Calendar size={15} />
                  Check-in Date
                </label>
                <input
                  type="date"
                  value={checkIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="form-input"
                  required
                  id="booking-checkin"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">
                  <Calendar size={15} />
                  Check-out Date
                </label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="form-input"
                  required
                  id="booking-checkout"
                />
              </div>

              {/* Price Breakdown Calculation */}
              {nights > 0 && (
                <div className="booking-summary-box">
                  <div className="booking-summary-row">
                    <span>
                      ${parseFloat(room.price_per_night).toFixed(0)} × {nights} {nights === 1 ? 'night' : 'nights'}
                    </span>
                    <span>${total}</span>
                  </div>
                  <div className="booking-summary-row">
                    <span>Taxes & Service Fees</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Included</span>
                  </div>
                  <div className="booking-summary-row total">
                    <span>Total Amount</span>
                    <span>${total}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={bookingLoading || nights <= 0}
                className="btn btn-accent btn-lg"
                style={{ width: '100%' }}
                id="btn-submit-booking"
              >
                {bookingLoading
                  ? 'Confirming Reservation...'
                  : !isAuthenticated
                  ? 'Log in to Reserve'
                  : 'Reserve Suite'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
                You won't be charged yet. Instant confirmation.
              </p>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
};

export default RoomDetails;
