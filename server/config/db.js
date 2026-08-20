import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongoMemoryServer = null;

export const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.log('⚡ Initializing persistent local MongoDB database...');
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

      mongoUri = mongoMemoryServer.getUri();
      console.log(`📦 Persistent Local MongoDB running (data saved in server/.db_data)`);
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (!mongoMemoryServer) {
      try {
        console.log('🔄 Attempting fallback to persistent local MongoDB...');
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
        console.log(`✅ Fallback Persistent MongoDB Connected: ${conn.connection.host}`);
      } catch (fallbackError) {
        console.error('❌ Failed to connect to fallback MongoDB:', fallbackError.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
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
