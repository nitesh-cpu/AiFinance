import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not configured');
    console.log(JSON.stringify({ level: 'info', event: 'database_connecting' }));
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(JSON.stringify({ level: 'info', event: 'database_connected' }));
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', event: 'database_connection_failed', errorName: err.name }));
    throw err;
  }
};
