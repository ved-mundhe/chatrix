import React, { useState, useEffect, useRef } from 'react';
import Chat from '../components/Chat';
import io from 'socket.io-client';
import './Home.css';

export default function Home() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [socket, setSocket] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [receivingScreenShare, setReceivingScreenShare] = useState(false);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);
  const [sharingUserId, setSharingUserId] = useState(null);
  const screenVideoRef = useRef(null);
  const remoteScreenVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [otherUser, setOtherUser] = useState(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // Add TURN servers if available
      // {
      //   urls: 'turn:your-turn-server.com:3478',
      //   username: 'username',
      //   credential: 'credential'
      // }
    ],
    iceCandidatePoolSize: 10
  };

  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      window.location.href = '/login';
      return;
    }

    console.log('Connecting to socket...');
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (error.message === 'Authentication error') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    });

    setSocket(newSocket);

    // Screen sharing event listeners
    newSocket.on('screen-share-started', async (sharingUserId) => {
      console.log(`User ${sharingUserId} started screen sharing`);
      setSharingUserId(sharingUserId);
      setReceivingScreenShare(true);
    });

    newSocket.on('screen-share-stopped', (sharingUserId) => {
      console.log(`User ${sharingUserId} stopped screen sharing`);
      setReceivingScreenShare(false);
      setSharingUserId(null);
      if (remoteScreenStream) {
        remoteScreenStream.getTracks().forEach(track => track.stop());
        setRemoteScreenStream(null);
      }
      if (remoteScreenVideoRef.current) {
        remoteScreenVideoRef.current.srcObject = null;
      }
    });

    // WebRTC signaling events
    newSocket.on('screen-share-offer', async ({ userId, offer }) => {
      console.log('Received screen share offer from:', userId);
      await handleReceiveOffer(offer, userId, newSocket);
    });

    newSocket.on('screen-share-answer', async ({ userId, answer }) => {
      console.log('Received screen share answer from:', userId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    newSocket.on('ice-candidate', async ({ userId, candidate }) => {
      console.log('Received ICE candidate from:', userId);
      if (peerConnection && candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Set dummy other user for testing
    const dummyOtherUser = {
      _id: 'dummy-user-id',
      username: 'Other User',
      isOnline: true,
      avatar: ''
    };
    setOtherUser(dummyOtherUser);

    return () => {
      console.log('Cleaning up socket connection');
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      if (remoteScreenStream) {
        remoteScreenStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      newSocket.disconnect();
    };
  }, []);

  // Handle receiving screen share offer
  const handleReceiveOffer = async (offer, userId, socket) => {
    try {
      const pc = new RTCPeerConnection(iceServers);
      setPeerConnection(pc);

      // Handle incoming stream
      pc.ontrack = (event) => {
        console.log('Received remote stream:', event.streams[0]);
        setRemoteScreenStream(event.streams[0]);
        if (remoteScreenVideoRef.current) {
          remoteScreenVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            userId: userId,
            candidate: event.candidate
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('screen-share-answer', {
        userId: userId,
        answer: answer
      });

    } catch (error) {
      console.error('Error handling screen share offer:', error);
    }
  };

  // Start screen sharing
  const startScreenSharing = async () => {
    if (!socket) {
      console.error('Socket not connected');
      alert('Cannot start screen sharing: Not connected to server');
      return;
    }

    try {
      console.log('Starting screen share...');
      
      // Check if screen sharing is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in your browser');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          cursor: 'always',
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 }
        },
        audio: false
      });

      console.log('Screen stream obtained:', {
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        }))
      });
      
      setScreenStream(stream);
      setIsScreenSharing(true);

      // Display local screen share
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        // Ensure video starts playing
        screenVideoRef.current.play().catch(error => {
          console.error('Error playing local screen share:', error);
        });
      }

      // Create peer connection for sending
      const pc = new RTCPeerConnection(iceServers);
      setPeerConnection(pc);

      // Add stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind);
        pc.addTrack(track, stream);
      });

      // Enhanced ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate.type);
          socket.emit('ice-candidate', {
            userId: otherUser?._id || 'all',
            candidate: event.candidate
          });
        }
      };

      // Add connection state change handler
      pc.onconnectionstatechange = () => {
        console.log('Peer connection state:', pc.connectionState);
        if (pc.connectionState === 'failed') {
          console.error('Peer connection failed');
          stopScreenSharing();
          alert('Screen sharing connection failed. Please try again.');
        }
      };

      // Create and send offer
      console.log('Creating screen share offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Offer created and set as local description');

      socket.emit('screen-share-offer', {
        userId: otherUser?._id || 'all',
        offer: offer
      });

      // Notify others that screen sharing started
      socket.emit('start-screen-share');

      // Handle stream end (when user stops via browser controls)
      stream.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing ended by user');
        stopScreenSharing();
      };

    } catch (error) {
      console.error('Error starting screen share:', error);
      let errorMessage = 'Failed to start screen sharing: ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permission denied. Please allow screen sharing when prompted.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No screen sharing source found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Could not read screen content. Please try again.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
      setIsScreenSharing(false);
      setScreenStream(null);
    }
  };

  // Stop screen sharing
  const stopScreenSharing = () => {
    console.log('Stopping screen share...');

    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      setScreenStream(null);
    }

    setIsScreenSharing(false);

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }

    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    if (socket) {
      socket.emit('stop-screen-share');
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="user-info">
          {user.avatar && <img src={user.avatar} alt="avatar" className="user-avatar" />}
          <h1>Welcome, {user.username}</h1>
        </div>
        <div className="header-controls">
          {/* Screen sharing controls */}
          <button 
            className={`screen-share-btn ${isScreenSharing ? 'sharing' : ''}`}
            onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
            title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
          >
            {isScreenSharing ? '🛑 Stop Sharing' : '📺 Share Screen'}
          </button>
          
          <button 
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="home-main">
        {/* Screen sharing status indicators */}
        {isScreenSharing && (
          <div className="screen-share-status sharing">
            <span>🔴 You are sharing your screen</span>
          </div>
        )}

        {receivingScreenShare && (
          <div className="screen-share-status receiving">
            <span>👁️ Receiving screen share from user {sharingUserId}</span>
          </div>
        )}

        {/* Screen sharing video displays */}
        <div className="screen-share-videos">
          {/* Local screen share preview */}
          {isScreenSharing && (
            <div className="screen-video-container local">
              <h3>Your Screen Share</h3>
              <video
                ref={screenVideoRef}
                autoPlay
                muted
                playsInline
                className="screen-video"
              />
            </div>
          )}

          {/* Remote screen share display */}
          {receivingScreenShare && (
            <div className="screen-video-container remote">
              <h3>Remote Screen Share</h3>
              <video
                ref={remoteScreenVideoRef}
                autoPlay
                playsInline
                className="screen-video"
              />
            </div>
          )}
        </div>

        {/* Chat component */}
        <Chat 
          socket={socket} 
          user={user} 
          otherUser={otherUser}
          isScreenSharing={isScreenSharing}
          receivingScreenShare={receivingScreenShare}
        />
      </main>
    </div>
  );
}