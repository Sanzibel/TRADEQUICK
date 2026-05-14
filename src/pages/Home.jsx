import React, { useState, useEffect } from "react";
import "./home.css";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import ItemCard from "../components/ItemCard";
import Footer from "../components/Footer";
import TradeModal from "../components/TradeModal";
import ChatBox from "../components/ChatBox";
import PostItemModal from "../components/PostItemModal";
import axios from "axios";

import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState([]);
  
  const [filters, setFilters] = useState({
    games: [],
    categories: [],
    valueRange: [0, 5000]
  });

  const [items, setItems] = useState([]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    alert("Logged out!");
  };

  useEffect(() => {
    fetchItems();
    if (user) {
      fetchBookmarks();
      // Verify user session
      axios.get(`/api/auth/verify/${user.user_id}`)
        .catch(() => {
          console.warn("User session invalid, logging out...");
          logout();
        });
    }

    // Check for ?post=true in URL to auto-open modal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('post') === 'true') {
      setIsPostModalOpen(true);
      // Clean up URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  const fetchItems = async () => {
    try {
      const res = await axios.get("/api/items");
      console.log("Fetched items from DB:", res.data);
      
      // Convert database items to match UI format
      const dbItems = Array.isArray(res.data) ? res.data.map(item => ({
        id: item.post_id,
        name: item.name,
        game: item.game,
        category: item.category || "Skins",
        value: Number(item.value), // Ensure value is a number
        image: item.screenshot_url || "https://via.placeholder.com/150"
      })) : [];

      setItems(dbItems);
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setItems([]);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await axios.get(`/api/items/bookmarks/${user.user_id}`);
      setFavorites(res.data.map(b => b.post_id));
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err);
    }
  };

  const handlePostItem = async (newItem) => {
    if (!token || !user) {
      alert("Please login to post items!");
      return;
    }

    try {
      console.log("Attempting to post item:", newItem);
      const res = await axios.post("/api/items/post", {
        user_id: user.user_id,
        ...newItem
      });
      
      console.log("Post response:", res.data);
      alert("Item listed successfully!");
      await fetchItems(); // Refresh the list from database
      setIsPostModalOpen(false);
      
      // Redirect to Profile - My Listings tab
      navigate("/profile?tab=listings");
    } catch (err) {
      console.error("Detailed Post Error:", err.response?.data || err.message);
      alert(`Error posting item: ${err.response?.data?.error || "Server connection issue"}`);
    }
  };

  const handleTrade = (item) => {
    if (!token) {
      alert("Please login to trade!");
      return;
    }
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleMessage = (item) => {
    if (!token) {
      alert("Please login to message owners!");
      return;
    }
    setChatRecipient("Owner of " + item.name);
    setIsChatOpen(true);
  };

  const handleBookmark = async (itemId) => {
    if (!token || !user) {
      alert("Please login to bookmark items!");
      return;
    }

    // Don't bookmark mock items (id starts with 'm')
    if (typeof itemId === 'string' && itemId.startsWith('m')) {
      setFavorites(prev => 
        prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
      );
      return;
    }

    try {
      const res = await axios.post("/api/items/bookmark", {
        user_id: user.user_id,
        post_id: itemId
      });
      
      if (res.data.status === 'added') {
        setFavorites(prev => [...prev, itemId]);
      } else {
        setFavorites(prev => prev.filter(id => id !== itemId));
      }
    } catch (err) {
      console.error("Bookmark Error:", err);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGame = filters.games.length === 0 || filters.games.includes(item.game);
    const matchesCategory = filters.categories.length === 0 || filters.categories.includes(item.category);
    
    // Convert item.value to number just in case
    const itemValue = Number(item.value);
    const matchesValue = itemValue >= filters.valueRange[0] && (filters.valueRange[1] >= 5000 ? true : itemValue <= filters.valueRange[1]);
    
    return matchesSearch && matchesGame && matchesCategory && matchesValue;
  });

  return (
    <div className="home-container">
      <TopBar 
        token={token} 
        logout={logout} 
        onPostItem={() => setIsPostModalOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
      
      <main className="main-layout">
        <Sidebar filters={filters} onFilterChange={setFilters} />
        
        <div className="center-content">
          <div className="hero-section" style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1 className="gold-glow" style={{ fontSize: '3rem', marginBottom: '10px' }}>Trade Smarter, Trade Faster</h1>
            <p style={{ color: 'var(--text-gray)', fontSize: '1.2rem' }}>The ultimate cross-game trading platform.</p>
          </div>

          <div className="item-grid">
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  isBookmarked={favorites.includes(item.id)}
                  onTrade={handleTrade} 
                  onMessage={handleMessage} 
                  onBookmark={() => handleBookmark(item.id)}
                />
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: 'var(--text-gray)' }}>
                <h3>No items found matching your criteria.</h3>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {selectedItem && (
        <TradeModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          item={selectedItem} 
          user={user}
          token={token}
        />
      )}

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

      {/* How it Works UI */}
      <button 
        onClick={() => setIsHelpOpen(true)}
        style={{
          position: 'fixed', bottom: '120px', left: '20px',
          backgroundColor: 'transparent', color: 'var(--gold)',
          border: '1px solid var(--gold)', padding: '8px 15px',
          borderRadius: '20px', cursor: 'pointer', zIndex: 1000,
          fontSize: '0.85rem', transition: '0.3s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(212, 175, 55, 0.1)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        ❓ How it Works
      </button>

      {isHelpOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 2000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'var(--black-light)', border: '1px solid var(--gold)',
            padding: '40px', borderRadius: '15px', width: '800px', maxWidth: '90%',
            maxHeight: '85vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 className="gold-glow">How QuickTrade Works</h1>
              <button onClick={() => setIsHelpOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '2rem', cursor: 'pointer' }}>×</button>
            </div>

            <div className="help-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px' }}>
              <div className="help-step">
                <div style={{ fontSize: '2rem', marginBottom: '15px' }}>📝</div>
                <h3 className="gold-glow">1. List Items</h3>
                <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Post your gaming items in the market. Provide details like game, category, and estimated value. Add a screenshot to attract more traders.
                </p>
              </div>

              <div className="help-step">
                <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🤝</div>
                <h3 className="gold-glow">2. Make an Offer</h3>
                <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Browse the market and find items you want. Click 'Trade' to offer one of your own listed items. You must also select a trusted Middleman.
                </p>
              </div>

              <div className="help-step">
                <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🛡️</div>
                <h3 className="gold-glow">3. Escrow Security</h3>
                <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Once the offer is accepted, both parties enter a private <b>Escrow Room</b>. The AI Middleman will explain the verification process to prevent scams.
                </p>
              </div>

              <div className="help-step">
                <div style={{ fontSize: '2rem', marginBottom: '15px' }}>📦</div>
                <h3 className="gold-glow">4. Complete Trade</h3>
                <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  The Middleman holds both items. After verifying authenticity, items are distributed simultaneously. Fast, safe, and scam-free!
                </p>
              </div>
            </div>

            <div style={{ marginTop: '40px', padding: '20px', backgroundColor: 'rgba(212, 175, 55, 0.05)', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h4 className="gold-glow" style={{ marginBottom: '10px' }}>Why use a Middleman?</h4>
              <p style={{ color: '#aaa', fontSize: '0.85rem' }}>
                QuickTrade uses a mandatory Escrow system. This means no one ever has to "go first." The Middleman (or our AI Bot) acts as a neutral third party to hold and verify items before any swap occurs.
              </p>
            </div>

            <button 
              className="btn-gold" 
              style={{ width: '100%', marginTop: '30px', padding: '15px' }}
              onClick={() => setIsHelpOpen(false)}
            >
              Got it, let's trade!
            </button>
          </div>
        </div>
      )}

      <PostItemModal 
        isOpen={isPostModalOpen} 
        onClose={() => setIsPostModalOpen(false)} 
        onPost={handlePostItem} 
      />
    </div>
  );
}
