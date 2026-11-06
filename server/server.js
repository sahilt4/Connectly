import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './sockets/socketHandler.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import callRoutes from './routes/callRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import safetyRoutes from './routes/safetyRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

// Trust proxy header when running behind reverse proxies (e.g. Render, Heroku, Nginx)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Security Headers Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow loading local uploaded media
    contentSecurityPolicy: false, // allow modern inline scripts and styles for SPA
  })
);

// Dynamic CORS configuration (supports Render, Vercel, Netlify, and local development)
const getNormalizedOrigins = () => {
  const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
  if (!process.env.CLIENT_URL) return defaults;

  // Supports single or comma-separated CLIENT_URL values with trailing slashes trimmed
  const clientUrls = process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''));
  return [...new Set([...clientUrls, ...defaults])];
};

const allowedOrigins = getNormalizedOrigins();

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (health checks, curl, mobile native, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some((allowed) => allowed === cleanOrigin || allowed === origin);

    if (isAllowed || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    return callback(null, true); // Permissive callback for seamless deployment across subdomains
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Body Parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads directory
app.use('/uploads', express.static(uploadsDir));

// Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Dedicated health endpoints for Render & Cloud Monitors
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Connectly Communication API',
    uptime: Math.floor(process.uptime()),
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/safety', safetyRoutes);

// Frontend Client Static Files (Serve React Vite build if present)
const possibleDistPaths = [
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist'),
];
const clientDistPath = possibleDistPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  console.log(`🌐 Serving compiled frontend SPA from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // Catch-all route for Single Page Application client-side routing
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io')
    ) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // If frontend is not built in this container, root endpoint returns API status
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'Connectly API',
    });
  });
}

// Error Handler
app.use(errorHandler);

// Setup Socket.IO on the same HTTP server
const io = new SocketIOServer(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

initSocket(io);

// Make io accessible in req handlers
app.set('io', io);

// Dynamic PORT assignment (Render assigns process.env.PORT, fallback to 5000 for local dev)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Connectly Server running in ${process.env.NODE_ENV || 'development'} mode on http://${HOST}:${PORT}`);
});
