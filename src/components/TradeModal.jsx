import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TradeModal = ({ isOpen, onClose, item, user, token }) => {
  const [listings, setListings] = useState([]);
  const [selectedOfferItem, setSelectedOfferItem] = useState('');
  const [selectedMiddleman, setSelectedMiddleman] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchListings();
    }
  }, [isOpen, user]);

  const fetchListings = async () => {
    try {
      const res = await axios.get(`/api/items/listings/${user.user_id}`);
      setListings(res.data);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    }
  };

  const handleSendOffer = async () => {
    if (!selectedOfferItem) {
      alert("Please select an item from your listings to offer!");
      return;
    }

    const selectedMmData = middlemen.find(mm => mm.id === selectedMiddleman);
    if (!selectedMiddleman || !selectedMmData) {
      alert("Please select a trusted middleman for this trade!");
      return;
    }

    if (selectedMmData.status === 'busy') {
      alert("This middleman is currently busy/unavailable. Please choose an available one (Green).");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/trades/offer", {
        item_offered: selectedOfferItem,
        item_requested: item.id,
        middleman: selectedMiddleman,
        message: message
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Trade offer sent successfully with middleman request!");
      onClose();
    } catch (err) {
      console.error("Trade Error:", err.response?.data || err.message);
      alert(`Error sending offer: ${err.response?.data?.error || "Server error"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const middlemen = [
    { id: 'mm1', name: 'Official QuickTrade Bot (Automated)', fee: '1%', status: 'available' },
    { id: 'mm2', name: 'Senior Moderator Alex', fee: '2.5%', status: 'available' },
    { id: 'mm3', name: 'Trusted Trader Sam', fee: '2%', status: 'busy' }
  ];

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'var(--black-light)', border: '1px solid var(--gold)',
        padding: '30px', borderRadius: '15px', width: '500px', maxWidth: '90%'
      }}>
        <h2 className="gold-glow" style={{ marginBottom: '20px' }}>Make a Trade Offer</h2>
        
        <div className="offer-summary" style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
          <img src={item.image} alt={item.name} style={{ width: '100px', height: '100px', objectFit: 'contain', border: '1px solid #333' }} />
          <div>
            <h3>{item.name}</h3>
            <p style={{ color: 'var(--gold)' }}>Value: ${item.value}</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-gray)' }}>Game: {item.game}</p>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px' }}>Your Offer (From My Listings)</label>
          <select 
            value={selectedOfferItem}
            onChange={(e) => setSelectedOfferItem(e.target.value)}
            style={{
              width: '100%', padding: '12px', backgroundColor: 'var(--black)',
              border: '1px solid var(--gold)', color: 'white', borderRadius: '8px'
            }}
          >
            <option value="">Select an item from your listings...</option>
            {listings.length > 0 ? (
              listings.map(listItem => (
                <option key={listItem.post_id} value={listItem.post_id}>
                  {listItem.name} (${listItem.value})
                </option>
              ))
            ) : (
              <option disabled>No active listings found. Please list an item first.</option>
            )}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px' }}>Choose Middleman *</label>
          <select 
            value={selectedMiddleman}
            onChange={(e) => setSelectedMiddleman(e.target.value)}
            style={{
              width: '100%', padding: '12px', backgroundColor: 'var(--black)',
              border: '1px solid var(--gold)', color: 'white', borderRadius: '8px'
            }}
          >
            <option value="">Select a trusted middleman...</option>
            {middlemen.map(mm => (
              <option 
                key={mm.id} 
                value={mm.id} 
                style={{ color: mm.status === 'available' ? '#28a745' : '#dc3545' }}
              >
                {mm.status === 'available' ? '●' : '○'} {mm.name} (Fee: {mm.fee}) — {mm.status === 'available' ? 'Available' : 'Busy'}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginTop: '5px' }}>
            Middlemen ensure trade safety by holding items in escrow.
          </p>
        </div>

        <div className="form-group" style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px' }}>Message (Optional)</label>
          <textarea 
            placeholder="Add a message to your offer..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              width: '100%', padding: '12px', backgroundColor: 'var(--black)',
              border: '1px solid var(--gold)', color: 'white', borderRadius: '8px',
              height: '80px', resize: 'none'
            }}
          ></textarea>
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: '15px' }}>
          <button 
            className="btn-gold" 
            style={{ flex: 1 }} 
            onClick={handleSendOffer}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Offer'}
          </button>
          <button className="btn-outline-gold" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default TradeModal;
