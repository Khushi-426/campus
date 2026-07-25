import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { getSocket } from '../socket';
import { useAuth } from '../context/AuthContext';

export default function ChatWindow({ conversation }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  const otherPerson =
    conversation && (String(conversation.buyer?._id) === String(user.id) ? conversation.seller : conversation.buyer);

  useEffect(() => {
    if (!conversation) return;
    const socket = getSocket();

    setLoading(true);
    api.get(`/chat/${conversation._id}/messages`)
      .then(({ data }) => {
        setMessages(data.items);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    socket.emit('join_conversation', conversation._id);

    const handleNewMessage = (msg) => {
      if (msg.conversation === conversation._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleTyping = ({ userId, name }) => {
      if (String(userId) !== String(user.id)) {
        setTypingUser(name);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTypingUser(null), 2500);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [conversation, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  const handleTypingInput = (e) => {
    setText(e.target.value);
    if (!conversation) return;
    const socket = getSocket();
    socket.emit('typing', { conversationId: conversation._id, name: user.name });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !conversation) return;

    const socket = getSocket();
    const payload = {
      conversationId: conversation._id,
      text: text.trim(),
    };

    socket.emit('send_message', payload);
    setText('');
  };

  if (!conversation) {
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', height: 580, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <span style={{ fontSize: 48, marginBottom: 8 }}>💬</span>
        <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-main)' }}>Select a conversation to start chatting</h3>
        <p style={{ fontSize: 13 }}>Chat with buyers & sellers directly on campus.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', height: 580, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      {/* Header Bar (Matching Mockup Photo) */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="user-avatar-wrap">
            <div className="avatar-img" style={{ width: 38, height: 38 }}>
              {otherPerson?.name?.[0] || 'U'}
            </div>
            <span className="online-dot" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>
              {otherPerson?.name || 'Rahul Sharma'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>🟢 Online</div>
          </div>
        </div>

        {conversation.product && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            Item: {conversation.product.title} • ₹{conversation.product.price}
          </div>
        )}
      </div>

      {/* Messages Scroll Area (Matching Mockup Photo Layout) */}
      <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading chat history...</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 'auto', marginBottom: 'auto' }}>
            No messages yet. Send a message to agree on price & library pickup spot!
          </p>
        ) : (
          messages.map((m) => {
            const isMine = String(m.sender?._id || m.sender) === String(user.id);
            const timeStr = new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={m._id || Math.random()}
                style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    background: isMine ? 'var(--primary)' : '#ffffff',
                    color: isMine ? '#ffffff' : 'var(--text-main)',
                    border: isMine ? 'none' : '1px solid var(--border-light)',
                    padding: '10px 16px',
                    borderRadius: 18,
                    borderBottomRightRadius: isMine ? 4 : 18,
                    borderBottomLeftRadius: isMine ? 18 : 4,
                    fontSize: 14,
                    lineHeight: 1.4,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {m.text}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 4, padding: '0 4px' }}>
                  {timeStr}
                </span>
              </div>
            );
          })
        )}

        {typingUser && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            💬 {typingUser} is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box (Matching Mockup Photo Layout) */}
      <form onSubmit={handleSend} style={{ padding: 14, borderTop: '1px solid var(--border-light)', display: 'flex', gap: 10, background: '#ffffff' }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={handleTypingInput}
          style={{ flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
        />
        <button className="btn-purple-solid" style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: 14 }}>
          Send
        </button>
      </form>
    </div>
  );
}
