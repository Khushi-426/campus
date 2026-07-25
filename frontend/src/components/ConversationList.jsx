import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ConversationList({ conversations, activeId, onSelect }) {
  const { user } = useAuth();

  if (conversations.length === 0) {
    return <div className="conv-list"><p className="helper-text" style={{ padding: 16 }}>No conversations yet.</p></div>;
  }

  return (
    <div className="conv-list">
      {conversations.map((c) => {
        const otherPerson = String(c.buyer._id) === String(user.id) ? c.seller : c.buyer;
        return (
          <div
            key={c._id}
            className={`conv-item ${activeId === c._id ? 'active' : ''}`}
            onClick={() => onSelect(c)}
          >
            <div className="conv-title">{c.product?.title || 'Listing removed'}</div>
            <div className="conv-sub">with {otherPerson?.name}</div>
            <div className="conv-sub">{c.lastMessage || 'Say hello 👋'}</div>
          </div>
        );
      })}
    </div>
  );
}
