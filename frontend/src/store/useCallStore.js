import { create } from "zustand";

const initialState = {
  isCallModalOpen: false,
  callType: null, // 'voice' | 'video'
  callStatus: null, // 'calling' | 'ringing' | 'in-call' | 'ended' | 'rejected' | 'missed'
  remoteUser: null, // user object
  localStream: null,
  remoteStream: null,
  callInfo: null, // offer/answer, etc.
};

export const useCallStore = create((set) => ({
  ...initialState,
  openCallModal: (payload) => set({ ...payload, isCallModalOpen: true }),
  closeCallModal: () => set(initialState),
  setCallStatus: (callStatus) => set({ callStatus }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setCallInfo: (callInfo) => set({ callInfo }),
})); 