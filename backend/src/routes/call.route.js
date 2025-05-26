import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createCallLog, getCallHistory } from "../controllers/call.controller.js";

const router = express.Router();

// Create a new call log
router.post("/", /*protectRoute,*/ createCallLog);

// Get call history for a user
router.get("/:userId", /*protectRoute,*/ getCallHistory);

export default router;