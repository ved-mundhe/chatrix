import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      // FIXED: Changed from "/auth/check" to "/auth/check" (this was correct, the backend route was wrong)
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      const message =
        error?.response?.data?.message || "Signup failed. Please try again.";
      toast.error(message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      const message =
        error?.response?.data?.message || "Login failed. Please try again.";
      toast.error(message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      const message =
        error?.response?.data?.message || "Logout failed. Please try again.";
      toast.error(message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in updateProfile:", error);
      const message =
        error?.response?.data?.message || "Profile update failed.";
      toast.error(message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket });

    console.log('[Socket] Connecting with userId:', authUser._id);

    socket.on("getOnlineUsers", (userIds) => {
      console.log('[Socket] getOnlineUsers', userIds);
      set({ onlineUsers: userIds });
    });

    socket.on("newMessage", (newMessage) => {
      const currentChatUserId = window.location.pathname.split('/').pop();
      if (currentChatUserId !== newMessage.senderId) {
        toast.success(`New message from ${newMessage.senderName || 'Someone'}: ${newMessage.text}`);
      }
    });

    // Call related socket events
    socket.on("call:incoming", ({ from, offer, callType, callerInfo }) => {
      console.log("[Socket] Incoming call", { from, callType, callerInfo });
      // Handle incoming call - you can show a modal or notification here
      // toast.info(`Incoming ${callType} call from ${callerInfo?.name || 'Unknown'}`);
    });

    socket.on("call:answer", ({ from, answer }) => {
      console.log("[Socket] Call answered", { from });
      // Handle call answer
    });

    socket.on("call:ice-candidate", ({ from, candidate }) => {
      console.log("[Socket] ICE candidate received", { from });
      // Handle ICE candidate
    });

    socket.on("call:end", ({ from, reason }) => {
      console.log("[Socket] Call ended", { from, reason });
      // Handle call end
    });

    socket.on("call:user-offline", ({ userId }) => {
      console.log("[Socket] User offline", { userId });
      toast.error("User is currently offline");
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) {
      get().socket.disconnect();
    }
  },
}));