import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';

export default function Admin() {
  const [token] = useState(localStorage.getItem("token"));
  const [stats, setStats] = useState({ users: 0, items: 0, trades: 0 });
  const [games, setGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [ticketOverview, setTicketOverview] = useState({
    active: [],
    verificationQueue: [],
    completed: [],
    cancelled: []
  });
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [gameForm, setGameForm] = useState({ name: '', category: '', image_url: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '' });

  useEffect(() => {
    fetchStats();
    fetchGames();
    fetchCategories();
    fetchRecentTrades();
    fetchTicketOverview();
  }, []);

  const fetchRecentTrades = async () => {
    try {
      const res = await axios.get('/api/trades/reports');
      setRecentTrades(res.data.recentActivity || []);
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchTicketOverview = async () => {
    try {
      const res = await axios.get('/api/tickets/admin/overview');
      setTicketOverview(res.data);
    } catch (err) {
      console.error("Failed to fetch ticket overview:", err);
    }
  };

  const fetchGames = async () => {
    try {
      const res = await axios.get('/api/admin/games');
      setGames(res.data);
    } catch (err) {
      console.error("Failed to fetch games:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/admin/categories');
      setCategories(res.data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const handleAddGame = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/games', gameForm);
      alert("Game added!");
      setGameForm({ name: '', category: '', image_url: '' });
      fetchGames();
    } catch (err) {
      alert("Failed to add game");
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/categories', categoryForm);
      alert("Category added!");
      setCategoryForm({ name: '' });
      fetchCategories();
    } catch (err) {
      alert("Failed to add category");
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--black)', minHeight: '100vh', color: 'white' }}>
      <TopBar token={token} />
      
      <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
        <h1 className="gold-glow" style={{ marginBottom: '30px' }}>Admin Dashboard</h1>
        
        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' 
        }}>
          {[
            { label: 'Total Users', value: stats.users },
            { label: 'Total Items', value: stats.items },
            { label: 'Total Trades', value: stats.trades }
          ].map(stat => (
            <div key={stat.label} style={{ 
              backgroundColor: 'var(--black-light)', padding: '20px', borderRadius: '15px', 
              border: '1px solid var(--gold)', textAlign: 'center'
            }}>
              <h3 style={{ color: '#888', marginBottom: '10px' }}>{stat.label}</h3>
              <h2 className="gold-glow" style={{ fontSize: '2rem' }}>{stat.value}</h2>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
          {/* Add Game Form */}
          <div style={{ 
            backgroundColor: 'var(--black-light)', padding: '30px', borderRadius: '15px', 
            border: '1px solid #333'
          }}>
            <h2 style={{ color: 'var(--gold)', marginBottom: '20px' }}>Add New Game</h2>
            <form onSubmit={handleAddGame}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Game Name</label>
                <input 
                  type="text" 
                  value={gameForm.name}
                  onChange={(e) => setGameForm({...gameForm, name: e.target.value})}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#111', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Category</label>
                <select 
                  value={gameForm.category}
                  onChange={(e) => setGameForm({...gameForm, category: e.target.value})}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#111', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => <option key={cat.category_id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Image URL</label>
                <input 
                  type="text" 
                  value={gameForm.image_url}
                  onChange={(e) => setGameForm({...gameForm, image_url: e.target.value})}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#111', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
                />
              </div>
              <button type="submit" 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  backgroundColor: 'var(--gold)', 
                  color: 'var(--black)', 
                  fontWeight: 'bold', 
                  borderRadius: '5px', 
                  cursor: 'pointer', 
                  border: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >Add Game</button>
            </form>
          </div>

          {/* Add Category Form */}
          <div style={{ 
            backgroundColor: 'var(--black-light)', padding: '30px', borderRadius: '15px', 
            border: '1px solid #333'
          }}>
            <h2 style={{ color: 'var(--gold)', marginBottom: '20px' }}>Add New Category</h2>
            <form onSubmit={handleAddCategory}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Category Name</label>
                <input 
                  type="text" 
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#111', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
                  required
                />
              </div>
              <button type="submit" 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  backgroundColor: 'var(--gold)', 
                  color: 'var(--black)', 
                  fontWeight: 'bold', 
                  borderRadius: '5px', 
                  cursor: 'pointer', 
                  border: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >Add Category</button>
            </form>

            <div style={{ marginTop: '40px' }}>
                <h3 style={{ color: 'var(--gold)', marginBottom: '15px' }}>Existing Categories</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {categories.map(cat => (
                        <span key={cat.category_id} style={{ 
                            backgroundColor: '#222', padding: '5px 12px', borderRadius: '20px', 
                            border: '1px solid #444', fontSize: '0.9rem'
                        }}>
                            {cat.name}
                        </span>
                    ))}
                </div>
            </div>
          </div>
        </div>

        {/* Games List */}
        <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            <div style={{ backgroundColor: 'var(--black-light)', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
                <h2 style={{ color: 'var(--gold)', marginBottom: '20px', fontSize: '1.2rem', textTransform: 'uppercase' }}>Recent System Activity</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recentTrades.length > 0 ? recentTrades.map(trade => (
                        <div key={trade.trade_id} style={{ 
                            fontSize: '0.8rem', padding: '10px', backgroundColor: '#111', 
                            borderLeft: '3px solid var(--gold)', display: 'flex', justifyContent: 'space-between'
                        }}>
                            <span>Trade #{trade.trade_id}: {trade.offered_item} ⇄ {trade.requested_item}</span>
                            <span style={{ color: 'var(--gold)' }}>{trade.status.toUpperCase()}</span>
                        </div>
                    )) : <p style={{ color: '#666' }}>No recent activity detected.</p>}
                </div>
            </div>

            <div style={{ backgroundColor: 'var(--black-light)', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
                <h2 style={{ color: 'var(--gold)', marginBottom: '20px', fontSize: '1.2rem', textTransform: 'uppercase' }}>Managed Games</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px' }}>
                    {games.map(game => (
                        <div key={game.game_id} style={{ 
                            backgroundColor: '#111', padding: '10px', borderRadius: '8px', border: '1px solid #222', textAlign: 'center'
                        }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</div>
                            <div style={{ fontSize: '0.6rem', color: '#666' }}>{game.category}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div style={{ marginTop: '40px', backgroundColor: 'var(--black-light)', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: 'var(--gold)', fontSize: '1.2rem', textTransform: 'uppercase' }}>Middleman Ticket Control</h2>
            <button className="btn-outline-gold" onClick={fetchTicketOverview}>Refresh Tickets</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {[
              { label: 'Active Tickets', list: ticketOverview.active },
              { label: 'Pending Verification', list: ticketOverview.verificationQueue },
              { label: 'Completed History', list: ticketOverview.completed }
            ].map(section => (
              <div key={section.label} style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', padding: '18px' }}>
                <h3 style={{ color: 'var(--gold)', fontSize: '0.95rem', marginBottom: '14px' }}>{section.label}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                  {section.list.length > 0 ? section.list.map(ticket => (
                    <a
                      key={ticket.ticket_id}
                      href={`/ticket/${ticket.ticket_code}`}
                      style={{
                        display: 'block',
                        padding: '12px',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #2d2d2d',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ color: 'var(--gold)', fontWeight: 'bold', fontSize: '0.8rem' }}>{ticket.ticket_code}</div>
                      <div style={{ color: '#ccc', fontSize: '0.75rem', marginTop: '4px' }}>
                        {ticket.creator_username || 'User A'} / {ticket.joiner_username || 'Waiting'} / {ticket.middleman_username || 'No middleman'}
                      </div>
                      <div style={{ color: '#777', fontSize: '0.7rem', marginTop: '4px' }}>{ticket.status}</div>
                    </a>
                  )) : (
                    <p style={{ color: '#666', fontSize: '0.85rem' }}>No tickets in this queue.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
