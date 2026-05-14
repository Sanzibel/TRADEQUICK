import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './profile.css';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';
import ItemCard from '../components/ItemCard';
import ChatBox from '../components/ChatBox';

export default function Profile() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [user] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'favorites';
  });
  
  const [favorites, setFavorites] = useState([]);
  const [listings, setListings] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (activeTab === 'favorites') fetchFavorites();
      if (activeTab === 'listings') fetchListings();
      if (activeTab === 'history') fetchTrades();
    }
  }, [user, activeTab]);

  const fetchTrades = async () => {
     setLoading(true);
     const userId = user.user_id || user.id;
     try {
       const res = await axios.get(`/api/trades/user/${userId}`);
       setTrades(res.data);
     } catch (err) {
       console.error("Failed to fetch trades:", err);
     } finally {
       setLoading(false);
     }
   };

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/items/bookmarks/${user.user_id}`);
      setFavorites(res.data.map(item => ({
        id: item.post_id,
        name: item.name,
        game: item.game,
        value: item.value,
        image: item.screenshot_url || "https://via.placeholder.com/150"
      })));
    } catch (err) {
      console.error("Failed to fetch favorites:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    if (!user || (!user.user_id && !user.id)) return;
    
    setLoading(true);
    const userId = user.user_id || user.id;
    try {
      const res = await axios.get(`/api/items/listings/${userId}`);
      
      if (Array.isArray(res.data)) {
        setListings(res.data.map(item => ({
          id: item.post_id,
          name: item.name,
          game: item.game,
          value: Number(item.value),
          image: item.screenshot_url || "https://via.placeholder.com/150",
          created_at: item.created_at
        })));
      }
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookmark = async (itemId) => {
    try {
      await axios.post("/api/items/bookmark", {
        user_id: user.user_id,
        post_id: itemId
      });
      fetchFavorites(); // Refresh list
    } catch (err) {
      console.error("Bookmark toggle error:", err);
    }
  };

  const handleDeleteListing = async (postId) => {
    if (!window.confirm("Are you sure you want to remove this listing?")) return;
    
    try {
      await axios.delete(`/api/items/listings/${postId}`, {
        data: { user_id: user.user_id }
      });
      fetchListings(); // Refresh list
      alert("Listing removed!");
    } catch (err) {
      console.error("Delete listing error:", err);
      alert("Failed to remove listing.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    window.location.href = "/";
  };

  if (!user) {
    return (
      <div className="profile-container">
        <TopBar token={token} logout={logout} />
        <main className="profile-content" style={{ textAlign: 'center', padding: '100px' }}>
          <h2>Please log in to view your profile.</h2>
          <a href="/login" className="btn-gold" style={{ display: 'inline-block', marginTop: '20px' }}>Login</a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="profile-container">
      <TopBar token={token} logout={logout} />
      
      <main className="profile-content">
        <div className="profile-header">
          <div className="profile-info">
            <div className="avatar-placeholder">{user.username ? user.username[0].toUpperCase() : 'U'}</div>
            <div>
              <h2 className="gold-glow">{user.full_name || user.username}</h2>
              <p className="premium-badge">{user.premium_status ? 'Premium Member' : 'Standard Member'}</p>
            </div>
          </div>
          <div className="wallet-summary">
            <p>Balance: <span className="gold-glow">${parseFloat(user.balance).toFixed(2)}</span></p>
            <button className="btn-gold">Top Up</button>
          </div>
        </div>

        <div className="profile-tabs">
          <button 
            className={activeTab === 'favorites' ? 'active' : ''} 
            onClick={() => setActiveTab('favorites')}
          >
            My Favorites
          </button>
          <button 
            className={activeTab === 'listings' ? 'active' : ''} 
            onClick={() => setActiveTab('listings')}
          >
            My Listings
          </button>
          <button 
            className={activeTab === 'history' ? 'active' : ''} 
            onClick={() => setActiveTab('history')}
          >
            Transaction History
          </button>
          <button 
            className={activeTab === 'support' ? 'active' : ''} 
            onClick={() => setActiveTab('support')}
          >
            Help & Support
          </button>
          <button 
            className={activeTab === 'settings' ? 'active' : ''} 
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'favorites' && (
            <div className="favorites-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {loading ? (
                <p style={{ color: 'var(--gold)' }}>Loading favorites...</p>
              ) : favorites.length > 0 ? (
                favorites.map(item => (
                  <ItemCard 
                    key={item.id} 
                    item={item} 
                    isBookmarked={true}
                    onBookmark={() => handleToggleBookmark(item.id)}
                    onTrade={() => {}} // Not needed in profile view for now
                    onMessage={() => {}}
                  />
                ))
              ) : (
                <p style={{ color: 'var(--text-gray)' }}>You haven't bookmarked any items yet.</p>
              )}
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="listings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '25px' }}>
              {loading ? (
                <p style={{ color: 'var(--gold)' }}>Loading your listings...</p>
              ) : listings.length > 0 ? (
                listings.map(item => (
                  <div key={item.id} className="listing-card" style={{ 
                    backgroundColor: 'var(--black)', 
                    border: '1px solid #333', 
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{ height: '150px', backgroundColor: '#111', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
                      <img src={item.image} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ padding: '15px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--gold)', textTransform: 'uppercase' }}>{item.game}</span>
                      <h4 style={{ margin: '5px 0', fontSize: '1.1rem' }}>{item.name}</h4>
                      <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>Value: ${item.value}</p>
                      <p style={{ color: '#666', fontSize: '0.7rem', marginTop: '10px' }}>Listed on: {new Date(item.created_at).toLocaleDateString()}</p>
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button 
                          className="btn-outline-gold" 
                          style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                          onClick={() => window.location.href = '/'} // Redirect to see it in market
                        >
                          View in Market
                        </button>
                        <button 
                          className="btn-gold" 
                          style={{ backgroundColor: '#ff4444', border: 'none', padding: '8px', color: 'white' }}
                          onClick={() => handleDeleteListing(item.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px' }}>
                  <p style={{ color: 'var(--text-gray)', marginBottom: '20px' }}>You don't have any active listings.</p>
                  <button className="btn-gold" onClick={() => window.location.href = '/?post=true'}>Post Your First Item</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-list" style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {loading ? (
                  <div className="gold-glow" style={{ textAlign: 'center', padding: '40px' }}>ACCESSING TRANSACTION LEDGER...</div>
                ) : trades.length > 0 ? (
                  trades.map(trade => (
                    <div key={trade.trade_id} style={{ 
                      backgroundColor: 'var(--black-light)', border: '1px solid #222', 
                      borderRadius: '8px', padding: '20px', display: 'grid', 
                      gridTemplateColumns: '1fr 2fr 1fr', alignItems: 'center', gap: '20px',
                      transition: '0.3s', cursor: 'pointer'
                    }} onClick={() => window.location.href = `/escrow/${trade.trade_id}`}>
                      
                      <div style={{ borderRight: '1px solid #333', paddingRight: '20px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>ID: #{trade.trade_id}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--gold)', fontWeight: 'bold', margin: '5px 0' }}>
                          {trade.status.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#444' }}>{new Date(trade.timestamp).toLocaleString()}</div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <img src={trade.offered_item_image} style={{ width: '40px' }} alt="" />
                          <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '5px' }}>{trade.offered_item_name}</div>
                        </div>
                        <div style={{ color: 'var(--gold)', fontSize: '1.2rem' }}>⇄</div>
                        <div style={{ textAlign: 'center' }}>
                          <img src={trade.requested_item_image} style={{ width: '40px' }} alt="" />
                          <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '5px' }}>{trade.requested_item_name}</div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <button 
                          className="btn-gold" 
                          style={{ padding: '8px 20px', fontSize: '0.8rem', letterSpacing: '1px' }}
                        >
                          OPEN TERMINAL
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#444' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>∅</div>
                    <div>NO SECURE TRANSACTIONS FOUND IN LEDGER.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-form">
              <div className="form-group">
                <label>Change Password</label>
                <input type="password" placeholder="New Password" />
              </div>
              <div className="form-group">
                <label>Theme Toggle</label>
                <div className="toggle-switch">
                  <span className="gold-glow">Black & Gold (Active)</span>
                </div>
              </div>
              <div className="form-group">
                <label>Notifications</label>
                <div className="checkbox-group">
                  <input type="checkbox" id="email-notif" defaultChecked />
                  <label htmlFor="email-notif">Email Alerts for Offers</label>
                </div>
              </div>
              <button className="btn-gold">Save Changes</button>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="support-section">
              <h3 className="gold-glow">Contact Support</h3>
              <form className="support-form">
                <select className="support-select">
                  <option>Account Issues</option>
                  <option>Trade Disputes</option>
                  <option>Billing / Credits</option>
                  <option>Technical Bug</option>
                </select>
                <textarea placeholder="Describe your issue..." className="support-textarea"></textarea>
                <button type="button" className="btn-gold">Submit Ticket</button>
              </form>
              <div className="live-chat-box">
                <p>Live Chat: <span className="status-completed">Online</span></p>
                <button className="btn-outline-gold">Start Chat</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Floating Chat Trigger */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{
          position: 'fixed', bottom: '80px', right: '20px',
          width: '60px', height: '60px', borderRadius: '50%',
          backgroundColor: 'var(--gold)', color: 'var(--black)',
          border: 'none', fontSize: '1.5rem', cursor: 'pointer',
          boxShadow: '0 5px 15px rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}
      >
        💬
      </button>

      <ChatBox 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        user={user}
      />
    </div>
  );
}
