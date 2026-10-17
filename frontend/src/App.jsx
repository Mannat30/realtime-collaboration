
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

  // Group chat
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');

  const [connectionStatus, setConnectionStatus] =
      useState('Connecting...');

  const [chatError, setChatError] = useState('');

  // Private chat
  const [receiverEmail, setReceiverEmail] = useState('');
  const [privateContent, setPrivateContent] = useState('');
  const [privateMessages, setPrivateMessages] = useState([]);
  const [privateError, setPrivateError] = useState('');
  const [privateLoading, setPrivateLoading] = useState(false);

  const clientRef = useRef(null);
  const selectedRecipientRef = useRef('');

  // Keep the currently selected conversation available to
  // the WebSocket callback without reconnecting on every keystroke.
  selectedRecipientRef.current = receiverEmail.trim().toLowerCase();

  const isRegister = mode === 'register';

  // Connect to the authenticated WebSocket and load group history.
  useEffect(() => {
    if (!token) return undefined;

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
              `Could not load group history (HTTP ${
                  err.response?.status || 'network error'
              }).`
          );
        }
      }

      if (!active) return;

      client = new Client({
        brokerURL: 'ws://localhost:8080/ws',

        // JWT is sent in the STOMP CONNECT frame.
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },

        reconnectDelay: 5000,

        onConnect: () => {
          if (!active) return;

          setConnectionStatus('Connected');
          setChatError('');

          // Subscribe to group messages.
          client.subscribe('/topic/messages', (frame) => {
            try {
              const message = JSON.parse(frame.body);

              if (!active) return;

              setMessages((previous) => {
                if (
                    message.id != null &&
                    previous.some((item) => item.id === message.id)
                ) {
                  return previous;
                }

                return [...previous, message];
              });
            } catch (err) {
              console.error('Invalid group message:', err);
            }
          });

          // Subscribe to messages delivered to this authenticated user.
          client.subscribe('/user/queue/private', (frame) => {
            try {
              const message = JSON.parse(frame.body);

              if (!active) return;

              const me = currentEmail.trim().toLowerCase();
              const selected =
                  selectedRecipientRef.current;

              const sender = (
                  message.senderEmail || ''
              ).toLowerCase();

              const receiver = (
                  message.receiverEmail || ''
              ).toLowerCase();

              // Display a private message only in its matching
              // conversation. The backend still enforces access.
              const belongsToSelectedConversation =
                  selected &&
                  (
                      (sender === me && receiver === selected) ||
                      (sender === selected && receiver === me)
                  );

              if (!belongsToSelectedConversation) return;

              setPrivateMessages((previous) => {
                if (
                    message.id != null &&
                    previous.some((item) => item.id === message.id)
                ) {
                  return previous;
                }

                return [...previous, message];
              });
            } catch (err) {
              console.error('Invalid private message:', err);
            }
          });
        },

        onWebSocketError: (err) => {
          if (active) {
            setConnectionStatus('Connection error');
          }

          console.error('WebSocket error:', err);
        },

        onStompError: (frame) => {
          if (active) {
            setConnectionStatus('Chat error');
            setChatError(
                'Chat connection rejected. Check JWT authentication and backend logs.'
            );
          }

          console.error(
              'STOMP error:',
              frame.headers,
              frame.body
          );
        },

        onDisconnect: () => {
          if (active) {
            setConnectionStatus('Disconnected');
          }
        }
      });

      clientRef.current = client;
      client.activate();
    }

    void startChat();

    return () => {
      active = false;

      if (client) {
        if (clientRef.current === client) {
          clientRef.current = null;
        }

        void client.deactivate();
      }
    };
  }, [token, currentEmail]);

  function handleChange(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  }

  // Register or log in.
  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (isRegister) {
        const response = await axios.post(`${API}/register`, {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password
        });

        setMode('login');

        setNotice(
            typeof response.data === 'string'
                ? response.data
                : 'Registration successful! Please log in.'
        );

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

        if (typeof jwt !== 'string' || !jwt.trim()) {
          throw new Error(
              'JWT token was not returned by the login API.'
          );
        }

        const email = form.email.trim();
        const name = email.split('@')[0] || 'User1';

        sessionStorage.setItem('token', jwt.trim());
        sessionStorage.setItem('email', email);
        sessionStorage.setItem('displayName', name);

        setCurrentEmail(email);
        setDisplayName(name);
        setToken(jwt.trim());

        setMessages([]);
        setPrivateMessages([]);
        setNotice('');
        setChatError('');
        setPrivateError('');
      }
    } catch (err) {
      const serverMessage =
          err.response?.data?.message ||
          (
              typeof err.response?.data === 'string'
                  ? err.response.data
                  : ''
          );

      setError(
          serverMessage ||
          err.message ||
          'Request failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  // Send a group message.
  function sendMessage(event) {
    event.preventDefault();

    const text = content.trim();
    const client = clientRef.current;

    if (!text) return;

    if (!client?.connected) {
      setChatError('WebSocket is not connected.');
      return;
    }

    try {
      client.publish({
        destination: '/app/chat',
        body: JSON.stringify({
          content: text
        })
      });

      setContent('');
      setChatError('');
    } catch (err) {
      console.error('Group message error:', err);
      setChatError('Could not send the group message.');
    }
  }

  // Load conversation between the current user and the selected recipient.
  async function loadPrivateHistory(event) {
    event.preventDefault();

    const recipient = receiverEmail.trim();

    if (!recipient) {
      setPrivateError('Enter the recipient email.');
      return;
    }

    if (recipient.toLowerCase() === currentEmail.toLowerCase()) {
      setPrivateError('Choose another registered user.');
      return;
    }

    selectedRecipientRef.current = recipient.toLowerCase();

    setPrivateLoading(true);
    setPrivateError('');
    setPrivateMessages([]);

    try {
      const response = await axios.get('/api/private/messages', {
        params: {
          with: recipient
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setPrivateMessages(
          Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setPrivateError(
          `Could not load private history (HTTP ${
              err.response?.status || 'network error'
          }).`
      );
    } finally {
      setPrivateLoading(false);
    }
  }

  // Send a private message; sender identity is established by the backend.
  function sendPrivateMessage(event) {
    event.preventDefault();

    const recipient = receiverEmail.trim();
    const text = privateContent.trim();
    const client = clientRef.current;

    if (!recipient || !text) {
      setPrivateError('Enter a recipient and message.');
      return;
    }

    if (recipient.toLowerCase() === currentEmail.toLowerCase()) {
      setPrivateError('You cannot send a private message to yourself.');
      return;
    }

    if (!client?.connected) {
      setPrivateError('WebSocket is not connected.');
      return;
    }

    selectedRecipientRef.current = recipient.toLowerCase();

    try {
      client.publish({
        destination: '/app/private-chat',
        body: JSON.stringify({
          receiverEmail: recipient,
          content: text
        })
      });

      setPrivateContent('');
      setPrivateError('');
    } catch (err) {
      console.error('Private message error:', err);
      setPrivateError('Could not send the private message.');
    }
  }

  function logout() {
    // The effect cleanup disconnects the WebSocket when the token clears.
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('displayName');

    setToken('');
    setCurrentEmail('');
    setDisplayName('User1');

    setMessages([]);
    setContent('');

    setReceiverEmail('');
    setPrivateContent('');
    setPrivateMessages([]);

    setError('');
    setNotice('');
    setChatError('');
    setPrivateError('');
    setConnectionStatus('Disconnected');
    setMode('login');
  }

  // Login and registration UI.
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

  // Authenticated chat dashboard.
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
          <span
              className={
                connectionStatus === 'Connected'
                    ? 'status-dot'
                    : 'status-dot status-dot-offline'
              }
          />
            WebSocket: {connectionStatus}
          </div>

          {chatError && (
              <div className="alert error" role="alert">
                {chatError}
              </div>
          )}

          <label className="name-field">
            Display name
            <input
                value={displayName}
                onChange={(event) => {
                  const name = event.target.value;
                  setDisplayName(name);
                  sessionStorage.setItem('displayName', name);
                }}
                maxLength={50}
                required
            />
          </label>

          <div className="chat-toolbar">
            <h2>Group Chat</h2>
            <span>{messages.length} loaded</span>
          </div>

          <div className="chat-list" aria-live="polite">
            {messages.length === 0 ? (
                <div className="empty-chat">
                  No group messages yet. Start the conversation!
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
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }
                              )}
                            </time>
                        )}
                      </div>

                      <p>{message.content}</p>
                    </article>
                ))
            )}
          </div>

          <form className="chat-compose" onSubmit={sendMessage}>
            <input
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write a group message..."
                maxLength={2000}
                required
            />

            <button
                className="primary-button"
                type="submit"
            >
              Send
            </button>
          </form>

          <p className="small-note">
            Group messages are saved to chat history.
          </p>

          {/* Private chat */}
          <section className="private-chat">
            <p className="eyebrow">ONE-TO-ONE MESSAGING</p>
            <h2>Private Chat</h2>

            <form
                className="private-recipient-form"
                onSubmit={loadPrivateHistory}
            >
              <label>
                Recipient email
                <input
                    type="email"
                    value={receiverEmail}
                    onChange={(event) =>
                        setReceiverEmail(event.target.value)
                    }
                    placeholder="friend@example.com"
                    required
                />
              </label>

              <button
                  className="primary-button"
                  type="submit"
                  disabled={privateLoading}
              >
                {privateLoading ? 'Loading...' : 'Load Conversation'}
              </button>
            </form>

            {privateError && (
                <div className="alert error" role="alert">
                  {privateError}
                </div>
            )}

            <div
                className="chat-list private-chat-list"
                aria-live="polite"
            >
              {privateMessages.length === 0 ? (
                  <div className="empty-chat">
                    Select a registered user to view the private conversation.
                  </div>
              ) : (
                  privateMessages.map((message, index) => (
                      <article
                          className="chat-message"
                          key={message.id ?? `${message.sentAt}-${index}`}
                      >
                        <div className="chat-message-meta">
                          <strong>
                            {message.senderEmail?.toLowerCase() ===
                            currentEmail.toLowerCase()
                                ? 'You'
                                : message.senderEmail}
                          </strong>

                          {message.sentAt && (
                              <time>
                                {new Date(message.sentAt).toLocaleTimeString(
                                    [],
                                    {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }
                                )}
                              </time>
                          )}
                        </div>

                        <p>{message.content}</p>
                      </article>
                  ))
              )}
            </div>

            <form
                className="chat-compose"
                onSubmit={sendPrivateMessage}
            >
              <input
                  value={privateContent}
                  onChange={(event) =>
                      setPrivateContent(event.target.value)
                  }
                  placeholder="Write a private message..."
                  maxLength={2000}
                  required
              />

              <button
                  className="primary-button"
                  type="submit"
              >
                Send privately
              </button>
            </form>

            <p className="small-note">
              Private messages are stored separately from group messages.
            </p>
          </section>
        </section>
      </main>
  );
}

export default App;
