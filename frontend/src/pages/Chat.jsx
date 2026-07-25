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
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');

    api.get('/chat')
      .then(({ data }) => {
        if (!isMounted) return;
        setConversations(data.items);

        const preselectId = location.state?.conversationId;
        if (preselectId) {
          const match = data.items.find((c) => c._id === preselectId);
          if (match) setActive(match);
        } else if (data.items.length > 0) {
          setActive(data.items[0]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.response?.data?.message || 'Could not load conversations.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [location.state]);

  return (
    <div className="container page">
      <h1 className="page-title">Messages</h1>
      <p className="page-sub">Chat directly with buyers and sellers.</p>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p className="helper-text" style={{ textAlign: 'left' }}>Loading conversations...</p>
      ) : (
        <div className="chat-layout">
          <ConversationList conversations={conversations} activeId={active?._id} onSelect={setActive} />
          <ChatWindow conversation={active} />
        </div>
      )}
    </div>
  );
}
