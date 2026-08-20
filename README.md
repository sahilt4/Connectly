# Connectly — Modern, Private Communication Web Application

![Connectly](https://img.shields.io/badge/Connectly-v2.0-indigo?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-emerald?style=for-the-badge)

**Connectly** is a fast, end-to-end communication web platform designed with an **Apple iOS liquid-glass aesthetic**, real-time peer-to-peer audio calling, 24-hour stories, voice messaging with interactive waveforms, disappearing messages, and privacy controls.

---

## 🌟 Key Features

- **⚡ Real-Time Instant Messaging**: Low-latency Socket.IO messaging with typing indicators, delivery checkmarks, and message reactions.
- **📸 24-Hour Ephemeral Stories**: Photo, video, and rich gradient text stories with stickers, custom privacy (Everyone / Close Friends), and auto-progressing viewer.
- **🎤 Waveform Voice Messages**: In-chat browser audio recording with live waveform visualizer and seekable multi-speed player (1x, 1.5x, 2x).
- **📞 WebRTC Audio Calling**: Peer-to-peer audio calls with incoming ringtone dialog, live call timer, mute/speaker toggles, and call history.
- **🤝 Connections Network**: Send/accept connection requests, find people by username or unique Public ID (`USR-XXXXX`).
- **📁 Shared Media Drawer**: Categorized tabs for Photos & Videos, Voice Messages, Files & Documents, and Links.
- **⏱️ Disappearing Messages**: Configurable per-chat expiration timers (After Viewing, 1 Hour, 24 Hours, 7 Days).
- **🔲 QR Profile ("Scan to Connect")**: Instant connection QR cards with public ID search.
- **🎨 Neo-Cyber iOS Glass Aesthetics**: Frosted liquid glass blurs, ambient glowing orbs, and spring micro-interactions.
- **🔒 Granular Privacy**: Control story visibility, connection requests, online status, and read receipts.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Date-fns, WebRTC
- **Backend**: Node.js, Express.js, Socket.IO, Mongoose, JWT, Multer
- **Database**: MongoDB Atlas Cloud Database (with persistent local fallback)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB Atlas account or local MongoDB

### 2. Installation

Clone the repository:
```bash
git clone https://github.com/<your-username>/Connectly.git
cd Connectly
```

Install server dependencies:
```bash
cd server
npm install
```

Install client dependencies:
```bash
cd ../client
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `server` directory:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secret_jwt_key
JWT_EXPIRE=30d
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/communication_app
EMAIL_FROM="Connectly" <noreply@connectly.app>
```

### 4. Running Locally

Start the backend server:
```bash
cd server
node server.js
```

Start the Vite development frontend:
```bash
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 👤 Developer
**Build by Sahil Thorat**
