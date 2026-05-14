import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';

export default function EscrowRoom() {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [token] = useState(localStorage.getItem("token"));
  const [user] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) { return null; }
  });

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [tradeLink, setTradeLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);
  const pollingRef = useRef(null);
  const isProcessingAIRef = useRef(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }
    
    const init = async () => {
      await fetchTradeDetails();
      await fetchMessages();
    };
    
    init();
    
    pollingRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [tradeId]);

  useEffect(scrollToBottom, [messages]);

  const fetchTradeDetails = async () => {
    try {
      const userId = user.user_id || user.id;
      const res = await axios.get(`/api/trades/user/${userId}`);
      const currentTrade = res.data.find(t => t.trade_id === parseInt(tradeId));
      if (currentTrade) {
        setTrade(currentTrade);
      } else {
        console.error("Trade not found in user trades list");
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch trade details:", err);
      setLoading(false);
    }
  };

  const updateTradeDetail = async (newDetail) => {
    try {
      await axios.post('/api/trades/update-detail', {
        trade_id: tradeId,
        status_detail: newDetail
      });
      // Update local state too
      setTrade(prev => ({ ...prev, status_detail: newDetail }));
    } catch (err) {
      console.error("Failed to update trade detail:", err);
    }
  };

  const saveBotMessage = async (content, type = 'bot') => {
    try {
      await axios.post('/api/messages/send', {
        sender_id: 0, 
        receiver_id: 0,
        trade_id: tradeId,
        content: content,
        type: type
      });
      await fetchMessages();
    } catch (err) {
      console.error("Bot message save error:", err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/messages/trade/${tradeId}`);
      
      const dbMessages = res.data.map(m => ({
        id: m.msg_id,
        sender: m.sender_name,
        senderId: m.sender_id,
        content: m.content,
        timestamp: m.timestamp,
        isUser: Number(m.sender_id) === Number(user?.user_id || user?.id),
        isAI: Number(m.sender_id) === 0 || m.type === 'bot',
        isSystem: m.type === 'system'
      }));

      const protocolHeader = [
        { 
          sender: 'SYSTEM', 
          content: `SECURE TRADE CHANNEL: #${tradeId} [ACTIVE]`,
          isSystem: true 
        }
      ];

      setMessages([...protocolHeader, ...dbMessages]);
      handleAILogic(dbMessages);
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  };

  const handleAILogic = async (dbMessages) => {
    if (isProcessingAIRef.current || !trade) return;
    
    const currentDetail = trade.status_detail || 'initial';
    const humanMessages = dbMessages.filter(m => !m.isAI && !m.isSystem);

    // 1. Initial Welcome
    if (dbMessages.length === 0 && currentDetail === 'initial') {
      isProcessingAIRef.current = true;
      setIsTyping(true);
      setTimeout(async () => {
        await saveBotMessage(`Welcome! 🤖 I am your AI Trade Assistant. How can I assist you with your trade today? I see that ${trade.offerer_username} is offering a ${trade.offered_item_name} for ${trade.owner_username}'s ${trade.requested_item_name}. Please both parties type 'READY' if these terms are correct.`);
        await updateTradeDetail('waiting_agreement');
        setIsTyping(false);
        isProcessingAIRef.current = false;
      }, 1000);
      return;
    }

    // 2. Waiting for Agreement
    if (currentDetail === 'waiting_agreement') {
      const readyUsers = new Set(humanMessages.filter(m => m.content.toUpperCase().includes('READY') || m.content.toUpperCase().includes('AGREE')).map(m => m.senderId));
      
      if (readyUsers.size >= 2) {
        isProcessingAIRef.current = true;
        setIsTyping(true);
        setTimeout(async () => {
          await saveBotMessage(`Thank you both for your readiness. To ensure absolute transparency, I will now restate the agreed trade terms: ${trade.offerer_username} will receive ${trade.requested_item_name} (Value: $${trade.requested_item_value}) and ${trade.owner_username} will receive ${trade.offered_item_name} (Value: $${trade.offered_item_value}). If you agree to finalize this swap, please both type 'CONFIRM'.`);
          await updateTradeDetail('terms_restated');
          setIsTyping(false);
          isProcessingAIRef.current = false;
        }, 2000);
      }
    }

    // 3. Terms Restated -> Final Confirmation
    if (currentDetail === 'terms_restated') {
      const confirmedUsers = new Set(humanMessages.filter(m => m.content.toUpperCase().includes('CONFIRM')).map(m => m.senderId));
      
      if (confirmedUsers.size >= 2) {
        isProcessingAIRef.current = true;
        setIsTyping(true);
        setTimeout(async () => {
          const link = `https://quicktrade.io/vault/secure-swap-${Math.random().toString(36).substring(7)}`;
          setTradeLink(link);
          await saveBotMessage(`The trade has been officially confirmed between ${trade.offerer_username} and ${trade.owner_username}. I have generated a secure swap channel for you. Proceed to the vault here: ${link}. It has been a pleasure assisting you!`);
          await updateTradeDetail('confirmed');
          setIsTyping(false);
          isProcessingAIRef.current = false;
        }, 2000);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !trade) return;

    const userId = Number(user?.user_id || user?.id);
    const offererId = Number(trade.offerer_user_id);
    const ownerId = Number(trade.owner_user_id);
    const receiverId = userId === offererId ? ownerId : offererId;
    
    const msgContent = newMessage;
    setNewMessage('');

    try {
      await axios.post('/api/messages/send', {
        sender_id: userId,
        receiver_id: receiverId,
        trade_id: Number(tradeId),
        content: msgContent,
        type: 'user'
      });
      await fetchMessages();
    } catch (err) {
      console.error("Send error:", err);
      const errMsg = err.response?.data?.error || err.message || "Unknown error";
      const errorDisplay = `SYSTEM ERROR: ${errMsg}. Please check if the backend server is running and your database is up to date.`;
      setMessages(prev => [...prev, { sender: 'SYSTEM', content: errorDisplay, isSystem: true }]);
    }
  };

  if (loading) return (
    <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="gold-glow" style={{ fontSize: '1.5rem', letterSpacing: '4px' }}>INITIALIZING SECURE TERMINAL...</div>
    </div>
  );

  if (!trade) return <div style={{ color: 'red', textAlign: 'center', marginTop: '100px' }}>TRADE NODE NOT FOUND</div>;

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#eee', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <TopBar token={token} />
      
      <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ 
          border: '1px solid #333', padding: '15px', marginBottom: '20px', 
          background: 'linear-gradient(180deg, #111 0%, #000 100%)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderRadius: '8px'
        }}>
          <div>
            <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>TERMINAL:</span> QT-NODE-{tradeId}
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem' }}>
            <span>ENCRYPTION: <span style={{ color: '#0f0' }}>AES-256</span></span>
            <span>ASSISTANT: <span style={{ color: 'var(--gold)' }}>ACTIVE</span></span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ 
              display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
              backgroundColor: '#0a0a0a', padding: '30px', border: '1px solid #222', borderRadius: '12px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '10px', textTransform: 'uppercase' }}>Trader A: {trade.offerer_username}</div>
                <img src={trade.offered_item_image} style={{ width: '120px', filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.2))' }} alt="" />
                <div style={{ color: 'var(--gold)', marginTop: '10px', fontWeight: 'bold' }}>{trade.offered_item_name}</div>
                <div style={{ fontSize: '0.8rem', color: '#444' }}>VALUE: ${trade.offered_item_value}</div>
              </div>

              <div style={{ padding: '0 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', color: 'var(--gold)', animation: 'pulse 2s infinite' }}>⇄</div>
                <div style={{ fontSize: '0.6rem', color: '#555', marginTop: '5px', letterSpacing: '2px' }}>SECURE EXCHANGE</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '10px', textTransform: 'uppercase' }}>Trader B: {trade.owner_username}</div>
                <img src={trade.requested_item_image} style={{ width: '120px', filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.2))' }} alt="" />
                <div style={{ color: 'var(--gold)', marginTop: '10px', fontWeight: 'bold' }}>{trade.requested_item_name}</div>
                <div style={{ fontSize: '0.8rem', color: '#444' }}>VALUE: ${trade.requested_item_value}</div>
              </div>
            </div>

            {tradeLink && (
              <div style={{ 
                backgroundColor: 'rgba(212, 175, 55, 0.05)', border: '1px solid var(--gold)', 
                padding: '25px', textAlign: 'center', position: 'relative', overflow: 'hidden',
                borderRadius: '12px'
              }}>
                <h3 style={{ color: 'var(--gold)', marginBottom: '15px', letterSpacing: '2px' }}>SECURE VAULT ACCESS GRANTED</h3>
                <button 
                  onClick={() => window.open(tradeLink, '_blank')}
                  style={{ 
                    backgroundColor: 'var(--gold)', color: '#000', padding: '12px 40px', 
                    fontWeight: 'bold', border: 'none', cursor: 'pointer', letterSpacing: '1px',
                    borderRadius: '4px', textTransform: 'uppercase'
                  }}
                >
                  Enter Secure Vault
                </button>
              </div>
            )}

            <div style={{ 
              backgroundColor: '#0a0a0a', border: '1px solid #222', height: '480px',
              display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden'
            }}>
              <div id="chat-messages" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ 
                    alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    padding: '12px 16px',
                    backgroundColor: msg.isAI ? 'rgba(212, 175, 55, 0.1)' : (msg.isSystem ? 'rgba(255,255,255,0.05)' : (msg.isUser ? 'rgba(212, 175, 55, 0.2)' : '#1a1a1a')),
                    border: msg.isAI ? '1px solid var(--gold)' : (msg.isSystem ? '1px solid #333' : 'none'),
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    lineHeight: '1.5'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: msg.isAI ? 'var(--gold)' : '#888', marginBottom: '5px', fontWeight: 'bold' }}>
                      {msg.sender.toUpperCase()}
                    </div>
                    <div style={{ color: msg.isAI ? '#fff' : (msg.isSystem ? '#888' : '#eee') }}>{msg.content}</div>
                  </div>
                ))}
                {isTyping && <div style={{ color: 'var(--gold)', fontSize: '0.8rem', paddingLeft: '10px' }}>AI Trade Assistant is typing...</div>}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} style={{ padding: '20px', borderTop: '1px solid #222', display: 'flex', gap: '10px', backgroundColor: '#0d0d0d' }}>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message or protocol command..."
                  style={{ 
                    flex: 1, backgroundColor: '#151515', border: '1px solid #333', 
                    color: '#fff', outline: 'none', fontSize: '1rem', padding: '12px 15px',
                    borderRadius: '6px'
                  }}
                />
                <button type="submit" style={{ 
                  backgroundColor: 'var(--gold)', 
                  color: '#000', 
                  border: 'none', 
                  padding: '0 25px', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  fontSize: '0.85rem'
                }}>Send</button>
              </form>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--gold)', fontSize: '0.8rem', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '8px', textTransform: 'uppercase' }}>Trade Protocol</h4>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.8rem', color: '#888', lineHeight: '2' }}>
                <li>✅ Step 1: Initialize Agreement</li>
                <li style={{ color: (trade?.status_detail === 'terms_restated' || trade?.status_detail === 'confirmed') ? '#44ff44' : '#888' }}>
                  {trade?.status_detail === 'initial' ? '○' : '✅'} Step 2: Asset Verification
                </li>
                <li style={{ color: trade?.status_detail === 'confirmed' ? '#44ff44' : '#888' }}>
                  {trade?.status_detail === 'confirmed' ? '✅' : '○'} Step 3: Final Confirmation
                </li>
                <li style={{ color: trade?.status_detail === 'confirmed' ? '#44ff44' : '#888' }}>
                  {trade?.status_detail === 'confirmed' ? '✅' : '○'} Step 4: Vault Execution
                </li>
              </ul>
            </div>

            <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--gold)', fontSize: '0.8rem', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '8px', textTransform: 'uppercase' }}>Assistant Directives</h4>
              <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: '1.6' }}>
                - AI Assistant handles all swaps.<br/>
                - Both parties must type 'READY'.<br/>
                - Both parties must type 'CONFIRM'.<br/>
                - Items are held in escrow.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.5; transform: scale(1); }
        }
      `}</style>
      <Footer />
    </div>
  );
}
