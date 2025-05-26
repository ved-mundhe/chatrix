import React, { useRef, useEffect, useState } from "react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import { useWebRTCCall } from "../lib/useWebRTCCall";
import { X, PhoneOff, Phone, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const CallModal = () => {
  const {
    isCallModalOpen,
    callType,
    callStatus,
    remoteUser,
    closeCallModal,
    openCallModal,
    setCallStatus,
    callInfo,
  } = useCallStore();
  const { authUser, socket } = useAuthStore();

  // Local state for media controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // WebRTC call logic
  const {
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    handleAnswer,
    handleIceCandidate,
    endCall,
    rejectCall,
    setCallStatus: setWebRTCCallStatus,
    toggleMute,
    toggleVideo,
    isCallReady,
  } = useWebRTCCall({
    socket,
    currentUser: authUser,
    remoteUser,
    callType,
  });

  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const ringtoneRef = useRef(null);

  // Track call start/end times
  const callStartRef = useRef(null);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      if (callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else if (callType === "voice" && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }
    }
  }, [remoteStream, callType]);

  // Socket event listeners for signaling
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = ({ from, offer, callType: incomingType, callerInfo }) => {
      console.log("[Socket] call:incoming", { from, offer, callType: incomingType, callerInfo });
      
      // Don't show incoming call if already in a call
      if (isCallModalOpen && callStatus === "in-call") {
        console.log("Already in call, ignoring incoming call");
        return;
      }

      toast("📞 Incoming call...", { duration: 4000 });
      
      // Close any existing modal first
      closeCallModal();
      
      // Small delay to ensure state resets properly
      setTimeout(() => {
        openCallModal({
          callType: incomingType,
          callStatus: "ringing",
          remoteUser: callerInfo || { _id: from, fullName: "Unknown User" },
          callInfo: { offer },
        });
      }, 200);
    };

    const handleCallAnswer = async ({ from, answer }) => {
      console.log("[Socket] call:answer", { from, answer });
      toast.success("📞 Call connected!");
      try {
        await handleAnswer(answer);
        setCallStatus("in-call");
      } catch (error) {
        console.error("Error handling answer:", error);
        toast.error("Failed to connect call");
      }
    };

    // Fixed ICE candidate handler
    const handleSocketIceCandidate = (data) => {
      console.log("[Socket] call:ice-candidate", data);
      
      // Handle different possible data structures
      if (data && data.candidate) {
        handleIceCandidate(data.candidate);
      } else if (data) {
        // If data itself is the candidate
        handleIceCandidate(data);
      } else {
        console.warn("Received ICE candidate with no data:", data);
      }
    };

    const handleCallEnd = ({ from, reason }) => {
      console.log("[Socket] call:end", { from, reason });
      
      const reasonMessages = {
        ended: "Call ended",
        rejected: "Call rejected",
        timeout: "Call timeout",
        busy: "User is busy",
        offline: "User is offline"
      };
      
      toast.error(reasonMessages[reason] || "Call ended");
      setCallStatus("ended");
      setWebRTCCallStatus("ended");
      
      // Log the call if it was accepted
      if (callStartRef.current) {
        logCall("completed", callStartRef.current, Date.now());
      }
      
      setTimeout(() => {
        closeCallModal();
      }, 1000);
    };

    const handleUserOffline = ({ userId }) => {
      console.log("[Socket] User offline:", userId);
      toast.error("User is not available");
      setCallStatus("ended");
      closeCallModal();
    };

    // Register event listeners
    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:answer", handleCallAnswer);
    socket.on("call:ice-candidate", handleSocketIceCandidate);
    socket.on("call:end", handleCallEnd);
    socket.on("call:user-offline", handleUserOffline);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:answer", handleCallAnswer);
      socket.off("call:ice-candidate", handleSocketIceCandidate);
      socket.off("call:end", handleCallEnd);
      socket.off("call:user-offline", handleUserOffline);
    };
  }, [socket, isCallModalOpen, callStatus, openCallModal, handleAnswer, handleIceCandidate, setCallStatus, setWebRTCCallStatus, closeCallModal]);

  // Start call when modal opens as initiator
  useEffect(() => {
    if (isCallModalOpen && callStatus === "calling") {
      console.log("Starting call...");
      toast("📞 Calling...", { duration: 3000 });
      startCall();
    }
  }, [isCallModalOpen, callStatus, startCall]);

  // Helper to log call
  const logCall = async (status, startedAt, endedAt) => {
    if (!authUser || !remoteUser) return;
    
    const callerId = callStatus === "calling" ? authUser._id : remoteUser._id;
    const receiverId = callStatus === "calling" ? remoteUser._id : authUser._id;
    const duration = startedAt && endedAt ? Math.floor((endedAt - startedAt) / 1000) : 0;
    
    try {
      await axiosInstance.post("/calls", {
        callerId,
        receiverId,
        callType,
        status,
        startedAt: new Date(startedAt),
        endedAt: new Date(endedAt),
        duration,
      });
      console.log("Call logged successfully");
    } catch (error) {
      console.error("Failed to log call:", error);
    }
  };

  // Track call start/end times
  useEffect(() => {
    if (callStatus === "in-call" && !callStartRef.current) {
      callStartRef.current = Date.now();
      console.log("Call started at:", new Date(callStartRef.current));
    }
    
    if (callStatus === "ended" && callStartRef.current) {
      const endTime = Date.now();
      logCall("completed", callStartRef.current, endTime);
      callStartRef.current = null;
    }
  }, [callStatus]);

  // Play/stop ringtone
  useEffect(() => {
    const playRingtone = () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.volume = 0.3;
        ringtoneRef.current.play().catch(e => console.log("Ringtone play failed:", e));
      }
    };

    const stopRingtone = () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };

    if (callStatus === "ringing" && remoteUser?._id !== authUser?._id) {
      playRingtone();
    } else {
      stopRingtone();
    }

    return stopRingtone;
  }, [callStatus, remoteUser, authUser]);

  // Handle call acceptance
  const handleAcceptCall = async () => {
    try {
      console.log("Accepting call with offer:", callInfo?.offer);
      await acceptCall(callInfo?.offer);
      setCallStatus("in-call");
      toast.success("📞 Call connected!");
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Failed to accept call");
      handleRejectCall();
    }
  };

  // Handle call rejection
  const handleRejectCall = async () => {
    try {
      if (callStartRef.current) {
        await logCall("rejected", callStartRef.current, Date.now());
      }
      
      rejectCall();
      closeCallModal();
      
      if (socket && remoteUser) {
        socket.emit("call:end", { 
          to: remoteUser._id, 
          reason: "rejected",
          from: authUser._id 
        });
      }
      
      toast.error("Call rejected");
    } catch (error) {
      console.error("Error rejecting call:", error);
      closeCallModal();
    }
  };

  // Handle call end
  const handleEndCall = async () => {
    try {
      if (callStartRef.current) {
        await logCall("completed", callStartRef.current, Date.now());
      }
      
      endCall();
      closeCallModal();
      
      if (socket && remoteUser) {
        socket.emit("call:end", { 
          to: remoteUser._id, 
          reason: "ended",
          from: authUser._id 
        });
      }
      
      toast.success("Call ended");
    } catch (error) {
      console.error("Error ending call:", error);
      closeCallModal();
    }
  };

  // Media control handlers
  const handleToggleMute = () => {
    toggleMute();
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoOff(!isVideoOff);
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerOn ? 0.1 : 1.0;
    }
  };

  if (!isCallModalOpen) return null;

  const isIncoming = callStatus === "ringing" && remoteUser?._id !== authUser?._id;
  const isOutgoing = callStatus === "calling" || (callStatus === "ringing" && remoteUser?._id === authUser?._id);
  const isActive = callStatus === "in-call";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      {/* Ringtone audio */}
      <audio 
        ref={ringtoneRef} 
        src="/ringtone.mp3" 
        loop 
        preload="auto"
      />
      
      {/* Remote audio for voice calls */}
      {callType === "voice" && (
        <audio 
          ref={remoteAudioRef} 
          autoPlay 
          playsInline
          volume={isSpeakerOn ? 1.0 : 0.1}
        />
      )}

      <div className="relative w-full max-w-md mx-auto bg-base-100 rounded-xl shadow-2xl p-6 flex flex-col items-center animate-pulse-slow">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-base-200 transition-colors"
          onClick={handleEndCall}
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Info */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <img
              src={remoteUser?.profilePic || "/avatar.png"}
              alt={remoteUser?.fullName || "Unknown User"}
              className="w-24 h-24 rounded-full mb-3 border-4 border-primary shadow-lg"
            />
            {isActive && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-center">
            {remoteUser?.fullName || "Unknown User"}
          </h2>
          
          <p className="text-base-content/70 text-sm capitalize mt-1">
            {callStatus === "calling" && "📞 Calling..."}
            {callStatus === "ringing" && isIncoming && "📞 Incoming call..."}
            {callStatus === "ringing" && !isIncoming && "📞 Ringing..."}
            {callStatus === "in-call" && "🔊 Connected"}
            {callStatus === "ended" && "📴 Call ended"}
            {callStatus === "rejected" && "❌ Call rejected"}
            {!callStatus && "🔄 Connecting..."}
          </p>
        </div>

        {/* Video/Audio Display */}
        <div className="w-full mb-6">
          {callType === "video" ? (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              {/* Remote video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              
              {/* Local video (picture-in-picture) */}
              {localStream && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute top-4 right-4 w-20 h-28 rounded-lg border-2 border-primary object-cover bg-black"
                  style={{ transform: 'scaleX(-1)' }}
                />
              )}
              
              {/* No video placeholder */}
              {!remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-base-300">
                  <div className="text-center">
                    <Video className="w-12 h-12 text-base-content/50 mx-auto mb-2" />
                    <p className="text-base-content/70 text-sm">Waiting for video...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Voice call UI
            <div className="flex flex-col items-center py-8">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                {isMuted ? (
                  <MicOff className="w-10 h-10 text-error" />
                ) : (
                  <Mic className="w-10 h-10 text-primary animate-pulse" />
                )}
              </div>
              <p className="text-base-content/70 text-sm">
                {callType === "voice" ? "Voice Call" : "Audio Only"}
              </p>
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex gap-4 justify-center">
          {isIncoming && (
            <>
              {/* Accept Call */}
              <button
                className="p-4 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors shadow-lg"
                onClick={handleAcceptCall}
                disabled={!callInfo?.offer}
              >
                <Phone className="w-6 h-6" />
              </button>
              
              {/* Reject Call */}
              <button
                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg"
                onClick={handleRejectCall}
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}

          {(isOutgoing || isActive) && (
            <>
              {/* Mute Toggle */}
              <button
                className={`p-3 rounded-full transition-colors shadow-lg ${
                  isMuted 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "bg-base-200 text-base-content hover:bg-base-300"
                }`}
                onClick={handleToggleMute}
                disabled={!localStream}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video Toggle (only for video calls) */}
              {callType === "video" && (
                <button
                  className={`p-3 rounded-full transition-colors shadow-lg ${
                    isVideoOff 
                      ? "bg-red-600 text-white hover:bg-red-700" 
                      : "bg-base-200 text-base-content hover:bg-base-300"
                  }`}
                  onClick={handleToggleVideo}
                  disabled={!localStream}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}

              {/* Speaker Toggle (only for voice calls) */}
              {callType === "voice" && (
                <button
                  className={`p-3 rounded-full transition-colors shadow-lg ${
                    !isSpeakerOn 
                      ? "bg-red-600 text-white hover:bg-red-700" 
                      : "bg-base-200 text-base-content hover:bg-base-300"
                  }`}
                  onClick={handleToggleSpeaker}
                >
                  {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              )}

              {/* End Call */}
              <button
                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Connection Status */}
        {isActive && (
          <div className="mt-4 text-center">
            <p className="text-xs text-base-content/50">
              {isCallReady ? "🟢 Connected" : "🟡 Connecting..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;