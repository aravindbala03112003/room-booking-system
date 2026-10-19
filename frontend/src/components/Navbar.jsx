import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Hotel, LogOut, Calendar, ShieldCheck, PlusCircle, Compass } from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo" id="nav-brand">
          <Hotel className="brand-icon" size={28} />
          <span>Aura Haven Hotel</span>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end>
            <Compass size={18} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
            Rooms
          </NavLink>

          {/* User Links */}
          {isAuthenticated && (
            <NavLink to="/my-bookings" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <Calendar size={18} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
              My Bookings
            </NavLink>
          )}

          {/* Admin Links */}
          {isAdmin && (
            <>
              <NavLink to="/admin/rooms" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                <PlusCircle size={18} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                Manage Rooms
              </NavLink>
              <NavLink to="/admin/bookings" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                <ShieldCheck size={18} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                All Bookings
              </NavLink>
            </>
          )}
        </nav>

        {/* Auth Section */}
        <div className="nav-auth">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`badge-role ${user.role}`}>
                {user.role}
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm"
                title="Log Out"
                id="btn-logout"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-outline btn-sm" id="btn-nav-login">
                Log In
              </Link>
              <Link to="/signup" className="btn btn-accent btn-sm" id="btn-nav-signup">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
