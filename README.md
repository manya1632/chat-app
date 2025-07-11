# 💬 Real-Time Chat App

A sleek, real-time group chat application built with **Next.js**, **WebSockets**, and **Tailwind CSS**, allowing multiple users to chat live with emoji support and smooth UI transitions.

🔗 **Live Demo**: [chat-app-olive-gamma.vercel.app](https://chat-app-olive-gamma.vercel.app)

---

## 🚀 Features

- 🔒 Join with a name and emoji avatar  
- 💬 Real-time messaging using WebSockets  
- 🧑‍🤝‍🧑 Dynamic list of online users  
- 📢 System messages when users join or leave  
- 🎨 Clean, responsive UI with Tailwind CSS  
- 📱 Sticky chat bar for seamless mobile usage  

---

## 🛠 Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS  
- **Backend**: WebSocket (custom Node.js server)  + Typescript
- **Deployment**: Vercel (frontend), Render (backend)

---

## 📦 Installation (Development)

### Clone the repository

```bash
git clone https://github.com/your-username/chat-app.git
cd chat-app
```

### Install dependencies

```bash
npm install
```

### Create .env.local file inside the frontend folder
 
 ```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Start the development server
```bash
npm run dev
```
## 🌐 WebSocket Server Setup

### # Navigate to backend directory 

```bash
cd backend
```

### Install dependencies

```bash
npm install
```

### Create .env file inside the backend folder:
 
 ```bash
PORT=8080
```

### Compile with tsc and run with Node:

```bash
npx tsc
node dist/server.js
```

