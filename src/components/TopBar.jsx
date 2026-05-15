import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../utils/auth';

const TopBar = ({ token, logout, onPostItem, searchTerm, onSearchChange }) => {
  const navigate = useNavigate();
  const isAdmin = (() => {
    try {
      const savedUser = localStorage.getItem('user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      return user?.role === 'admin';
    } catch {
      return false;
    }
  })();

  const handleLogout = () => {
    if (logout) {
      logout();
      return;
    }

    clearAuthSession();
    navigate('/', { replace: true });
  };

  return (
    <header className="top-bar">
      <div className="logo-container">
        <Link to="/" className="logo gold-glow" style={{ fontSize: '24px', fontWeight: 'bold' }}>
          QuickTrade
        </Link>
      </div>

      <div className="search-container">
        <input 
          type="text" 
          placeholder="Search for items, games, or traders..." 
          className="search-bar"
          value={searchTerm || ''}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>

      <div className="top-bar-right">
        {token && (
          <Link to="/tickets" className="gold-glow" style={{ fontWeight: 'bold', marginRight: '10px' }}>
            Tickets
          </Link>
        )}

        {token && isAdmin && (
          <Link to="/admin" className="gold-glow" style={{ fontWeight: 'bold', marginRight: '10px' }}>
            Admin
          </Link>
        )}

        {token && onPostItem && (
          <button onClick={onPostItem} className="btn-gold" style={{ marginRight: '10px' }}>
            + Post Item
          </button>
        )}
        
        {!token ? (
          <>
            <Link to="/login" className="btn-outline-gold">Sign In</Link>
            <Link to="/register" className="btn-gold">Register</Link>
          </>
        ) : (
          <>
            <Link to="/profile" className="gold-glow" style={{ fontWeight: 'bold' }}>Profile</Link>
            <button onClick={handleLogout} className="btn-outline-gold">Logout</button>
          </>
        )}
      </div>
    </header>
  );
};

export default TopBar;
