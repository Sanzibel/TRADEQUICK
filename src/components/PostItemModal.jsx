import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PostItemModal = ({ isOpen, onClose, onPost }) => {
  const [games, setGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    game: '',
    category: '',
    description: '',
    value: '',
    tags: '',
    preferences: '',
    visibility: 'public'
  });

  useEffect(() => {
    if (isOpen) {
      fetchGames();
      fetchCategories();
    }
  }, [isOpen]);

  const fetchGames = async () => {
    try {
      const res = await axios.get('/api/admin/games');
      if (res.data.length > 0) {
        setGames(res.data.map(g => g.name));
        if (!formData.game) setFormData(prev => ({ ...prev, game: res.data[0].name }));
      } else {
        const fallback = ["Counter Strike 2", "Roblox", "Dota 2", "Warframe"];
        setGames(fallback);
        if (!formData.game) setFormData(prev => ({ ...prev, game: fallback[0] }));
      }
    } catch (err) {
      const fallback = ["Counter Strike 2", "Roblox", "Dota 2", "Warframe"];
      setGames(fallback);
      if (!formData.game) setFormData(prev => ({ ...prev, game: fallback[0] }));
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/admin/categories');
      if (res.data.length > 0) {
        setCategories(res.data.map(c => c.name));
        if (!formData.category) setFormData(prev => ({ ...prev, category: res.data[0].name }));
      } else {
        const fallback = ["Skins", "Cosmetics", "Limiteds", "Weapons", "Mounts"];
        setCategories(fallback);
        if (!formData.category) setFormData(prev => ({ ...prev, category: fallback[0] }));
      }
    } catch (err) {
      const fallback = ["Skins", "Cosmetics", "Limiteds", "Weapons", "Mounts"];
      setCategories(fallback);
      if (!formData.category) setFormData(prev => ({ ...prev, category: fallback[0] }));
    }
  };
  const [screenshot, setScreenshot] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size exceeds 2MB limit for the demo!");
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert("Invalid file type! Please upload a JPG, PNG, or WEBP image.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result); // This is the base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onPost({ ...formData, screenshot_url: screenshot });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'var(--black-light)', border: '1px solid var(--gold)',
        padding: '30px', borderRadius: '15px', width: '600px', maxWidth: '90%',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h2 className="gold-glow" style={{ marginBottom: '20px' }}>List New Item</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Item Name *</label>
            <input 
              type="text" name="name" required
              value={formData.name} onChange={handleChange}
              style={{ width: '100%', padding: '10px', backgroundColor: 'var(--black)', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
            />
          </div>

          <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Game *</label>
              <select 
                name="game" value={formData.game} onChange={handleChange}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--black)', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
              >
                {games.map(game => <option key={game}>{game}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Category *</label>
              <select 
                name="category" value={formData.category} onChange={handleChange}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--black)', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
              >
                {categories.map(cat => <option key={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Estimated Value ($) *</label>
              <input 
                type="number" name="value" required
                value={formData.value} onChange={handleChange}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--black)', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Visibility</label>
              <select 
                name="visibility" value={formData.visibility} onChange={handleChange}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--black)', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
            <textarea 
              name="description" value={formData.description} onChange={handleChange}
              style={{ width: '100%', padding: '10px', backgroundColor: 'var(--black)', border: '1px solid #444', color: 'white', borderRadius: '5px', height: '80px', resize: 'none' }}
            ></textarea>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Tags</label>
              <input 
                type="text" name="tags" placeholder="rare, limited"
                value={formData.tags} onChange={handleChange}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--black)', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Trade Preferences</label>
            <input 
              type="text" name="preferences" placeholder="Desired item or value range..."
              value={formData.preferences} onChange={handleChange}
              style={{ width: '100%', padding: '10px', backgroundColor: 'var(--black)', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Upload Screenshot (Max 2MB)</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileChange}
              style={{ color: 'var(--text-gray)', marginBottom: '10px' }} 
            />
            {screenshot && (
              <div className="image-preview" style={{ marginTop: '10px', border: '1px solid var(--gold)', padding: '5px', borderRadius: '5px' }}>
                <img src={screenshot} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }} />
                <button 
                  type="button" 
                  onClick={() => setScreenshot(null)}
                  style={{ display: 'block', marginTop: '5px', color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ display: 'flex', gap: '15px' }}>
            <button type="submit" className="btn-gold" style={{ flex: 1 }}>Submit Listing</button>
            <button type="button" className="btn-outline-gold" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostItemModal;
