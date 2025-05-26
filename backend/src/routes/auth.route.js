
import express from "express";
import { checkAuth, login, logout, signup, updateProfile, requestPasswordReset, verifyOtp, resetPassword } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/request-reset", requestPasswordReset);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

router.put("/update-profile", protectRoute, updateProfile);

// FIXED: Changed from "/api/auth/check" to "/check"
router.get("/check", protectRoute, checkAuth);

export default router;