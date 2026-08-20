import crypto from 'crypto';

// Generate a memorable unique public user ID, e.g. USR-7K9W2
export const generatePublicId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'USR-';
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

// Generate random hex token (for email verification & reset password)
export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
