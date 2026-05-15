import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../utils/notifications.jsx';

const ChatBox = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('trades'); // 'messages' or 'trades'
  const [trades, setTrades] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const previousTicketCountRef = useRef(0);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isOpen && user) {
      fetchUserTrades();
      fetchSupportTickets();
    }
  }, [isOpen, user?.user_id, user?.role]);

  useEffect(() => {
    if (!isOpen || !user) return;
    const interval = setInterval(() => {
      if (activeTab === 'trades') fetchUserTrades(false);
      fetchSupportTickets(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, user?.user_id, user?.role, activeTab]);

  const fetchUserTrades = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await axios.get(`/api/trades/user/${user.user_id}`);
      setTrades(res.data);
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchSupportTickets = async (notify = false) => {
    if (!user) return;
    try {
      const url = isAdmin ? '/api/messages/support/admin' : `/api/messages/support/user/${user.user_id}`;
      const res = await axios.get(url);
      const tickets = Array.isArray(res.data) ? res.data : [];
      if (notify && isAdmin && previousTicketCountRef.current && tickets.length > previousTicketCountRef.current) {
        toast.success('New support ticket received.');
      }
      previousTicketCountRef.current = tickets.length;
      setSupportTickets(tickets);
      if (!selectedTicketId && tickets[0]) setSelectedTicketId(tickets[0].convo_id);
    } catch (err) {
      console.error("Failed to fetch support tickets:", err);
    }
  };

  const handleRespond = async (tradeId, action) => {
    try {
      await axios.post(`/api/trades/respond`, {
        trade_id: tradeId,
        action: action === 'confirm' ? 'in_escrow' : 'declined'
      });
      toast.success(action === 'confirm' ? "Trade accepted! Moving to Escrow Room." : "Trade declined.");
      fetchUserTrades(); // Refresh list
    } catch (err) {
      console.error("Respond error:", err);
      toast.error("Failed to process trade.");
    }
  };

  const selectedTicket = supportTickets.find(ticket => Number(ticket.convo_id) === Number(selectedTicketId));

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    try {
      const res = await axios.post(`/api/messages/support/${selectedTicket.convo_id}/reply`, {
        sender_id: user.user_id,
        content: replyText
      });
      setReplyText('');
      setSupportTickets(prev => prev.map(ticket => Number(ticket.convo_id) === Number(res.data.convo_id) ? res.data : ticket));
      toast.success(isAdmin ? 'Reply sent to user.' : 'Reply sent to support.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reply.');
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedTicket) return;
    try {
      const res = await axios.patch(`/api/messages/support/${selectedTicket.convo_id}/status`, {
        status,
        actor_user_id: user.user_id
      });
      setSupportTickets(prev => prev.map(ticket => Number(ticket.convo_id) === Number(res.data.convo_id) ? res.data : ticket));
      toast.success(`Ticket marked ${status}.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status.');
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
        ) : isAdmin ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {supportTickets.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>No support messages yet.</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {supportTickets.map(ticket => (
                    <button
                      key={ticket.convo_id}
                      onClick={() => setSelectedTicketId(ticket.convo_id)}
                      style={{
                        minWidth: '150px',
                        textAlign: 'left',
                        padding: '10px',
                        borderRadius: '8px',
                        border: Number(selectedTicketId) === Number(ticket.convo_id) ? '1px solid var(--gold)' : '1px solid #333',
                        background: '#111',
                        color: '#eee'
                      }}
                    >
                      <div style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>#{ticket.convo_id} / {ticket.support_status}</div>
                      <div style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.user_name}</div>
                    </button>
                  ))}
                </div>

                {selectedTicket && (
                  <div style={{ background: '#111', border: '1px solid #333', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ marginBottom: '10px', fontSize: '0.82rem', color: '#bbb' }}>
                      <strong style={{ color: 'var(--gold)' }}>{selectedTicket.subject}</strong>
                      <div>User: {selectedTicket.user_name} / ID {selectedTicket.user1_id}</div>
                      <div>Updated: {new Date(selectedTicket.last_timestamp).toLocaleString()}</div>
                    </div>

                    <select
                      value={selectedTicket.support_status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      style={{ width: '100%', marginBottom: '10px', padding: '8px', background: '#0a0a0a', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                    >
                      {['Open', 'Pending', 'Resolved', 'Closed'].map(status => <option key={status}>{status}</option>)}
                    </select>

                    <div style={{ display: 'grid', gap: '8px', maxHeight: '210px', overflowY: 'auto', marginBottom: '10px' }}>
                      {selectedTicket.messages?.map(message => (
                        <div key={message.msg_id} style={{ padding: '8px', borderRadius: '8px', background: Number(message.sender_id) === Number(user.user_id) ? 'rgba(212,175,55,0.18)' : '#1b1b1b' }}>
                          <div style={{ color: 'var(--gold)', fontSize: '0.72rem', marginBottom: '4px' }}>{message.sender_name} / {new Date(message.timestamp).toLocaleString()}</div>
                          {message.type === 'image' ? (
                            <img src={message.content} alt="Support attachment" style={{ maxWidth: '100%', borderRadius: '6px' }} />
                          ) : message.type === 'file' ? (
                            <a href={message.content} target="_blank" rel="noreferrer" className="btn-outline-gold">Open Attachment</a>
                          ) : (
                            <div style={{ color: '#eee', whiteSpace: 'pre-wrap' }}>{message.content}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Reply to this support ticket..."
                      style={{ width: '100%', minHeight: '70px', background: '#0a0a0a', color: '#fff', border: '1px solid #444', borderRadius: '6px', padding: '10px', resize: 'vertical' }}
                    />
                    <button className="btn-gold" style={{ width: '100%', marginTop: '8px' }} onClick={handleSendReply}>Send Reply</button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>Support replies appear in Profile &gt; Help &amp; Support.</p>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px', borderTop: '1px solid #333', textAlign: 'center' }}>
        <button className="btn-gold" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => activeTab === 'messages' ? fetchSupportTickets() : fetchUserTrades()}>
          Refresh Activity
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
