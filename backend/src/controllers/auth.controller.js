import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { required, isEmail } from '../utils/validate.js';
import { signToken } from '../middleware/auth.js';

const shape = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  title: user.title,
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  required(req.body, ['name', 'email', 'password']);
  if (!isEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
  if (password.length < 6) return res.status(400).json({ message: 'Password needs at least 6 characters' });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'That email is already registered' });

  const user = await User.create({ name, email, password });
  res.status(201).json({ user: shape(user), token: signToken(user._id) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  required(req.body, ['email', 'password']);

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Email or password is incorrect' });
  }
  res.json({ user: shape(user), token: signToken(user._id) });
});

export const me = asyncHandler(async (req, res) => res.json({ user: shape(req.user) }));

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar, title, password } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (name) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;
  if (title !== undefined) user.title = title;
  if (password) {
    if (password.length < 6) return res.status(400).json({ message: 'Password needs at least 6 characters' });
    user.password = password;
  }
  await user.save();
  res.json({ user: shape(user) });
});
