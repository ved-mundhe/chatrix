import { useRef, useState, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";

// Enhanced WebRTC configuration with better STUN/TURN servers
const rtcConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Free TURN servers for cross-network connectivity
    {
      urls: 'turn:freestun.net:3478',
      username: 'free',
      credential: 'free'
    },
    {
      urls: 'turn:relay1.expressturn.com:3478',
      username: 'efRJPOPOCM20363256',
      credential: 'Txjl5V6PdYjO7MLe'
    },
    // Additional TURN servers
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

let globalPeerConnection = null;

export function useWebRTCCall({ socket, currentUser, remoteUser, callType }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [isCallReady, setIsCallReady] = useState(false);
  const [connectionState, setConnectionState] = useState('new');
  
  const pendingCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);
  const isCleaningUpRef = useRef(false);
  const mediaConstraintsRef = useRef(null);

  // Enhanced cleanup function
  const cleanup = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    console.log("🧹 Cleaning up WebRTC resources...");

    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`Stopping ${track.kind} track`);
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Close peer connection
    if (globalPeerConnection) {
      console.log("Closing peer connection");
      globalPeerConnection.close();
      globalPeerConnection = null;
    }

    // Reset states
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallReady(false);
    setConnectionState('new');
    pendingCandidatesRef.current = [];
    
    setTimeout(() => {
      isCleaningUpRef.current = false;
    }, 1000);
  }, []);

  // Create peer connection with enhanced error handling
  const createPeerConnection = useCallback(() => {
    console.log("🔗 Creating peer connection...");
    
    if (globalPeerConnection) {
      globalPeerConnection.close();
    }

    const pc = new RTCPeerConnection(rtcConfiguration);
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("📡 Received remote track:", event.track.kind);
      const [stream] = event.streams;
      if (stream) {
        console.log("Setting remote stream with tracks:", stream.getTracks().length);
        setRemoteStream(stream);
        setIsCallReady(true);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && remoteUser) {
        console.log("🧊 Sending ICE candidate");
        socket.emit("call:ice-candidate", {
          to: remoteUser._id,
          from: currentUser._id,
          candidate: event.candidate
        });
      } else if (!event.candidate) {
        console.log("🧊 All ICE candidates have been sent");
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("🔄 Connection state:", pc.connectionState);
      setConnectionState(pc.connectionState);
      
      switch (pc.connectionState) {
        case 'connecting':
          console.log("Connection establishing...");
          break;
        case 'connected':
          setIsCallReady(true);
          toast.success("Call connected successfully!");
          break;
        case 'disconnected':
          console.log("Connection disconnected, attempting to reconnect...");
          setIsCallReady(false);
          break;
        case 'failed':
          console.log("Connection failed completely");
          toast.error("Connection failed - call ended");
          setIsCallReady(false);
          break;
        case 'closed':
          setIsCallReady(false);
          break;
      }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log("🧊 ICE connection state:", pc.iceConnectionState);
      
      switch (pc.iceConnectionState) {
        case 'checking':
          console.log("Checking ICE connection...");
          break;
        case 'connected':
        case 'completed':
          console.log("ICE connection established");
          break;
        case 'failed':
          console.log("ICE connection failed, restarting...");
          pc.restartIce();
          break;
        case 'disconnected':
          console.log("ICE connection disconnected");
          break;
      }
    };

    // Handle ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log("🧊 ICE gathering state:", pc.iceGatheringState);
    };

    // Handle signaling state
    pc.onsignalingstatechange = () => {
      console.log("📡 Signaling state:", pc.signalingState);
    };

    globalPeerConnection = pc;
    return pc;
  }, [socket, currentUser, remoteUser]);

  // Enhanced getUserMedia with better constraints and error handling
  const getUserMedia = useCallback(async (constraints) => {
    console.log("🎥 Requesting user media:", constraints);
    
    try {
      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices not supported");
      }

      // Enhanced constraints for better quality
      const enhancedConstraints = {
        audio: constraints.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2,
          // Prefer built-in microphones for better quality
          deviceId: constraints.audio.deviceId || undefined
        } : false,
        video: constraints.video ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user',
          // Prefer built-in cameras
          deviceId: constraints.video.deviceId || undefined
        } : false
      };

      // Store constraints for later use
      mediaConstraintsRef.current = enhancedConstraints;

      const stream = await navigator.mediaDevices.getUserMedia(enhancedConstraints);
      
      console.log("✅ Got user media:", {
        audio: stream.getAudioTracks().length > 0,
        video: stream.getVideoTracks().length > 0,
        audioTracks: stream.getAudioTracks().map(t => ({ label: t.label, enabled: t.enabled })),
        videoTracks: stream.getVideoTracks().map(t => ({ label: t.label, enabled: t.enabled }))
      });

      // Store reference for cleanup
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      return stream;
    } catch (error) {
      console.error("❌ getUserMedia error:", error);
      
      let errorMessage = "Could not access microphone/camera.";
      
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          errorMessage = "Permission denied. Please allow microphone/camera access and try again.";
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          errorMessage = "No microphone/camera found. Please check your devices.";
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          errorMessage = "Microphone/camera is already in use by another application.";
          break;
        case 'OverConstrainedError':
        case 'ConstraintNotSatisfiedError':
          errorMessage = "Camera/microphone doesn't support required settings.";
          break;
        case 'AbortError':
          errorMessage = "Media access was aborted.";
          break;
        case 'SecurityError':
          errorMessage = "Media access blocked for security reasons.";
          break;
        default:
          errorMessage = `Media error: ${error.message || 'Unknown error'}`;
      }
      
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Start call (as caller)
  const startCall = useCallback(async () => {
    if (isCleaningUpRef.current) return;
    
    console.log("📞 Starting call...", { callType });
    
    try {
      cleanup();
      setIsInitiator(true);
      setCallStatus("calling");

      // Get user media with proper constraints
      const constraints = {
        audio: true, // Always request audio
        video: callType === "video"
      };

      const stream = await getUserMedia(constraints);
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log(`Added ${track.kind} track to peer connection:`, track.label);
      });

      // Create and send offer
      console.log("📤 Creating offer...");
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video"
      });
      
      await pc.setLocalDescription(offer);
      
      console.log("📤 Sending offer to:", remoteUser._id);
      socket.emit("call:offer", {
        to: remoteUser._id,
        from: currentUser._id,
        offer: offer,
        callType: callType,
        callerInfo: {
          _id: currentUser._id,
          fullName: currentUser.fullName,
          profilePic: currentUser.profilePic
        }
      });

    } catch (error) {
      console.error("❌ Start call error:", error);
      setCallStatus("ended");
      cleanup();
      throw error;
    }
  }, [callType, getUserMedia, createPeerConnection, socket, currentUser, remoteUser, cleanup]);

  // Accept call (as callee)
  const acceptCall = useCallback(async (offer) => {
    if (isCleaningUpRef.current || !offer) {
      console.error("Cannot accept call: cleaning up or no offer");
      return;
    }
    
    console.log("✅ Accepting call...", { callType, offer });
    
    try {
      cleanup();
      setIsInitiator(false);
      setCallStatus("in-call");

      // Get user media with proper constraints
      const constraints = {
        audio: true, // Always request audio
        video: callType === "video"
      };

      const stream = await getUserMedia(constraints);
      
      // Create peer connection  
      const pc = createPeerConnection();
      
      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log(`Added ${track.kind} track to peer connection:`, track.label);
      });

      // Set remote description
      console.log("📥 Setting remote description...");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      console.log("📤 Creating answer...");
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log("📤 Sending answer to:", remoteUser._id);
    socket.emit("call:answer", {
      to: remoteUser._id,
        from: currentUser._id,
        answer: answer
      });

      // Add pending ICE candidates
      console.log("🧊 Adding pending ICE candidates:", pendingCandidatesRef.current.length);
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ Added pending ICE candidate");
        } catch (e) {
          console.warn("Failed to add ICE candidate:", e);
        }
      }
      pendingCandidatesRef.current = [];

    } catch (error) {
      console.error("❌ Accept call error:", error);
      setCallStatus("ended");
      cleanup();
      throw error;
    }
  }, [callType, getUserMedia, createPeerConnection, socket, currentUser, remoteUser, cleanup]);

  // Handle answer (as caller)
  const handleAnswer = useCallback(async (answer) => {
    if (!globalPeerConnection || !answer) {
      console.error("Cannot handle answer: no peer connection or answer");
      return;
    }
    
    console.log("📥 Handling answer...");
    
    try {
      await globalPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      setCallStatus("in-call");
      
      // Add pending ICE candidates
      console.log("🧊 Adding pending ICE candidates:", pendingCandidatesRef.current.length);
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await globalPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ Added pending ICE candidate");
        } catch (e) {
          console.warn("Failed to add ICE candidate:", e);
        }
      }
      pendingCandidatesRef.current = [];
      
    } catch (error) {
      console.error("❌ Handle answer error:", error);
      throw error;
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate) => {
    if (!candidate) return;
    
    console.log("🧊 Handling ICE candidate");
    
    try {
      if (globalPeerConnection && 
          globalPeerConnection.remoteDescription && 
          globalPeerConnection.remoteDescription.type) {
        await globalPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("✅ Added ICE candidate");
      } else {
        console.log("⏳ Queuing ICE candidate for later");
        pendingCandidatesRef.current.push(candidate);
      }
    } catch (error) {
      console.warn("Failed to add ICE candidate:", error);
      // Queue it for later if it fails
      pendingCandidatesRef.current.push(candidate);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log(`Audio track ${track.enabled ? 'unmuted' : 'muted'}`);
      });
      return !audioTracks[0]?.enabled;
    }
    return false;
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log(`Video track ${track.enabled ? 'enabled' : 'disabled'}`);
      });
      return !videoTracks[0]?.enabled;
    }
    return false;
  }, []);

  // End call
  const endCall = useCallback(() => {
    console.log("📴 Ending call...");
    setCallStatus("ended");
    cleanup();
  }, [cleanup]);

  // Reject call
  const rejectCall = useCallback(() => {
    console.log("❌ Rejecting call...");
    setCallStatus("rejected");
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting, cleaning up...");
      cleanup();
    };
  }, [cleanup]);

  return {
    localStream,
    remoteStream,
    callStatus,
    isInitiator,
    isCallReady,
    connectionState,
    startCall,
    acceptCall,
    handleAnswer,
    handleIceCandidate,
    endCall,
    rejectCall,
    setCallStatus,
    toggleMute,
    toggleVideo
  };
}