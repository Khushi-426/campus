import React, { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { getSocket } from '../socket';
import { useAuth } from '../context/AuthContext';

export default function ChatWindow({ conversation }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  const otherPerson =
    conversation && (String(conversation.buyer?._id) === String(user.id) ? conversation.seller : conversation.buyer);

  // Load message history, then join socket room for real-time delivery
  useEffect(() => {
    if (!conversation) return;
    const socket = getSocket();

    setLoading(true);
    api.get(`/chat/${conversation._id}/messages`).then(({ data }) => {
      setMessages(data.items);
      setLoading(false);
    });

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
      socket.emit('leave_conversation', conversation._id);
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [conversation, user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const socket = getSocket();
    socket.emit('send_message', { conversationId: conversation._id, text }, (res) => {
      if (res?.error) console.error(res.error);
    });
    setText('');
  };

  const handleTypingInput = (e) => {
    setText(e.target.value);
    getSocket().emit('typing', { conversationId: conversation._id });
  };

  if (!conversation) {
    return (
      <div className="chat-window">
        <div className="empty-state">
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
          </svg>
          <h3 style={{ margin: '0 0 8px', color: 'var(--navy)' }}>No conversation selected</h3>
          <p className="page-sub" style={{ fontSize: 14 }}>Select a thread from the list on the left to start messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div>
          <strong style={{ fontSize: 16, color: 'var(--navy)' }}>{otherPerson?.name || 'User'}</strong>
          <div className="card-meta" style={{ marginTop: 2 }}>
            Re: {conversation.product?.title || 'Listing'}
          </div>
        </div>
        {conversation.product?.price !== undefined && (
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--rust)', fontSize: 16 }}>
            {conversation.product.price === 0 ? 'FREE' : `₹${conversation.product.price}`}
          </div>
        )}
      </div>

      <div className="chat-messages">
        {loading ? (
          <p className="helper-text">Loading chat history...</p>
        ) : messages.length === 0 ? (
          <div className="helper-text" style={{ padding: 20 }}>
            No messages yet. Send a message to inspect the item or agree on a campus meeting place.
          </div>
        ) : (
          messages.map((m) => {
            const mine = String(m.sender._id || m.sender) === String(user.id);
            return (
              <div key={m._id} className={`msg-bubble ${mine ? 'msg-mine' : 'msg-theirs'}`}>
                {m.text}
                <div className="msg-time">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {typingUser && (
        <div className="typing-indicator">
          💬 {typingUser} is typing...
        </div>
      )}

      <form className="chat-input-bar" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type your message..."
          value={text}
          onChange={handleTypingInput}
        />
        <button type="submit" className="btn btn-navy" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
