import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Sidebar = ({ filters, onFilterChange }) => {
  const [games, setGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isAdmin] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      return user?.role === 'admin';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetchGames();
    fetchCategories();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await axios.get('/api/admin/games');
      if (res.data.length > 0) {
        setGames(res.data.map(g => g.name));
      } else {
        // Fallback
        setGames(["Counter Strike 2", "Roblox", "Dota 2", "Warframe"]);
      }
    } catch (err) {
      console.error("Failed to fetch games:", err);
      setGames(["Counter Strike 2", "Roblox", "Dota 2", "Warframe"]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/admin/categories');
      if (res.data.length > 0) {
        setCategories(res.data.map(c => c.name));
      } else {
        // Fallback
        setCategories(["Skins", "Cosmetics", "Weapons", "Mounts", "Limiteds"]);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setCategories(["Skins", "Cosmetics", "Weapons", "Mounts", "Limiteds"]);
    }
  };

  const handleGameChange = (game) => {
    const newGames = filters.games.includes(game)
      ? filters.games.filter(g => g !== game)
      : [...filters.games, game];
    onFilterChange({ ...filters, games: newGames });
  };

  const handleCategoryChange = (category) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: newCategories });
  };

  // Get relevant categories based on selected games
  // For now, we'll just show all categories if any game is selected, 
  // or we could filter them if we had a mapping.
  const availableCategories = categories;

  return (
    <aside className="sidebar">
      <div className="filter-group">
        <h3>Game Selector</h3>
        {games.map(game => (
          <div key={game} className="filter-option">
            <input 
              type="checkbox" 
              id={game} 
              checked={filters.games.includes(game)}
              onChange={() => handleGameChange(game)}
            />
            <label htmlFor={game}>{game}</label>
          </div>
        ))}
      </div>

      {filters.games.length > 0 && (
        <div className="filter-group">
          <h3>Item Categories</h3>
          {availableCategories.map(cat => (
            <div key={cat} className="filter-option">
              <input 
                type="checkbox" 
                id={cat} 
                checked={filters.categories.includes(cat)}
                onChange={() => handleCategoryChange(cat)}
              />
              <label htmlFor={cat}>{cat}</label>
            </div>
          ))}
        </div>
      )}


      <div className="filter-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>Value Range</h3>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '8px', color: 'var(--gold)', fontSize: '0.8rem' }}>$</span>
            <input 
              type="number" 
              value={filters.valueRange[1]} 
              onChange={(e) => onFilterChange({ ...filters, valueRange: [0, Math.max(0, parseInt(e.target.value) || 0)] })}
              style={{ 
                width: '80px', 
                padding: '4px 4px 4px 18px', 
                backgroundColor: 'var(--black)', 
                border: '1px solid var(--gold)', 
                color: 'white', 
                borderRadius: '4px',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
        <input 
          type="range" 
          min="0" 
          max="5000" 
          step="50"
          value={Math.min(5000, filters.valueRange[1])} 
          onChange={(e) => onFilterChange({ ...filters, valueRange: [0, parseInt(e.target.value)] })}
          className="value-slider" 
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-gray)', fontSize: '0.8rem', marginBottom: '15px' }}>
          <span>$0</span>
          <span>$5000+</span>
        </div>

        {/* Currency Conversion Display */}
        <div className="currency-converter" style={{ 
          backgroundColor: 'rgba(212, 175, 55, 0.05)', 
          padding: '12px', 
          borderRadius: '8px', 
          border: '1px solid rgba(212, 175, 55, 0.2)' 
        }}>
          <h4 style={{ fontSize: '0.75rem', color: 'var(--gold)', marginBottom: '8px', textTransform: 'uppercase' }}>Estimated Conversion</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-gray)' }}>₱ Pesos (PHP)</span>
              <span className="gold-glow">₱{(filters.valueRange[1] * 56.5).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-gray)' }}>€ Euro (EUR)</span>
              <span className="gold-glow">€{(filters.valueRange[1] * 0.93).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-gray)' }}>¥ Yen (JPY)</span>
              <span className="gold-glow">¥{(filters.valueRange[1] * 155.8).toLocaleString()}</span>
            </div>
          </div>
          <p style={{ fontSize: '0.65rem', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>* Rates are estimates based on market average.</p>
        </div>
      </div>
      {isAdmin && (
        <div className="filter-group" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #333' }}>
          <Link to="/admin" style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gold)', 
            textDecoration: 'none', fontSize: '0.9rem', opacity: 0.7 
          }}>
            Admin Panel
          </Link>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
