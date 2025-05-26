import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  phone: { type: String, required: true },
  resetToken: String,
  resetTokenExpiration: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  resetOTP: String,
  otpExpires: Date
});

export default mongoose.model('User', userSchema);