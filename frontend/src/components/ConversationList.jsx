import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ConversationList({ conversations, activeId, onSelect }) {
  const { user } = useAuth();

  if (conversations.length === 0) {
    return (
      <div className="conv-list">
        <div className="helper-text" style={{ padding: 24 }}>
          <p style={{ fontWeight: 600, color: 'var(--navy)' }}>No conversations yet</p>
          <p style={{ fontSize: 13 }}>Click "Message Seller" on any item page to start a chat thread.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="conv-list">
      {conversations.map((c) => {
        const otherPerson = String(c.buyer?._id) === String(user.id) ? c.seller : c.buyer;
        return (
          <div
            key={c._id}
            className={`conv-item ${activeId === c._id ? 'active' : ''}`}
            onClick={() => onSelect(c)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="conv-title">{c.product?.title || 'Listing'}</div>
            </div>
            <div className="conv-sub" style={{ fontWeight: 500, color: 'var(--navy)' }}>
              with {otherPerson?.name || 'User'}
            </div>
            <div className="conv-sub">
              {c.lastMessage || 'Start conversation 👋'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
