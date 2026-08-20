import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongoMemoryServer = null;

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. If MONGODB_URI is provided, connect to it (Atlas or remote MongoDB)
  if (mongoUri && mongoUri.trim() !== '') {
    try {
      console.log('⚡ Connecting to configured MongoDB instance...');
      const conn = await mongoose.connect(mongoUri.trim(), {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`❌ MongoDB Connection Error: ${error.message}`);
      if (isProduction) {
        console.error('⚠️ In production, please verify that your MONGODB_URI credentials are valid and IP 0.0.0.0/0 is allowed in MongoDB Atlas.');
        return;
      }
      console.log('🔄 Development mode: Attempting fallback to local database...');
    }
  }

  // 2. In Production without MONGODB_URI, log clear error
  if (isProduction) {
    console.error('❌ [Database Error] MONGODB_URI environment variable is not defined!');
    console.error('👉 Please add MONGODB_URI in your Render Dashboard -> Environment variables.');
    return;
  }

  // 3. In Development only: Use local persistent MongoDB fallback
  try {
    console.log('⚡ Initializing persistent local MongoDB database for development...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = path.resolve(__dirname, '../.db_data');

    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        dbPath,
        storageEngine: 'wiredTiger',
      },
    });

    const fallbackUri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(fallbackUri);
    console.log(`📦 Persistent Local MongoDB running at: ${conn.connection.host} (server/.db_data)`);
  } catch (fallbackError) {
    console.error('❌ Failed to initialize local MongoDB:', fallbackError.message);
  }
};

export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (error) {
    console.error('Error closing DB:', error);
  }
};

// Graceful shutdown on process exit
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});
