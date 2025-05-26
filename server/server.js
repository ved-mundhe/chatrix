import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use('/api/auth', authRoutes);

// Health check endpoint (from provided code)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.IO middleware for authentication (merged and updated)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    console.log('Socket Auth: No token provided');
    return next(new Error('Authentication error: No token'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    // Assuming username is available in JWT payload from your auth process
    socket.username = decoded.username || `User_${decoded.userId}`; 
    console.log(`Socket Auth: User authenticated: ${socket.username} (${socket.userId})`);
    next();
  } catch (err) {
    console.log('Socket Auth: Token verification failed:', err.message);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Store active users and their socket connections (from provided code)
const activeUsers = new Map(); // Map: userId -> { socketId, username, connectedAt }
const screenSharingUsers = new Set(); // Set: userId

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.username} (${socket.userId}) - Socket: ${socket.id}`);
  
  // Add user to active users map
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    username: socket.username,
    connectedAt: new Date()
  });
  
  // Broadcast user's online status to all *other* users
  socket.broadcast.emit('user-online', {
    userId: socket.userId,
    username: socket.username
  });

  // Send list of currently online users to the newly connected user
  // Format matches the expected structure in client's online-users listener
  const onlineUsersList = Array.from(activeUsers.entries()).map(([userId, userData]) => ({
    userId: userId,
    username: userData.username,
    isScreenSharing: screenSharingUsers.has(userId) // Include screen sharing status
  }));
  
  socket.emit('online-users', onlineUsersList);

  // Handle regular chat messages (from provided code)
  socket.on('message', (messageData) => {
    console.log(`💬 Message from ${socket.username}:`, messageData.text?.substring(0, 50) + (messageData.text?.length > 50 ? '...' : ''));
    
    const messageWithMetadata = {
      ...messageData,
      userId: socket.userId, // Ensure userId is attached
      username: socket.username, // Ensure username is attached
      timestamp: new Date().toISOString(),
      id: `msg_${Date.now()}_${socket.userId}` // Generate unique ID
    };
    
    // Broadcast message to all connected users
    io.emit('message', messageWithMetadata);
  });

  // Handle screen sharing start (from provided code)
  socket.on('start-screen-share', () => {
    console.log(`📺 User ${socket.username} started screen sharing`);
    
    // Add user to screen sharing set
    screenSharingUsers.add(socket.userId);
    
    // Notify all other users that this user started screen sharing
    socket.broadcast.emit('screen-share-started', { // Broadcasting to all others for simplicity, can target specific users/rooms if needed
      userId: socket.userId,
      username: socket.username
    });
    
    console.log(`Active screen sharing users: [${Array.from(screenSharingUsers).join(', ')}]`);
  });

  // Handle screen sharing stop (from provided code)
  socket.on('stop-screen-share', () => {
    console.log(`🛑 User ${socket.username} stopped screen sharing`);
    
    // Remove user from screen sharing set
    screenSharingUsers.delete(socket.userId);
    
    // Notify all other users that this user stopped screen sharing
    socket.broadcast.emit('screen-share-stopped', { // Broadcasting to all others for simplicity
      userId: socket.userId,
      username: socket.username
    });
    
    console.log(`Active screen sharing users: [${Array.from(screenSharingUsers).join(', ')}]`);
  });

  // Handle WebRTC signaling for screen sharing (from provided code)
  // These events relay the signaling messages between the two users involved in the screen share.

  socket.on('screen-share-offer', ({ userId: targetUserId, offer }) => { // Renamed userId to targetUserId for clarity
    console.log(`🔄 Screen share offer from ${socket.username} to ${targetUserId || 'all'}`);
    
    if (targetUserId && targetUserId !== 'all') {
      // Send to specific user
      const targetUser = activeUsers.get(targetUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit('screen-share-offer', {
          userId: socket.userId, // The ID of the user sending the offer
          username: socket.username,
          offer
        });
        console.log(`✅ Offer sent to ${targetUserId}`);
      } else {
        console.log(`❌ Target user ${targetUserId} not found for offer`);
      }
    } else {
      // Broadcast to all other users (adjust if rooms/specific targeting is needed)
      socket.broadcast.emit('screen-share-offer', {
        userId: socket.userId,
        username: socket.username,
        offer
      });
      console.log(`📡 Offer broadcasted to all users`);
    }
  });

  socket.on('screen-share-answer', ({ userId: targetUserId, answer }) => { // Renamed userId to targetUserId for clarity
    console.log(`🔄 Screen share answer from ${socket.username} to ${targetUserId}`);
    
    const targetUser = activeUsers.get(targetUserId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('screen-share-answer', {
        userId: socket.userId,
        username: socket.username,
        answer
      });
      console.log(`✅ Answer sent to ${targetUserId}`);
    } else {
      console.log(`❌ Target user ${targetUserId} not found for answer`);
    }
  });

  socket.on('ice-candidate', ({ userId: targetUserId, candidate }) => { // Renamed userId to targetUserId for clarity
    console.log(`🧊 ICE candidate from ${socket.username} to ${targetUserId || 'all'}`);
    
    if (targetUserId && targetUserId !== 'all') {
      // Send to specific user
      const targetUser = activeUsers.get(targetUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit('ice-candidate', {
          userId: socket.userId,
          username: socket.username,
          candidate
        });
      }
    } else {
      // Broadcast to all other users (adjust if rooms/specific targeting is needed)
      socket.broadcast.emit('ice-candidate', {
        userId: socket.userId,
        username: socket.username,
        candidate
      });
    }
  });

  // Handle user typing indicators (optional, from provided code)
  socket.on('typing-start', ({ targetUserId }) => {
    if (targetUserId) {
      const targetUser = activeUsers.get(targetUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit('user-typing', {
          userId: socket.userId,
          username: socket.username
        });
      } else {
         console.log(`Typing indicator: Target user ${targetUserId} not found.`);
      }
    }
  });

  socket.on('typing-stop', ({ targetUserId }) => {
    if (targetUserId) {
      const targetUser = activeUsers.get(targetUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit('user-stopped-typing', {
          userId: socket.userId
        });
      } else {
         console.log(`Typing indicator: Target user ${targetUserId} not found.`);
      }
    }
  });

  // Handle disconnection (merged and updated)
  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.username} (${socket.userId}) - Reason: ${reason}`);
    
    // Remove from active users
    activeUsers.delete(socket.userId);
    
    // Remove from screen sharing users if they were sharing
    if (screenSharingUsers.has(socket.userId)) {
      screenSharingUsers.delete(socket.userId);
      console.log(`User ${socket.username} was screen sharing, removed from set.`);
      // Notify others that screen sharing stopped due to disconnect
      socket.broadcast.emit('screen-share-stopped', {
        userId: socket.userId,
        username: socket.username
      });
    }
    
    // Broadcast user's offline status to all other users
    socket.broadcast.emit('user-offline', {
      userId: socket.userId,
      username: socket.username
    });
    
    console.log(`👥 Active users: ${activeUsers.size}, Screen sharing: ${screenSharingUsers.size}`);
  });

  // Handle connection errors (from provided code)
  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.username}:`, error);
  });

  // Send initial connection confirmation (from provided code)
  socket.emit('connection-confirmed', {
    userId: socket.userId,
    username: socket.username,
    timestamp: new Date().toISOString()
  });
  
  console.log(`👥 Total active users: ${activeUsers.size} after connection`);
});

// Error handling for Socket.IO engine (from provided code)
io.engine.on("connection_error", (err) => {
  console.log('Socket.IO engine connection error:');
  console.log('  Req:', err.req); // the request object
  console.log('  Code:', err.code); // the error code, for example 1
  console.log('  Message:', err.message); // the error message, for example "Session ID unknown"
  console.log('  Context:', err.context); // some additional error context
});

// Database connection and server startup (existing logic)
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.IO server ready for connections`);
      console.log(`🌐 CORS enabled for: http://localhost:5173`);
      console.log(`🔐 JWT Secret configured: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
    process.exit(1); // Exit process on DB connection failure
  });

// Graceful shutdown (existing logic)
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Log server stats periodically (from provided code, optional)
setInterval(() => {
  console.log(`📊 Server Stats - Active Users: ${activeUsers.size}, Screen Sharing: ${screenSharingUsers.size}`);
}, 30000); // Log every 30 seconds 