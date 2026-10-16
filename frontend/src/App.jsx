
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import './App.css';

const API = '/api/auth';

function App() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [token, setToken] = useState(
      () => sessionStorage.getItem('token') || ''
  );

  const [currentEmail, setCurrentEmail] = useState(
      () => sessionStorage.getItem('email') || ''
  );

  const [displayName, setDisplayName] = useState(
      () =>
          sessionStorage.getItem('displayName') ||
          sessionStorage.getItem('email')?.split('@')[0] ||
          'User1'
  );

  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [connectionStatus, setConnectionStatus] =
      useState('Connecting...');
  const [chatError, setChatError] = useState('');

  const clientRef = useRef(null);

  const isRegister = mode === 'register';

  // Connect to chat and load previous messages after login
  useEffect(() => {
    if (!token) return;

    let active = true;
    let client;

    async function startChat() {
      try {
        const response = await axios.get('/api/chat/history', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (active) {
          setMessages(
              Array.isArray(response.data) ? response.data : []
          );
          setChatError('');
        }
      } catch (err) {
        if (active) {
          setChatError(
              `Could not load chat history (HTTP ${
                  err.response?.status || 'network error'
              }).`
          );
        }
      }

      if (!active) return;

      client = new Client({
        brokerURL: 'ws://localhost:8080/ws',
        reconnectDelay: 5000,

        onConnect: () => {
          if (!active) return;

          setConnectionStatus('Connected');

          client.subscribe('/topic/messages', (frame) => {
            try {
              const message = JSON.parse(frame.body);

              if (!active) return;

              setMessages((previous) => {
                // Prevent duplicate display of an already loaded message
                if (
                    message.id != null &&
                    previous.some((item) => item.id === message.id)
                ) {
                  return previous;
                }

                return [...previous, message];
              });
            } catch (err) {
              console.error('Invalid chat message:', err);
            }
          });
        },

        onWebSocketError: () => {
          if (active) {
            setConnectionStatus('Connection error');
          }
        },

        onStompError: (frame) => {
          if (active) {
            setConnectionStatus('Chat error');
          }
          console.error('STOMP error:', frame.headers, frame.body);
        }
      });

      clientRef.current = client;
      client.activate();
    }

    startChat();

    return () => {
      active = false;

      if (client) {
        if (clientRef.current === client) {
          clientRef.current = null;
        }

        void client.deactivate();
      }
    };
  }, [token]);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (isRegister) {
        await axios.post(`${API}/register`, {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password
        });

        setMode('login');
        setNotice('Registration successful! Please log in.');

        setForm({
          name: '',
          email: form.email,
          password: ''
        });
      } else {
        const response = await axios.post(`${API}/login`, {
          email: form.email.trim(),
          password: form.password
        });

        const data = response.data;

        const jwt =
            typeof data === 'string'
                ? data.trim().replace(/^Bearer\s+/i, '')
                : (
                    data?.token ??
                    data?.jwt ??
                    data?.jwtToken ??
                    data?.accessToken ??
                    data?.access_token ??
                    data?.data?.token
                );

        if (!jwt) {
          throw new Error('JWT token was not returned by the API.');
        }

        const email = form.email.trim();
        const name = email.split('@')[0] || 'User1';

        sessionStorage.setItem('token', jwt);
        sessionStorage.setItem('email', email);
        sessionStorage.setItem('displayName', name);

        setCurrentEmail(email);
        setDisplayName(name);
        setToken(jwt);
        setMessages([]);
        setNotice('');
      }
    } catch (err) {
      const serverMessage =
          err.response?.data?.message ||
          (typeof err.response?.data === 'string'
              ? err.response.data
              : '');

      setError(
          serverMessage || err.message || 'Request failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  function sendMessage(event) {
    event.preventDefault();

    const messageText = content.trim();
    const sender = displayName.trim();

    if (!messageText || !sender) return;

    const client = clientRef.current;

    if (!client?.connected) {
      setChatError('Chat is not connected. Please wait and retry.');
      return;
    }

    client.publish({
      destination: '/app/chat',
      body: JSON.stringify({
        sender,
        content: messageText
      })
    });

    setContent('');
    setChatError('');
  }

  function logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('displayName');

    setToken('');
    setCurrentEmail('');
    setDisplayName('User1');
    setMessages([]);
    setContent('');
    setError('');
    setChatError('');
    setNotice('');
    setMode('login');
  }

  // Login and registration screen
  if (!token) {
    return (
        <main className="page">
          <section className="auth-card">
            <div className="brand-icon">✦</div>

            <p className="eyebrow">REALTIME COLLABORATION</p>

            <h1>
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h1>

            <p className="subtitle">
              {isRegister
                  ? 'Join your workspace and start connecting.'
                  : 'Sign in to continue to your workspace.'}
            </p>

            <div className="auth-tabs">
              <button
                  type="button"
                  className={!isRegister ? 'active' : ''}
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setNotice('');
                  }}
              >
                Login
              </button>

              <button
                  type="button"
                  className={isRegister ? 'active' : ''}
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setNotice('');
                  }}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {isRegister && (
                  <label>
                    Full name
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter your name"
                        maxLength={100}
                        autoComplete="name"
                        required
                    />
                  </label>
              )}

              <label>
                Email address
                <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                />
              </label>

              <label>
                Password
                <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete={
                      isRegister ? 'new-password' : 'current-password'
                    }
                    minLength={isRegister ? 6 : undefined}
                    required
                />
              </label>

              {error && (
                  <div className="alert error" role="alert">
                    {error}
                  </div>
              )}

              {notice && (
                  <div className="alert success" role="status">
                    {notice}
                  </div>
              )}

              <button
                  className="primary-button"
                  type="submit"
                  disabled={loading}
              >
                {loading
                    ? 'Please wait...'
                    : isRegister
                        ? 'Create account'
                        : 'Login to workspace'}
              </button>
            </form>

            <p className="small-note">
              Secure authentication powered by Spring Boot and JWT.
            </p>
          </section>
        </main>
    );
  }

  // Logged-in chat screen
  return (
      <main className="page">
        <section className="auth-card chat-card">
          <header className="chat-header">
            <div>
              <p className="eyebrow">REALTIME COLLABORATION</p>
              <h1>Team Chat</h1>
              <p className="subtitle">
                Signed in as {currentEmail}
              </p>
            </div>

            <button
                type="button"
                className="logout-button"
                onClick={logout}
            >
              Log out
            </button>
          </header>

          <div className="success-panel">
            <span className="status-dot"></span>
            WebSocket: {connectionStatus}
          </div>

          <label className="name-field">
            Display name
            <input
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  sessionStorage.setItem(
                      'displayName',
                      event.target.value
                  );
                }}
                maxLength={50}
                required
            />
          </label>

          <div className="chat-toolbar">
            <h2>Messages</h2>
            <span>{messages.length} loaded</span>
          </div>

          <div className="chat-list" aria-live="polite">
            {messages.length === 0 ? (
                <div className="empty-chat">
                  {chatError
                      ? 'Chat history could not be loaded.'
                      : 'No messages yet. Start the conversation!'}
                </div>
            ) : (
                messages.map((message, index) => (
                    <article
                        className="chat-message"
                        key={message.id ?? `${message.sentAt}-${index}`}
                    >
                      <div className="chat-message-meta">
                        <strong>{message.sender}</strong>

                        {message.sentAt && (
                            <time>
                              {new Date(message.sentAt).toLocaleTimeString(
                                  [],
                                  { hour: '2-digit', minute: '2-digit' }
                              )}
                            </time>
                        )}
                      </div>

                      <p>{message.content}</p>
                    </article>
                ))
            )}
          </div>

          {chatError && (
              <div className="alert error" role="alert">
                {chatError}
              </div>
          )}

          <form className="chat-compose" onSubmit={sendMessage}>
            <input
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write a message..."
                maxLength={2000}
                required
            />

            <button className="primary-button" type="submit">
              Send
            </button>
          </form>

          <p className="small-note">
            Messages are saved to your chat history.
          </p>
        </section>
      </main>
  );
}

export default App;
