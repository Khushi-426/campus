import { io } from 'socket.io-client';

let socket = null;

// Lazily create a single shared socket connection, authenticated with the
// same JWT used for REST calls. Reused across the app so we don't open a
// new WebSocket per chat window.
export const getSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem('token');
  const url = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

  socket = io(url, {
    auth: { token },
    autoConnect: true,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
