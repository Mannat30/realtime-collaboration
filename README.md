# Realtime Collaboration Platform

A full-stack real-time messaging application built with React, Spring Boot, WebSockets, JWT authentication, and MySQL.

## Features

- **User Authentication:** Registration and login using JWT.
- **Real-Time Messaging:** Send and receive messages through WebSockets and STOMP.
- **Persistent Chat History:** Store chat messages in MySQL using Spring Data JPA.
- **REST APIs:** Retrieve saved chat messages from the backend.
- **Responsive UI:** React-based interface for authentication and chat.
- **Protected REST Endpoints:** Access authenticated APIs using a JWT bearer token.

## Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- Axios
- STOMP.js
- CSS

**Backend**
- Java 17
- Spring Boot
- Spring Security
- Spring Data JPA
- JWT
- WebSocket and STOMP
- Maven

**Database**
- MySQL

## Project Structure

```text
realtime/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── src/
│   └── main/
│       ├── java/com/realtime/realtime/
│       │   ├── config/
│       │   ├── controller/
│       │   ├── dto/
│       │   ├── entity/
│       │   ├── repository/
│       │   ├── security/
│       │   └── service/
│       └── resources/
│           └── application-example.yaml
└── pom.xml
```

## Prerequisites

- Java 17 or a compatible configured JDK
- Node.js and npm
- MySQL Server
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Mannat30/realtime-collaboration.git
cd realtime-collaboration
```

### 2. Set up MySQL

Create the database:

```sql
CREATE DATABASE realtime_collaboration;
```

### 3. Configure the backend

Create a local `application.yaml` in `src/main/resources/` using `application-example.yaml` as a template.

Configure your local MySQL username, password, and a strong JWT secret appropriate for the application's JWT configuration.

Do not commit real credentials or production secrets to GitHub.

### 4. Run the Spring Boot backend

From the project root, run:

```powershell
.\mvnw.cmd spring-boot:run
```

The backend runs on port `8080` by default.

### 5. Run the React frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

## API and WebSocket Routes

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Authenticate and obtain a JWT |
| GET | `/api/chat/history` | Retrieve saved chat messages |
| WebSocket | `/ws` | Establish a WebSocket connection |
| STOMP destination | `/app/chat` | Send a chat message |
| STOMP topic | `/topic/messages` | Receive broadcast messages |

REST endpoint access depends on the configured Spring Security rules.

## How to Test

1. Register a test account through the React UI.
2. Log in and verify that authentication succeeds.
3. Confirm that the WebSocket connection is established.
4. Send a chat message and verify delivery in connected browser tabs.
5. Query MySQL to confirm that messages are persisted.
6. Refresh the page and verify that saved messages load again.

Example database query:

```sql
SELECT *
FROM chat_messages
ORDER BY id DESC;
```

## Security Notes

This project is intended for learning and local development.

Before deploying it publicly, implement and verify WebSocket authentication, server-side identity validation, appropriate access controls, secure secret management, and production CORS settings. Never trust a client-supplied sender name as proof of identity.

## Future Improvements

- Private conversations and chat rooms
- Online/offline presence
- Typing indicators and delivery status
- User search and contact lists
- Message pagination
- Automated tests and production deployment

## Author

Developed as a full-stack Java and React learning project.
