import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';

export default function Chat() {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/chat').then(({ data }) => {
      setConversations(data.items);
      setLoading(false);

      const preselectId = location.state?.conversationId;
      if (preselectId) {
        const match = data.items.find((c) => c._id === preselectId);
        if (match) setActive(match);
      } else if (data.items.length > 0) {
        setActive(data.items[0]);
      }
    });
  }, [location.state]);

  return (
    <div className="container page">
      <h1 className="page-title">Messages</h1>
      <p className="page-sub">Chat directly with buyers and sellers.</p>

      {loading ? (
        <p>Loading conversations…</p>
      ) : (
        <div className="chat-layout">
          <ConversationList conversations={conversations} activeId={active?._id} onSelect={setActive} />
          <ChatWindow conversation={active} />
        </div>
      )}
    </div>
  );
}
