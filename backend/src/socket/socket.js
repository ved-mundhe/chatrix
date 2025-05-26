import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});

// Store user socket mappings
const userSocketMap = {}; // {userId: socketId}

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  const userId = socket.handshake.query.userId;
  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} mapped to socket ${socket.id}`);
    // Emit online users list on connection
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  }

  // Handle call offer
  socket.on("call:offer", ({ to, offer, callType, from, callerInfo }) => {
    console.log(`[Socket] Call offer from ${from} to ${to}`, { callType });
    
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:incoming", {
        from,
        offer,
        callType,
        callerInfo
      });
      console.log(`[Socket] Call offer sent to ${to} (${receiverSocketId})`);
    } else {
      console.log(`[Socket] Receiver ${to} not found online`);
      // Optionally send back a "user offline" message
      socket.emit("call:user-offline", { userId: to });
    }
  });

  // Handle call answer
  socket.on("call:answer", ({ to, answer, from }) => {
    console.log(`[Socket] Call answer from ${from} to ${to}`);
    
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:answer", {
        from,
        answer
      });
      console.log(`[Socket] Call answer sent to ${to}`);
    }
  });

  // Handle ICE candidates
  socket.on("call:ice-candidate", ({ to, candidate }) => {
    console.log(`[Socket] ICE candidate to ${to}`);
    
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:ice-candidate", {
        from: userId,
        candidate
      });
    }
  });

  // Handle call end
  socket.on("call:end", ({ to, reason }) => {
    console.log(`[Socket] Call end to ${to}, reason: ${reason}`);
    
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:end", {
        from: userId,
        reason
      });
    }
  });

  // Handle regular messages (if you have chat functionality)
  socket.on("sendMessage", (messageData) => {
    const receiverSocketId = getReceiverSocketId(messageData.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", messageData);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    // Remove user from socket map
    for (const [uid, sid] of Object.entries(userSocketMap)) {
      if (sid === socket.id) {
        delete userSocketMap[uid];
        console.log(`User ${uid} removed from socket map`);
        break;
      }
    }
    // Emit online users list on disconnection
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, io, server };