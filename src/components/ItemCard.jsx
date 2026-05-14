import React from 'react';

const ItemCard = ({ item, isBookmarked, onTrade, onMessage, onBookmark }) => {
  return (
    <div className="item-card">
      <div className="item-image-container">
        <span className="game-label">{item.game}</span>
        <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} className="item-image" />
        <button 
          className={`bookmark-btn ${isBookmarked ? 'active' : ''}`} 
          onClick={onBookmark}
          style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            color: isBookmarked ? 'var(--gold)' : 'white',
            fontSize: '1.5rem',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
            width: '35px',
            height: '35px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {isBookmarked ? '★' : '☆'}
        </button>
      </div>
      <div className="item-details">
        <h4 className="item-name">{item.name}</h4>
        <p className="item-value">Est. Value: ${item.value}</p>
        <div className="item-actions">
          <button className="btn-trade" onClick={() => onTrade(item)}>Trade</button>
          <button className="btn-message" onClick={() => onMessage(item)}>💬</button>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
