import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';
import { confirmToast, toast } from '../utils/notifications.jsx';
import './tickets.css';

const middlemanActions = [
  { action: 'received_a', label: 'Received from Trader A' },
  { action: 'received_b', label: 'Received from Trader B' }
];

const EMPTY_ARRAY = [];

export default function EscrowRoom() {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const chatContainerRef = useRef(null);
  const chatEndRef = useRef(null);
  const pollingRef = useRef(null);
  const isProcessingAIRef = useRef(false);
  const shouldFollowChatRef = useRef(true);
  const lastMessageKeyRef = useRef('');
  const forceNextChatScrollRef = useRef(false);

  const [token] = useState(localStorage.getItem('token'));
  const [user] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [trade, setTrade] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatImage, setChatImage] = useState('');
  const [chatImageName, setChatImageName] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [tradeLink, setTradeLink] = useState(null);
  const [ticketPayload, setTicketPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itemForm, setItemForm] = useState({ post_id: '', quantity: 1 });
  const [userListings, setUserListings] = useState([]);
  const [middlemanId, setMiddlemanId] = useState('');
  const [actionEvidence, setActionEvidence] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    method: 'gcash',
    gcash_option: 'number',
    gcash_number: '',
    qr_url: '',
    amount: '',
    note: ''
  });
  const [receiptFile, setReceiptFile] = useState({ url: '', name: '', type: '' });
  const [paymentBusy, setPaymentBusy] = useState(false);

  const userId = Number(user?.user_id || user?.id);
  const isAdmin = user?.role === 'admin';
  const ticket = ticketPayload?.ticket;
  const items = ticketPayload?.items || EMPTY_ARRAY;
  const logs = ticketPayload?.logs || EMPTY_ARRAY;
  const payment = ticketPayload?.payment || { status: 'not_requested' };
  const roomStatus = ticket?.status || trade?.status || 'active';

  const mySubmission = useMemo(() => {
    return items.find(item => Number(item.user_id) === userId);
  }, [items, userId]);

  const logTypes = useMemo(() => new Set(logs.map(log => log.event_type)), [logs]);

  const ticketRole = useMemo(() => {
    if (!ticket || !userId) return 'viewer';
    if (Number(ticket.creator_user_id) === userId) return 'creator';
    if (Number(ticket.joiner_user_id) === userId) return 'joiner';
    if (Number(ticket.middleman_user_id) === userId) return 'middleman';
    if (isAdmin) return 'admin';
    return 'viewer';
  }, [ticket, userId, isAdmin]);

  const isParticipant = ['creator', 'joiner'].includes(ticketRole);
  const isMiddleman = ticketRole === 'middleman';
  const canManageMiddleman = isAdmin || isMiddleman;

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }

    const init = async () => {
      await fetchTradeDetails();
      await fetchMessages();
      await fetchTradeTicket();
      await fetchUserListings();
    };

    init();
    pollingRef.current = setInterval(() => {
      fetchMessages();
      fetchTradeTicket();
    }, 3000);

    return () => clearInterval(pollingRef.current);
  // The room id drives this polling lifecycle; fetch helpers read the latest state inside each tick.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId]);

  useEffect(() => {
    if (shouldFollowChatRef.current) {
      const el = chatContainerRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  const isChatNearBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  async function fetchTradeDetails() {
    try {
      const res = await axios.get(`/api/trades/${tradeId}`);
      setTrade(res.data);
    } catch (err) {
      console.error('Failed to fetch trade details:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTradeTicket() {
    try {
      const res = await axios.get(`/api/tickets/trade/${tradeId}`);
      setTicketPayload(res.data);
      if (res.data?.ticket?.status === 'Completed') {
        localStorage.setItem('quicktrade_trade_completed', 'Trade has been completed.');
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error('Failed to fetch middleman room:', err);
    }
  }

  async function fetchUserListings() {
    if (!userId) return;
    try {
      const res = await axios.get(`/api/items/listings/${userId}`);
      setUserListings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch user listings:', err);
    }
  }

  async function updateTradeDetail(newDetail) {
    try {
      await axios.post('/api/trades/update-detail', {
        trade_id: tradeId,
        status_detail: newDetail
      });
      setTrade(prev => ({ ...prev, status_detail: newDetail }));
    } catch (err) {
      console.error('Failed to update trade detail:', err);
    }
  }

  async function saveBotMessage(content, type = 'bot') {
    try {
      await axios.post('/api/messages/send', {
        sender_id: 0,
        receiver_id: 0,
        trade_id: tradeId,
        content,
        type
      });
      await fetchMessages();
    } catch (err) {
      console.error('Bot message save error:', err);
    }
  }

  async function fetchMessages() {
    try {
      const wasNearBottom = isChatNearBottom();
      const res = await axios.get(`/api/messages/trade/${tradeId}`);
      const dbMessages = res.data.map(m => ({
        id: m.msg_id,
        sender: m.sender_name,
        senderId: m.sender_id,
        content: m.content,
        timestamp: m.timestamp,
        isUser: Number(m.sender_id) === userId,
        type: m.type || 'user',
        isImage: m.type === 'image',
        isAI: Number(m.sender_id) === 0 || m.type === 'bot',
        isSystem: m.type === 'system'
      }));
      const lastMessage = dbMessages[dbMessages.length - 1];
      const nextMessageKey = lastMessage
        ? `${lastMessage.id}-${lastMessage.timestamp}-${lastMessage.type}-${String(lastMessage.content || '').length}`
        : 'empty';
      const hasNewMessage = nextMessageKey !== lastMessageKeyRef.current;

      shouldFollowChatRef.current = forceNextChatScrollRef.current || (hasNewMessage && wasNearBottom);
      lastMessageKeyRef.current = nextMessageKey;
      forceNextChatScrollRef.current = false;

      setMessages([
        {
          sender: 'SYSTEM',
          content: `ESCROW ROOM: Trade ID #${tradeId} [ACTIVE]`,
          isSystem: true
        },
        ...dbMessages
      ]);
      handleAILogic(dbMessages);
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  }

  async function handleAILogic(dbMessages) {
    if (isProcessingAIRef.current || !trade) return;

    const currentDetail = trade.status_detail || 'initial';
    const humanMessages = dbMessages.filter(m => !m.isAI && !m.isSystem);

    if (dbMessages.length === 0 && currentDetail === 'initial') {
      isProcessingAIRef.current = true;
      setIsTyping(true);
      setTimeout(async () => {
        await saveBotMessage(`Welcome to Trade #${tradeId}. ${trade.offerer_username} is offering ${trade.offered_item_name} for ${trade.owner_username}'s ${trade.requested_item_name}. Both traders can chat here directly and type READY when the terms are correct.`);
        await updateTradeDetail('waiting_agreement');
        setIsTyping(false);
        isProcessingAIRef.current = false;
      }, 1000);
      return;
    }

    if (currentDetail === 'waiting_agreement') {
      const readyUsers = new Set(humanMessages.filter(m => m.content.toUpperCase().includes('READY') || m.content.toUpperCase().includes('AGREE')).map(m => m.senderId));
      if (readyUsers.size >= 2) {
        isProcessingAIRef.current = true;
        setIsTyping(true);
        setTimeout(async () => {
          await saveBotMessage(`Trade terms for #${tradeId}: ${trade.offerer_username} receives ${trade.requested_item_name} and ${trade.owner_username} receives ${trade.offered_item_name}. If both traders agree to finalize, type CONFIRM.`);
          await updateTradeDetail('terms_restated');
          setIsTyping(false);
          isProcessingAIRef.current = false;
        }, 2000);
      }
    }

    if (currentDetail === 'terms_restated') {
      const confirmedUsers = new Set(humanMessages.filter(m => m.content.toUpperCase().includes('CONFIRM')).map(m => m.senderId));
      if (confirmedUsers.size >= 2) {
        isProcessingAIRef.current = true;
        setIsTyping(true);
        setTimeout(async () => {
          const link = `https://quicktrade.io/vault/secure-swap-${Math.random().toString(36).substring(7)}`;
          setTradeLink(link);
          await saveBotMessage(`Trade #${tradeId} has been confirmed by both traders. Secure vault: ${link}`);
          await updateTradeDetail('confirmed');
          setIsTyping(false);
          isProcessingAIRef.current = false;
        }, 2000);
      }
    }
  }

  const readFileAsDataUrl = (file, callback) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  };

  const readChatImage = (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Chat images must be JPG, PNG, JPEG, or WEBP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Chat image size exceeds 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setChatImage(reader.result);
      setChatImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const readReceiptFile = (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Receipt must be an image or PDF.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Receipt size exceeds 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptFile({ url: reader.result, name: file.name, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !chatImage) || !trade || sendingMessage) return;

    const offererId = Number(trade.offerer_user_id);
    const ownerId = Number(trade.owner_user_id);
    const receiverId = userId === offererId ? ownerId : (userId === ownerId ? offererId : 0);
    const msgContent = newMessage;
    setNewMessage('');
    shouldFollowChatRef.current = true;
    forceNextChatScrollRef.current = true;
    setSendingMessage(true);

    try {
      if (msgContent.trim()) {
        await axios.post('/api/messages/send', {
          sender_id: userId,
          receiver_id: receiverId,
          trade_id: Number(tradeId),
          content: msgContent,
          type: 'user'
        });
      }
      if (chatImage) {
        await axios.post('/api/messages/send', {
          sender_id: userId,
          receiver_id: receiverId,
          trade_id: Number(tradeId),
          content: chatImage,
          type: 'image'
        });
        setChatImage('');
        setChatImageName('');
      }
      await fetchMessages();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Unknown error';
      setMessages(prev => [...prev, { sender: 'SYSTEM', content: `SYSTEM ERROR: ${errMsg}`, isSystem: true }]);
    } finally {
      setSendingMessage(false);
    }
  };

  const submitItem = async (e) => {
    e.preventDefault();
    if (!ticket) return;
    if (!itemForm.post_id) {
      toast.error('Select one of your listed items first.');
      return;
    }
    try {
      const res = await axios.post(`/api/tickets/${ticket.ticket_code}/items`, {
        user_id: userId,
        post_id: Number(itemForm.post_id),
        quantity: Number(itemForm.quantity)
      });
      setTicketPayload(res.data);
      toast.success('Item declaration saved.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save item declaration');
    }
  };

  const assignMiddleman = async () => {
    if (!ticket) return;
    try {
      const res = await axios.post(`/api/tickets/${ticket.ticket_code}/assign-middleman`, {
        middleman_user_id: Number(middlemanId || userId),
        actor_user_id: userId
      });
      setTicketPayload(res.data);
      toast.success('Middleman joined the escrow room.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign middleman');
    }
  };

  const performAction = async (action) => {
    if (!ticket) return;
    try {
      const res = await axios.post(`/api/tickets/${ticket.ticket_code}/middleman-action`, {
        actor_user_id: userId,
        action,
        evidence_url: actionEvidence,
        note: actionNote
      });
      setTicketPayload(res.data);
      setActionEvidence('');
      setActionNote('');
      toast.success(`${middlemanActions.find(item => item.action === action)?.label || 'Action'} saved.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save action');
    }
  };

  const requestPayment = async () => {
    if (!ticket || paymentBusy) return;
    setPaymentBusy(true);
    try {
      const res = await axios.post(`/api/tickets/${ticket.ticket_code}/payment-request`, {
        actor_user_id: userId,
        ...paymentForm
      });
      setTicketPayload(res.data);
      toast.success('Payment request sent.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request payment');
    } finally {
      setPaymentBusy(false);
    }
  };

  const submitReceipt = async () => {
    if (!ticket || paymentBusy) return;
    if (!receiptFile.url) {
      toast.error('Upload a receipt first.');
      return;
    }
    setPaymentBusy(true);
    try {
      const res = await axios.post(`/api/tickets/${ticket.ticket_code}/payment-receipt`, {
        user_id: userId,
        receipt_url: receiptFile.url,
        receipt_name: receiptFile.name,
        receipt_type: receiptFile.type
      });
      setTicketPayload(res.data);
      setReceiptFile({ url: '', name: '', type: '' });
      toast.success('Receipt submitted for middleman review.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit receipt');
    } finally {
      setPaymentBusy(false);
    }
  };

  const completePayment = async () => {
    if (!ticket || paymentBusy) return;
    setPaymentBusy(true);
    try {
      const res = await axios.post(`/api/tickets/${ticket.ticket_code}/payment-complete`, {
        actor_user_id: userId,
        note: actionNote
      });
      setTicketPayload(res.data);
      toast.success('Payment marked complete. Funds secured.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete payment');
    } finally {
      setPaymentBusy(false);
    }
  };

  const completeTicket = async () => {
    if (!ticket) return;
    try {
      const res = await axios.post(`/api/tickets/${ticket.ticket_code}/complete`, {
        actor_user_id: userId,
        evidence_url: actionEvidence,
        note: actionNote
      });
      setTicketPayload(res.data);
      await fetchTradeDetails();
      toast.success('Trade completed and logged.');
      localStorage.setItem('quicktrade_trade_completed', 'Trade has been completed.');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete trade');
    }
  };

  const cancelTicket = async () => {
    if (!ticket) return;
    const confirmed = await confirmToast('Cancel this trade?', { confirmLabel: 'Cancel Trade' });
    if (!confirmed) return;
    try {
      const res = await axios.post(`/api/tickets/${ticket.ticket_code}/cancel`, {
        actor_user_id: userId,
        reason: actionNote || 'Cancelled from escrow room.'
      });
      setTicketPayload(res.data);
      await fetchTradeDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel trade');
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="gold-glow" style={{ fontSize: '1.5rem', letterSpacing: '4px' }}>INITIALIZING ESCROW ROOM...</div>
      </div>
    );
  }

  if (!trade) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '100px' }}>TRADE NOT FOUND</div>;
  }

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#eee', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <TopBar token={token} />

      <main style={{ maxWidth: '1280px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{
          border: '1px solid #333',
          padding: '15px',
          marginBottom: '20px',
          background: 'linear-gradient(180deg, #111 0%, #000 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '8px',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div>
            <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>TRADE ID:</span> #{tradeId}
            <span style={{ color: '#777', marginLeft: '14px' }}>Escrow Room</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
            <span>STATUS: <span style={{ color: 'var(--gold)' }}>{String(roomStatus).toUpperCase()}</span></span>
            {ticket?.middleman_username && <span>MIDDLEMAN: <span style={{ color: '#44ff88' }}>{ticket.middleman_username}</span></span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              backgroundColor: '#0a0a0a',
              padding: '30px',
              border: '1px solid #222',
              borderRadius: '12px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '10px', textTransform: 'uppercase' }}>Trader A: {trade.offerer_username}</div>
                <img src={trade.offered_item_image} style={{ width: '120px', filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.2))' }} alt="" />
                <div style={{ color: 'var(--gold)', marginTop: '10px', fontWeight: 'bold' }}>{trade.offered_item_name}</div>
                <div style={{ fontSize: '0.8rem', color: '#444' }}>VALUE: ${trade.offered_item_value}</div>
              </div>

              <div style={{ padding: '0 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', color: 'var(--gold)', animation: 'pulse 2s infinite' }}>&lt;-&gt;</div>
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
                backgroundColor: 'rgba(212, 175, 55, 0.05)',
                border: '1px solid var(--gold)',
                padding: '25px',
                textAlign: 'center',
                borderRadius: '12px'
              }}>
                <h3 style={{ color: 'var(--gold)', marginBottom: '15px', letterSpacing: '2px' }}>SECURE VAULT ACCESS GRANTED</h3>
                <button className="btn-gold" onClick={() => window.open(tradeLink, '_blank')}>Enter Secure Vault</button>
              </div>
            )}

            <div style={{
              backgroundColor: '#0a0a0a',
              border: '1px solid #222',
              height: '560px',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <div
                id="chat-messages"
                ref={chatContainerRef}
                onScroll={() => {
                  shouldFollowChatRef.current = isChatNearBottom();
                }}
                style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {messages.map((msg, i) => (
                  <div key={`${msg.id || i}-${i}`} style={{
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
                      {String(msg.sender || 'User').toUpperCase()}
                    </div>
                    {msg.isImage ? (
                      <img src={msg.content} alt="Chat upload" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #333' }} />
                    ) : (
                      <div style={{ color: msg.isAI ? '#fff' : (msg.isSystem ? '#888' : '#eee') }}>{msg.content}</div>
                    )}
                  </div>
                ))}
                {isTyping && <div style={{ color: 'var(--gold)', fontSize: '0.8rem', paddingLeft: '10px' }}>AI Trade Assistant is typing...</div>}
                <div ref={chatEndRef} />
              </div>

              {chatImage && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid #222', backgroundColor: '#0d0d0d' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={chatImage} alt="Chat preview" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--gold)' }} />
                    <span style={{ color: '#ccc', fontSize: '0.85rem', flex: 1 }}>{chatImageName}</span>
                    <button type="button" className="btn-outline-gold" onClick={() => { setChatImage(''); setChatImageName(''); }}>Remove</button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} style={{ padding: '20px', borderTop: '1px solid #222', display: 'flex', gap: '10px', backgroundColor: '#0d0d0d', alignItems: 'center' }}>
                <label className="btn-outline-gold" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Image
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(e) => readChatImage(e.target.files[0])} style={{ display: 'none' }} />
                </label>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isAdmin && !isParticipant ? 'Join the active trade chat as admin...' : 'Message the other trader...'}
                  style={{
                    flex: 1,
                    backgroundColor: '#151515',
                    border: '1px solid #333',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '1rem',
                    padding: '12px 15px',
                    borderRadius: '6px'
                  }}
                />
                <button type="submit" className="btn-gold" disabled={sendingMessage}>{sendingMessage ? 'Sending...' : 'Send'}</button>
              </form>
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <section className="ticket-panel">
              <h2>Middleman Payment</h2>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '14px', color: '#aaa', fontSize: '0.82rem' }}>
                <div><strong style={{ color: '#fff' }}>Status:</strong> {payment.status === 'complete' ? 'Funds secured' : payment.status.replaceAll('_', ' ')}</div>
                {payment.transaction_id && <div><strong style={{ color: '#fff' }}>Transaction:</strong> {payment.transaction_id}</div>}
              </div>

              {canManageMiddleman && ticket?.middleman_user_id && !payment.complete && (
                <div className="ticket-form compact">
                  <label style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>Payment Method</label>
                  <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                    <option value="gcash">GCash</option>
                  </select>
                  <label style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>GCash Option</label>
                  <select value={paymentForm.gcash_option} onChange={(e) => setPaymentForm({ ...paymentForm, gcash_option: e.target.value })}>
                    <option value="number">Direct Number</option>
                    <option value="qr">QR Code</option>
                  </select>
                  {paymentForm.gcash_option === 'number' ? (
                    <input value={paymentForm.gcash_number} onChange={(e) => setPaymentForm({ ...paymentForm, gcash_number: e.target.value })} placeholder="GCash number" />
                  ) : (
                    <>
                      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(e) => readFileAsDataUrl(e.target.files[0], (url) => setPaymentForm({ ...paymentForm, qr_url: url }))} />
                      {paymentForm.qr_url && <img className="evidence-preview" src={paymentForm.qr_url} alt="GCash QR preview" />}
                    </>
                  )}
                  <input type="number" min="0" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="Amount requested" />
                  <textarea value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="Payment instructions" />
                  <button className="btn-gold" onClick={requestPayment} disabled={paymentBusy}>{paymentBusy ? 'Working...' : 'Request Payment'}</button>
                </div>
              )}

              {payment.request && (
                <div style={{ background: '#0a0a0a', border: '1px solid #2d2d2d', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ color: 'var(--gold)', fontWeight: 'bold', marginBottom: '8px' }}>GCash Payment Request</p>
                  {payment.request.amount && <p className="muted">Amount: ${Number(payment.request.amount).toLocaleString()}</p>}
                  {payment.request.gcash_number && <p className="muted">Number: {payment.request.gcash_number}</p>}
                  {payment.request.note && <p className="muted">{payment.request.note}</p>}
                  {payment.request.evidence_url && <img className="evidence-preview" src={payment.request.evidence_url} alt="GCash QR" />}
                </div>
              )}

              {isParticipant && payment.request && !payment.complete && (
                <div className="ticket-form compact">
                  <p className="muted">Upload your payment receipt for middleman review. Images and PDFs are accepted.</p>
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" onChange={(e) => readReceiptFile(e.target.files[0])} />
                  {receiptFile.url && receiptFile.type === 'application/pdf' && <a className="btn-outline-gold" href={receiptFile.url} target="_blank" rel="noreferrer">Preview PDF Receipt</a>}
                  {receiptFile.url && receiptFile.type !== 'application/pdf' && <img className="evidence-preview" src={receiptFile.url} alt="Receipt preview" />}
                  <button className="btn-gold" onClick={submitReceipt} disabled={paymentBusy}>{paymentBusy ? 'Uploading...' : 'Submit Receipt'}</button>
                </div>
              )}

              {payment.receipt && (
                <div style={{ background: '#0a0a0a', border: '1px solid #2d2d2d', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ color: 'var(--gold)', fontWeight: 'bold' }}>Receipt Submitted</p>
                  {payment.receipt.receipt_type === 'application/pdf' ? (
                    <a className="btn-outline-gold" href={payment.receipt.evidence_url} target="_blank" rel="noreferrer">Open Receipt PDF</a>
                  ) : (
                    <img className="evidence-preview" src={payment.receipt.evidence_url} alt="Payment receipt" />
                  )}
                </div>
              )}

              {canManageMiddleman && payment.receipt && !payment.complete && (
                <button className="btn-gold" onClick={completePayment} disabled={paymentBusy}>
                  {paymentBusy ? 'Confirming...' : 'Mark Payment Complete'}
                </button>
              )}

              {payment.complete && <p style={{ color: '#44ff88', fontWeight: 'bold' }}>Payment confirmed by middleman. Funds secured.</p>}
            </section>

            <section className="ticket-panel">
              <h2>Middleman Trade Room</h2>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '16px', fontSize: '0.82rem', color: '#aaa' }}>
                <div><strong style={{ color: '#fff' }}>Trade ID:</strong> #{tradeId}</div>
                <div><strong style={{ color: '#fff' }}>Room:</strong> {ticket?.ticket_code || 'Loading...'}</div>
                <div><strong style={{ color: '#fff' }}>Trader A:</strong> {trade.offerer_username}</div>
                <div><strong style={{ color: '#fff' }}>Trader B:</strong> {trade.owner_username}</div>
                <div><strong style={{ color: '#fff' }}>Status:</strong> {roomStatus}</div>
              </div>

              {!ticket?.middleman_user_id && isAdmin && (
                <div className="ticket-form compact" style={{ marginBottom: '16px' }}>
                  <p className="muted">Admins can join this active trade as the assigned middleman.</p>
                  <input value={middlemanId} onChange={(e) => setMiddlemanId(e.target.value)} placeholder={`Middleman user ID (${userId})`} />
                  <button className="btn-gold" onClick={assignMiddleman}>Join as Middleman</button>
                </div>
              )}

              {canManageMiddleman && ticket?.middleman_user_id ? (
                <div className="ticket-form compact">
                  <textarea placeholder="Action note" value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
                  <input type="file" accept="image/*" onChange={(e) => readFileAsDataUrl(e.target.files[0], setActionEvidence)} />
                  {actionEvidence && <img className="evidence-preview" src={actionEvidence} alt="Action evidence" />}
                  {middlemanActions.map(item => (
                    <button key={item.action} className="btn-outline-gold" onClick={() => performAction(item.action)} disabled={logTypes.has(item.action)}>
                      {logTypes.has(item.action) ? `${item.label} saved` : item.label}
                    </button>
                  ))}
                  <button className="btn-gold" onClick={completeTicket}>Release / Complete Trade</button>
                  <button className="danger-btn" onClick={cancelTicket}>Cancel Trade</button>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: '0.82rem' }}>
                  {isAdmin ? 'Join as middleman to use trade handling actions.' : 'An admin middleman can join this room during the active trade.'}
                </p>
              )}
            </section>

            <section className="ticket-panel">
              <h2>Trade Details</h2>
              <div className="item-declaration-grid" style={{ gridTemplateColumns: '1fr', marginBottom: '12px' }}>
                {[ticket?.creator_user_id, ticket?.joiner_user_id].filter(Boolean).map((participantId, index) => {
                  const submission = items.find(item => Number(item.user_id) === Number(participantId));
                  const label = index === 0 ? 'Trader A' : 'Trader B';
                  return (
                    <div className="declaration-card" style={{ minHeight: 'auto' }} key={participantId}>
                      <h3>{label}</h3>
                      {submission ? (
                        <>
                          {submission.screenshot_url && <img src={submission.screenshot_url} alt={submission.item_name} />}
                          <h4>{submission.item_name}</h4>
                          <p>{submission.game_name} / Qty {submission.quantity}</p>
                          {submission.notes && <p className="muted">{submission.notes}</p>}
                        </>
                      ) : (
                        <p className="muted">No declaration submitted yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {isParticipant && !['Completed', 'Cancelled'].includes(ticket?.status) && (
                <form className="ticket-form" onSubmit={submitItem}>
                  <h3>{mySubmission ? 'Update My Item' : 'Declare My Item'}</h3>
                  <select value={itemForm.post_id} onChange={(e) => setItemForm({ ...itemForm, post_id: e.target.value })} required>
                    <option value="">Select one of your active listings</option>
                    {userListings.map(listing => (
                      <option key={listing.post_id} value={listing.post_id}>
                        {listing.name} / {listing.game} / ${Number(listing.value).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {userListings.length === 0 && <p className="muted">Post a listing first, then return here to declare it.</p>}
                  <button className="btn-gold">Save Declaration</button>
                </form>
              )}
            </section>

            <section className="ticket-panel">
              <h2>Middleman Logs</h2>
              <div className="log-grid" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                {logs.length > 0 ? logs.map(log => (
                  <div className="log-row" style={{ alignItems: 'flex-start', padding: '12px' }} key={log.log_id}>
                    <div>
                      <strong>{log.event_type.replaceAll('_', ' ').toUpperCase()}</strong>
                      <p>{log.message}</p>
                      <span>{log.actor_username || 'System'} / {new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.evidence_url && <img src={log.evidence_url} alt="Evidence" />}
                  </div>
                )) : (
                  <p className="muted">No middleman actions yet.</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.5; transform: scale(1); }
        }

        @media (max-width: 980px) {
          main > div[style*="grid-template-columns: minmax"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px) {
          main div[style*="grid-template-columns: 1fr auto 1fr"] {
            grid-template-columns: 1fr !important;
            gap: 24px;
          }
        }
      `}</style>
      <Footer />
    </div>
  );
}
