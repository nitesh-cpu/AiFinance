import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { sendError } from '../utils/response.js';
import { getJwtSecret } from '../config/environment.js';

export const protect = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 401, 'Not authorized, token missing');
    }

    const decoded = jwt.verify(token, getJwtSecret());

    const user = await User.findById(decoded.id).select('-passwordHash +tokenVersion');
    if (!user) return sendError(res, 401, 'User no longer exists');
    if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      return sendError(res, 401, 'Not authorized, token invalid or expired');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name !== 'JsonWebTokenError' && err.name !== 'TokenExpiredError' && err.name !== 'NotBeforeError') {
      console.error(JSON.stringify({ level: 'error', operation: 'authentication', errorName: err.name || 'Error' }));
      return sendError(res, 500, 'Authentication service unavailable');
    }
    return sendError(res, 401, 'Not authorized, token invalid or expired');
  }
};
