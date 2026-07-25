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
    conversation && (String(conversation.buyer._id) === String(user.id) ? conversation.seller : conversation.buyer);

  // Load message history, then join the socket room for live updates.
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
        typingTimeout.current = setTimeout(() => setTypingUser(null), 2000);
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
    return <div className="chat-window"><div className="empty-state">Pick a conversation to start chatting</div></div>;
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <strong>{otherPerson?.name}</strong>
        <div className="card-meta">re: {conversation.product?.title}</div>
      </div>

      <div className="chat-messages">
        {loading && <p className="helper-text">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <p className="helper-text">No messages yet — say hello to {otherPerson?.name}.</p>
        )}
        {messages.map((m) => {
          const mine = String(m.sender._id || m.sender) === String(user.id);
          return (
            <div key={m._id} className={`msg-bubble ${mine ? 'msg-mine' : 'msg-theirs'}`}>
              {m.text}
              <div className="msg-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {typingUser && <div className="typing-indicator">{typingUser} is typing…</div>}

      <form className="chat-input-bar" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type a message…"
          value={text}
          onChange={handleTypingInput}
        />
        <button type="submit" className="btn btn-navy">Send</button>
      </form>
    </div>
  );
}
