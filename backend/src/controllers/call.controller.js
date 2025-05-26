import Call from "../models/call.model.js";

// Create a new call log
export const createCallLog = async (req, res) => {
  try {
    const {
      callerId,
      receiverId,
      callType, // should be 'voice' or 'video'
      status,   // 'missed', 'completed', 'rejected'
      startedAt,
      endedAt,
      duration
    } = req.body;

    if (!callerId || !receiverId || !callType || !status || !startedAt) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const call = await Call.create({
      callerId,
      receiverId,
      callType,
      status,
      startedAt,
      endedAt,
      duration
    });
    res.status(201).json(call);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get call history for a user (as caller or receiver)
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.params.userId;
    const calls = await Call.find({
      $or: [
        { callerId: userId },
        { receiverId: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .populate("callerId receiverId", "fullName profilePic");
    res.status(200).json(calls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};