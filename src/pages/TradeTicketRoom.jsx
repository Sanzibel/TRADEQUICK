import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';
import './tickets.css';

const steps = [
  { status: 'Waiting for User B', label: 'User B Joins' },
  { status: 'Pending', label: 'Items Declared' },
  { status: 'Middleman Assigned', label: 'Middleman Assigned' },
  { status: 'In Verification', label: 'Verification' },
  { status: 'Completed', label: 'Completed' }
];

const middlemanActions = [
  { action: 'received_a', label: 'Received from User A' },
  { action: 'verified_a', label: 'Verify User A Item' },
  { action: 'received_b', label: 'Received from User B' },
  { action: 'verified_b', label: 'Verify User B Item' }
];

export default function TradeTicketRoom() {
  const { ticketCode } = useParams();
  const navigate = useNavigate();
  const pollingRef = useRef(null);
  const [token] = useState(localStorage.getItem('token'));
  const [user] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [payload, setPayload] = useState(null);
  const [itemForm, setItemForm] = useState({
    game_name: '',
    item_name: '',
    quantity: 1,
    screenshot_url: '',
    notes: ''
  });
  const [middlemanId, setMiddlemanId] = useState('');
  const [actionEvidence, setActionEvidence] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [loading, setLoading] = useState(true);

  const ticket = payload?.ticket;
  const items = payload?.items || [];
  const logs = payload?.logs || [];
  const history = payload?.history || [];

  const mySubmission = useMemo(() => {
    if (!user) return null;
    return items.find(item => Number(item.user_id) === Number(user.user_id));
  }, [items, user]);

  const role = useMemo(() => {
    if (!ticket || !user) return 'viewer';
    if (Number(ticket.creator_user_id) === Number(user.user_id)) return 'creator';
    if (Number(ticket.joiner_user_id) === Number(user.user_id)) return 'joiner';
    if (Number(ticket.middleman_user_id) === Number(user.user_id)) return 'middleman';
    return 'viewer';
  }, [ticket, user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchTicket();
    pollingRef.current = setInterval(fetchTicket, 5000);
    return () => clearInterval(pollingRef.current);
  }, [ticketCode]);

  useEffect(() => {
    if (mySubmission) {
      setItemForm({
        game_name: mySubmission.game_name || '',
        item_name: mySubmission.item_name || '',
        quantity: mySubmission.quantity || 1,
        screenshot_url: mySubmission.screenshot_url || '',
        notes: mySubmission.notes || ''
      });
    }
  }, [mySubmission?.item_submission_id]);

  const fetchTicket = async () => {
    try {
      const res = await axios.get(`/api/tickets/${ticketCode}`);
      setPayload(res.data);
    } catch (err) {
      console.error('Failed to fetch ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const readFileAsDataUrl = (file, callback) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  };

  const submitItem = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/tickets/${ticketCode}/items`, {
        user_id: user.user_id,
        ...itemForm,
        quantity: Number(itemForm.quantity)
      });
      setPayload(res.data);
      alert('Item declaration saved.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save item declaration');
    }
  };

  const joinAsUserB = async () => {
    try {
      const res = await axios.post('/api/tickets/join', {
        ticket_code: ticketCode,
        user_id: user.user_id
      });
      setPayload(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join ticket');
    }
  };

  const assignMiddleman = async () => {
    try {
      const res = await axios.post(`/api/tickets/${ticketCode}/assign-middleman`, {
        middleman_user_id: Number(middlemanId || user.user_id),
        actor_user_id: user.user_id
      });
      setPayload(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign middleman');
    }
  };

  const performAction = async (action) => {
    try {
      const res = await axios.post(`/api/tickets/${ticketCode}/middleman-action`, {
        actor_user_id: user.user_id,
        action,
        evidence_url: actionEvidence,
        note: actionNote
      });
      setPayload(res.data);
      setActionEvidence('');
      setActionNote('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save action');
    }
  };

  const completeTicket = async () => {
    try {
      const res = await axios.post(`/api/tickets/${ticketCode}/complete`, {
        actor_user_id: user.user_id,
        evidence_url: actionEvidence,
        note: actionNote
      });
      setPayload(res.data);
      alert('Trade completed and logged.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete ticket');
    }
  };

  const cancelTicket = async () => {
    if (!window.confirm('Cancel this trade ticket?')) return;
    try {
      const res = await axios.post(`/api/tickets/${ticketCode}/cancel`, {
        actor_user_id: user.user_id,
        reason: actionNote || 'Cancelled from trade room.'
      });
      setPayload(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel ticket');
    }
  };

  if (loading) {
    return <div className="ticket-loading gold-glow">Loading trade ticket...</div>;
  }

  if (!ticket) {
    return <div className="ticket-loading">Ticket not found.</div>;
  }

  const isParticipant = ['creator', 'joiner'].includes(role);
  const canJoin = role === 'viewer' && !ticket.joiner_user_id && Number(ticket.creator_user_id) !== Number(user.user_id);
  const isMiddleman = role === 'middleman';

  return (
    <div className="ticket-page">
      <TopBar token={token} />

      <main className="ticket-shell">
        <div className="ticket-room-header">
          <div>
            <span className="ticket-code">{ticket.ticket_code}</span>
            <h1 className="gold-glow">Middleman Trade Room</h1>
            <p>{ticket.creator_username} / {ticket.joiner_username || 'Waiting for User B'} / {ticket.middleman_username || 'No middleman yet'}</p>
          </div>
          <span className={`ticket-status status-${ticket.status.toLowerCase().replaceAll(' ', '-')}`}>{ticket.status}</span>
        </div>

        <section className="ticket-progress">
          {steps.map((step, index) => {
            const currentIndex = steps.findIndex(s => s.status === ticket.status);
            const complete = ticket.status === 'Completed' || (currentIndex >= index && currentIndex !== -1);
            return (
              <div className={`progress-step ${complete ? 'complete' : ''}`} key={step.status}>
                <span>{index + 1}</span>
                <p>{step.label}</p>
              </div>
            );
          })}
        </section>

        <div className="ticket-room-grid">
          <section className="ticket-panel">
            <div className="section-title-row">
              <h2>Trade Items</h2>
              {canJoin && <button className="btn-gold" onClick={joinAsUserB}>Join as User B</button>}
            </div>

            <div className="item-declaration-grid">
              {[ticket.creator_user_id, ticket.joiner_user_id].filter(Boolean).map((participantId, index) => {
                const submission = items.find(item => Number(item.user_id) === Number(participantId));
                const label = index === 0 ? 'User A' : 'User B';
                return (
                  <div className="declaration-card" key={participantId}>
                    <h3>{label}: {index === 0 ? ticket.creator_username : ticket.joiner_username}</h3>
                    {submission ? (
                      <>
                        {submission.screenshot_url && <img src={submission.screenshot_url} alt={submission.item_name} />}
                        <h4>{submission.item_name}</h4>
                        <p>{submission.game_name} / Qty {submission.quantity}</p>
                        {submission.notes && <p className="muted">{submission.notes}</p>}
                      </>
                    ) : (
                      <p className="muted">No item declaration submitted yet.</p>
                    )}
                  </div>
                );
              })}
            </div>

            {isParticipant && !['Completed', 'Cancelled'].includes(ticket.status) && (
              <form className="ticket-form" onSubmit={submitItem}>
                <h3>{mySubmission ? 'Update My Item Declaration' : 'Submit My Item Declaration'}</h3>
                <div className="form-row">
                  <input placeholder="Game name" value={itemForm.game_name} onChange={(e) => setItemForm({ ...itemForm, game_name: e.target.value })} required />
                  <input placeholder="Item name" value={itemForm.item_name} onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })} required />
                  <input type="number" min="1" placeholder="Qty" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} required />
                </div>
                <textarea placeholder="Optional notes" value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} />
                <input type="file" accept="image/*" onChange={(e) => readFileAsDataUrl(e.target.files[0], (url) => setItemForm({ ...itemForm, screenshot_url: url }))} />
                {itemForm.screenshot_url && <img className="evidence-preview" src={itemForm.screenshot_url} alt="Evidence preview" />}
                <button className="btn-gold">Save Declaration</button>
              </form>
            )}
          </section>

          <aside className="ticket-panel">
            <h2>Middleman Controls</h2>
            {!ticket.middleman_user_id && (
              <div className="ticket-form compact">
                <p className="muted">Admins can assign themselves or enter another user ID.</p>
                <input value={middlemanId} onChange={(e) => setMiddlemanId(e.target.value)} placeholder={`Middleman user ID (${user.user_id})`} />
                <button className="btn-gold" onClick={assignMiddleman}>Assign Middleman</button>
              </div>
            )}

            {isMiddleman ? (
              <div className="ticket-form compact">
                <textarea placeholder="Action note" value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
                <input type="file" accept="image/*" onChange={(e) => readFileAsDataUrl(e.target.files[0], setActionEvidence)} />
                {actionEvidence && <img className="evidence-preview" src={actionEvidence} alt="Action evidence" />}
                {middlemanActions.map(item => (
                  <button key={item.action} className="btn-outline-gold" onClick={() => performAction(item.action)}>
                    {item.label}
                  </button>
                ))}
                <button className="btn-gold" onClick={completeTicket}>Mark Trade Completed</button>
                <button className="danger-btn" onClick={cancelTicket}>Cancel Ticket</button>
              </div>
            ) : (
              <p className="muted">Only the assigned middleman can verify received items and complete the trade.</p>
            )}
          </aside>
        </div>

        <section className="ticket-panel">
          <div className="section-title-row">
            <h2>Verification Logs</h2>
            <button className="btn-outline-gold" onClick={fetchTicket}>Refresh</button>
          </div>
          <div className="log-grid">
            {logs.map(log => (
              <div className="log-row" key={log.log_id}>
                <div>
                  <strong>{log.event_type.replaceAll('_', ' ').toUpperCase()}</strong>
                  <p>{log.message}</p>
                  <span>{log.actor_username || 'System'} / {new Date(log.created_at).toLocaleString()}</span>
                </div>
                {log.evidence_url && <img src={log.evidence_url} alt="Evidence" />}
              </div>
            ))}
          </div>
        </section>

        <section className="ticket-panel">
          <h2>Ticket History</h2>
          <div className="history-strip">
            {history.map(entry => (
              <div key={entry.history_id}>
                <span>{entry.previous_status || 'Opened'} {'->'} {entry.new_status}</span>
                <p>{entry.note || 'Status changed'} / {new Date(entry.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
