import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Footer from '../components/Footer';
import { toast } from '../utils/notifications.jsx';
import { clearAuthSession } from '../utils/auth';
import './tickets.css';

export default function TradeTickets() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [tickets, setTickets] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user) fetchTickets();
  }, [user]);

  const logout = () => {
    clearAuthSession();
    setToken(null);
    navigate('/');
  };

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`/api/tickets/user/${user.user_id}`);
      setTickets(res.data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    }
  };

  const createTicket = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/tickets', {
        creator_user_id: user.user_id,
        invite_note: inviteNote
      });
      navigate(`/ticket/${res.data.ticket.ticket_code}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const joinTicket = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/tickets/join', {
        ticket_code: joinCode.trim(),
        user_id: user.user_id
      });
      navigate(`/ticket/${res.data.ticket.ticket_code}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ticket-page">
      <TopBar token={token} logout={logout} />

      <main className="ticket-shell">
        <div className="ticket-header">
          <div>
            <h1 className="gold-glow">Trade Tickets</h1>
            <p>Open a middleman-assisted trade room, invite the other trader, declare items, and complete verification with a human admin.</p>
          </div>
          {isAdmin && <Link to="/admin" className="btn-outline-gold">Admin Queue</Link>}
        </div>

        {!user ? (
          <div className="ticket-panel empty-state">
            <h2>Please sign in to manage trade tickets.</h2>
            <Link to="/login" className="btn-gold">Sign In</Link>
          </div>
        ) : (
          <>
            <section className="ticket-actions-grid">
              <div className="ticket-panel">
                <h2>Open Ticket</h2>
                <p className="muted">Creates a unique ticket ID and invite link for User B.</p>
                <textarea
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="Optional trade note or invite context..."
                />
                <button className="btn-gold" onClick={createTicket} disabled={loading}>
                  {loading ? 'Working...' : 'Create Trade Ticket'}
                </button>
              </div>

              <form className="ticket-panel" onSubmit={joinTicket}>
                <h2>Join Ticket</h2>
                <p className="muted">Paste the ticket ID shared by User A.</p>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="QT-..."
                  required
                />
                <button className="btn-gold" disabled={loading}>Join as User B</button>
              </form>
            </section>

            <section className="ticket-panel">
              <div className="section-title-row">
                <h2>My Tickets</h2>
                <button className="btn-outline-gold" onClick={fetchTickets}>Refresh</button>
              </div>

              <div className="ticket-list">
                {tickets.length > 0 ? tickets.map(ticket => (
                  <Link to={`/ticket/${ticket.ticket_code}`} className="ticket-row" key={ticket.ticket_id}>
                    <div>
                      <span className="ticket-code">{ticket.ticket_code}</span>
                      <p>{ticket.creator_username || 'User A'} / {ticket.joiner_username || 'Waiting for User B'}</p>
                    </div>
                    <div>
                      <span className={`ticket-status status-${ticket.status.toLowerCase().replaceAll(' ', '-')}`}>
                        {ticket.status}
                      </span>
                      <p>{new Date(ticket.updated_at || ticket.created_at).toLocaleString()}</p>
                    </div>
                  </Link>
                )) : (
                  <p className="muted">No trade tickets yet.</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
