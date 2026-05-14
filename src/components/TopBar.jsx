import React from 'react';
import { Link } from 'react-router-dom';

const TopBar = ({ token, logout, onPostItem, searchTerm, onSearchChange }) => {
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
            <button onClick={logout} className="btn-outline-gold">Logout</button>
          </>
        )}
      </div>
    </header>
  );
};

export default TopBar;
