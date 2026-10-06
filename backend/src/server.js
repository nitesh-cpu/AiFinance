import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { validateEnvironment } from './config/environment.js';
import app from './app.js';
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  validateEnvironment();
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(JSON.stringify({
      level: 'info',
      event: 'server_started',
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
    }));
  });

  const shutdown = (signal) => {
    console.log(JSON.stringify({ level: 'info', event: 'server_shutdown', signal }));
    server.close(async () => {
      try {
        await mongoose.disconnect();
        process.exit(0);
      } catch (error) {
        console.error(JSON.stringify({ level: 'error', event: 'database_shutdown_failed', errorName: error.name }));
        process.exit(1);
      }
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};


startServer().catch((err) => {
  console.error('SERVER ERROR:', err);
  console.error('MESSAGE:', err.message);
  console.error('STACK:', err.stack);
  process.exitCode = 1;
});