import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const sendOTP = async (email, phone, otp) => {
  // Format phone to E.164 (e.g., +91xxxxxxxxxx)
  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

  // Send Email
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: 'Password Reset OTP',
    text: `Your OTP for password reset is: ${otp}`
  });

  // Send SMS
  try {
    await twilioClient.messages.create({
      body: `Your OTP for password reset is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER, // must be a verified Twilio number
      to: formattedPhone
    });
    console.log("✅ SMS sent successfully");
  } catch (smsError) {
    console.error("❌ Failed to send SMS:", smsError);
    if (smsError.code === 21408) {
      console.error("📌 Enable your Twilio trial account for sending SMS to this region (https://www.twilio.com/console/phone-numbers/verified)");
    } else if (smsError.code === 21212) {
      console.error("📌 Invalid 'from' number. Make sure your Twilio phone number is verified and SMS-capable.");
    }
  }
};


export const register = async (req, res) => {
  const { username, email, password, avatar, phone } = req.body;
  try {
    if (!username || !email || !password || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or username already in use' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hash, avatar, phone });
    res.status(201).json(user);
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'User registration failed' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const requestPasswordReset = async (req, res) => {
  const { email, phone } = req.body;
  try {
    const user = await User.findOne({ email, phone });
    if (!user) return res.status(404).json({ error: 'No user found with that email and phone number' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOTP = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendOTP(email, phone, otp);
    res.json({ message: 'OTP sent to your email and phone' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error sending OTP' });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({
      email,
      resetOTP: otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // OTP is valid
    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
};


export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({
      email,
      resetOTP: otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOTP = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been successfully reset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Password reset failed' });
  }
};