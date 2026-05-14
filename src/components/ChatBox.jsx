import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ChatBox = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('trades'); // 'messages' or 'trades'
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserTrades();
    }
  }, [isOpen, user]);

  const fetchUserTrades = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/trades/user/${user.user_id}`);
      setTrades(res.data);
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (tradeId, action) => {
    try {
      await axios.post(`/api/trades/respond`, {
        trade_id: tradeId,
        action: action === 'confirm' ? 'in_escrow' : 'declined'
      });
      alert(action === 'confirm' ? "Trade accepted! Moving to Escrow Room." : "Trade declined.");
      fetchUserTrades(); // Refresh list
    } catch (err) {
      console.error("Respond error:", err);
      alert("Failed to process trade.");
    }
  };

  if (!isOpen) return null;

  return (
     <div className="chat-box-overlay" style={{
       position: 'fixed', bottom: '150px', right: '20px',
       width: '400px', height: '550px', backgroundColor: 'var(--black-light)',
      border: '1px solid var(--gold)', borderRadius: '15px', display: 'flex',
      flexDirection: 'column', zIndex: 1001, boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px', borderBottom: '1px solid var(--gold)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to right, #111, #222)'
      }}>
        <h3 className="gold-glow" style={{ margin: 0, fontSize: '1.1rem' }}>Trade Center</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
        <button 
          onClick={() => setActiveTab('trades')}
          style={{
            flex: 1, padding: '12px', background: activeTab === 'trades' ? '#222' : 'transparent',
            border: 'none', color: activeTab === 'trades' ? 'var(--gold)' : '#888',
            borderBottom: activeTab === 'trades' ? '2px solid var(--gold)' : 'none',
            cursor: 'pointer', transition: '0.3s'
          }}
        >
          Active Trades
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          style={{
            flex: 1, padding: '12px', background: activeTab === 'messages' ? '#222' : 'transparent',
            border: 'none', color: activeTab === 'messages' ? 'var(--gold)' : '#888',
            borderBottom: activeTab === 'messages' ? '2px solid var(--gold)' : 'none',
            cursor: 'pointer', transition: '0.3s'
          }}
        >
          Messages
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {activeTab === 'trades' ? (
          loading ? (
            <p style={{ textAlign: 'center', color: 'var(--gold)', marginTop: '20px' }}>Loading trades...</p>
          ) : trades.length > 0 ? (
            trades.map(trade => (
              <div key={trade.trade_id} style={{
                backgroundColor: '#1a1a1a', border: '1px solid #333',
                borderRadius: '10px', padding: '12px', marginBottom: '15px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--gold)' }}>ID: #{trade.trade_id}</span>
                  <span style={{ 
                    color: trade.status === 'pending' ? '#ffcc00' : trade.status === 'in_escrow' ? '#007bff' : trade.status === 'completed' ? '#00ff00' : '#ff4444',
                    textTransform: 'uppercase', fontWeight: 'bold'
                  }}>
                    {trade.status === 'in_escrow' ? 'IN ESCROW' : trade.status}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <img src={trade.offered_item_image} alt="offered" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                    <p style={{ fontSize: '0.7rem', margin: '5px 0' }}>{trade.offered_item_name}</p>
                  </div>
                  <div style={{ color: 'var(--gold)', fontWeight: 'bold' }}>⇄</div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <img src={trade.requested_item_image} alt="requested" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                    <p style={{ fontSize: '0.7rem', margin: '5px 0' }}>{trade.requested_item_name}</p>
                  </div>
                </div>

                <div style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '8px', fontSize: '0.75rem' }}>
                  <p><span style={{ color: '#888' }}>Partner:</span> {trade.offerer_username === user.username ? trade.owner_username : trade.offerer_username}</p>
                  {trade.middleman && <p><span style={{ color: '#888' }}>Middleman:</span> {trade.middleman}</p>}
                  {trade.message && (
                    <div style={{ marginTop: '5px', fontStyle: 'italic', color: '#ccc', padding: '5px', backgroundColor: '#222', borderRadius: '4px' }}>
                      "{trade.message}"
                    </div>
                  )}
                </div>

                {trade.status === 'in_escrow' && (
                  <div style={{ marginTop: '15px' }}>
                    <a 
                      href={`/escrow/${trade.trade_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-gold"
                      style={{ 
                        display: 'block', textAlign: 'center', textDecoration: 'none', 
                        fontSize: '0.8rem', padding: '10px', animation: 'pulse 2s infinite' 
                      }}
                    >
                      🤝 Enter Escrow Room
                    </a>
                    <style>{`
                      @keyframes pulse {
                        0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4); }
                        70% { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
                      }
                    `}</style>
                  </div>
                )}

                {trade.status === 'pending' && Number(trade.owner_user_id) === Number(user.user_id) && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button 
                      onClick={() => handleRespond(trade.trade_id, 'confirm')}
                      style={{ flex: 1, padding: '8px', backgroundColor: '#28a745', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => handleRespond(trade.trade_id, 'decline')}
                      style={{ flex: 1, padding: '8px', backgroundColor: '#dc3545', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>No active trades found.</p>
          )
        ) : (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>Messaging feature coming soon...</p>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px', borderTop: '1px solid #333', textAlign: 'center' }}>
        <button className="btn-gold" style={{ width: '100%', fontSize: '0.8rem' }} onClick={fetchUserTrades}>
          Refresh Activity
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
