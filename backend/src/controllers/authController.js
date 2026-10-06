import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getJwtSecret } from '../config/environment.js';
import { sendControllerError } from '../utils/controllerError.js';

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, tokenVersion: user.get('tokenVersion') ?? 0 },
    getJwtSecret(),
    { expiresIn: '30d' }
  );

const isValidPassword = (password) =>
  typeof password === 'string' && password.length >= 8 && Buffer.byteLength(password, 'utf8') <= 72;

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedName || normalizedName.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      !isValidPassword(password)) {
      return sendError(res, 400, 'Provide a name (100 characters or fewer), valid email, and password of 8-72 UTF-8 bytes');
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return sendError(res, 409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: normalizedName, email: normalizedEmail, passwordHash });
    const token = generateToken(user);

    return sendSuccess(res, 201, 'Account created successfully', {
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    return sendControllerError(res, err, 'registration', 'Registration failed');
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return sendError(res, 400, 'Please provide email and password');
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+tokenVersion');
    if (!user) return sendError(res, 401, 'Invalid email or password');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return sendError(res, 401, 'Invalid email or password');

    const token = generateToken(user);
    return sendSuccess(res, 200, 'Login successful', { token, user: user.toJSON() });
  } catch (err) {
    return sendControllerError(res, err, 'login', 'Login failed');
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 404, 'User not found');
    return sendSuccess(res, 200, 'User profile fetched', { user: user.toJSON() });
  } catch (err) {
    return sendControllerError(res, err, 'get_profile', 'Failed to fetch profile');
  }
};

// POST /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword ||
      !isValidPassword(newPassword)) {
      return sendError(res, 400, 'Provide the current password and a new password of 8-72 UTF-8 bytes');
    }
    const user = await User.findById(req.user._id).select('+tokenVersion');
    if (!user) return sendError(res, 404, 'User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return sendError(res, 401, 'Current password is incorrect');

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion += 1;
    await user.save();
    return sendSuccess(res, 200, 'Password changed successfully');
  } catch (err) {
    return sendControllerError(res, err, 'change_password', 'Password change failed');
  }
};
