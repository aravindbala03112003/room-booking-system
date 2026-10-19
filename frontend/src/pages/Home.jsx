import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import RoomCard from '../components/RoomCard';
import { Search, Calendar, DollarSign, RotateCcw, Sparkles } from 'lucide-react';

const Home = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter form states
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  // Fetch rooms with current filters
  const fetchRooms = async (overrideParams = {}) => {
    setLoading(true);
    setError('');

    try {
      const params = {
        search: overrideParams.search !== undefined ? overrideParams.search : search,
        minPrice: overrideParams.minPrice !== undefined ? overrideParams.minPrice : minPrice,
        maxPrice: overrideParams.maxPrice !== undefined ? overrideParams.maxPrice : maxPrice,
        check_in: overrideParams.checkIn !== undefined ? overrideParams.checkIn : checkIn,
        check_out: overrideParams.checkOut !== undefined ? overrideParams.checkOut : checkOut,
      };

      // Remove empty parameters
      const cleanParams = {};
      Object.keys(params).forEach((key) => {
        if (params[key] && params[key].trim() !== '') {
          cleanParams[key] = params[key].trim();
        }
      });

      const response = await axiosClient.get('/rooms', { params: cleanParams });
      setRooms(response.data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      setError('Unable to load rooms. Please make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
      setError('Please provide both check-in and check-out dates to search by date.');
      return;
    }
    if (checkIn && checkOut) {
      if (new Date(checkOut) <= new Date(checkIn)) {
        setError('Check-out date must be strictly after check-in date.');
        return;
      }
    }
    fetchRooms();
  };

  const handleResetFilters = () => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setCheckIn('');
    setCheckOut('');
    fetchRooms({ search: '', minPrice: '', maxPrice: '', checkIn: '', checkOut: '' });
  };

  return (
    <div>
      {/* Hero Banner */}
      <section className="hero-section">
        <div className="hero-badge">
          <Sparkles size={16} />
          <span>Award-Winning Boutique Hospitality</span>
        </div>
        <h1 className="hero-title">Find Your Sanctuary of Serenity & Comfort</h1>
        <p className="hero-subtitle">
          Explore refined hotel suites, seaside villas, and luxury rooms designed for pure relaxation.
        </p>
      </section>

      {/* Search and Filters */}
      <div className="filter-card">
        <form onSubmit={handleFilterSubmit}>
          <div className="filter-grid">
            {/* Search input */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                <Search size={16} />
                Search Rooms
              </label>
              <input
                type="text"
                placeholder="e.g. Deluxe, Ocean, Villa, Penthouse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                id="filter-search"
              />
            </div>

            {/* Check-in Date */}
            <div className="form-group">
              <label className="form-label">
                <Calendar size={16} />
                Check-in Date
              </label>
              <input
                type="date"
                value={checkIn}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckIn(e.target.value)}
                className="form-input"
                id="filter-checkin"
              />
            </div>

            {/* Check-out Date */}
            <div className="form-group">
              <label className="form-label">
                <Calendar size={16} />
                Check-out Date
              </label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckOut(e.target.value)}
                className="form-input"
                id="filter-checkout"
              />
            </div>

            {/* Min Price */}
            <div className="form-group">
              <label className="form-label">
                <DollarSign size={16} />
                Min Price ($)
              </label>
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="form-input"
                id="filter-min-price"
              />
            </div>

            {/* Max Price */}
            <div className="form-group">
              <label className="form-label">
                <DollarSign size={16} />
                Max Price ($)
              </label>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="form-input"
                id="filter-max-price"
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-accent" style={{ flex: 1 }} id="btn-filter-submit">
                Filter
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-outline"
                title="Reset filters"
                id="btn-filter-reset"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button
            onClick={() => fetchRooms()}
            className="btn btn-outline btn-sm"
            style={{ background: '#fff', marginLeft: '1rem', whiteSpace: 'nowrap' }}
            id="btn-retry-fetch-rooms"
          >
            Retry
          </button>
        </div>
      )}

      {/* Rooms Listing */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
            Loading available rooms...
          </p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={48} />
          </div>
          <h3 className="empty-state-title">No rooms match your criteria</h3>
          <p className="empty-state-text">
            Try adjusting your dates, budget, or clearing the search query to see other available suites.
          </p>
          <button onClick={handleResetFilters} className="btn btn-outline">
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
