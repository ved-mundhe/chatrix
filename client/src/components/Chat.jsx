import React, { useState, useEffect, useRef } from 'react';
import Chat from '../components/Chat';
import io from 'socket.io-client';
import './Home.css';

export default function Home() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [socket, setSocket] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const screenVideoRef = useRef(null);
  const [peerConnections, setPeerConnections] = useState({});
  const [otherUser, setOtherUser] = useState(null); // State to hold the selected chat user

  useEffect(() => {
    // Get the authentication token and connect socket
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      window.location.href = '/login';
      return;
    }
    const newSocket = io('http://localhost:5000', { auth: { token } });
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (error.message === 'Authentication error') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    });
    setSocket(newSocket);

    // Listen for screen sharing events initiated by others
    newSocket.on('screen-share-started', (sharingUserId) => {
      console.log(`User ${sharingUserId} started screen sharing.`);
      // Handle UI updates, e.g., show a notification
    });

    newSocket.on('screen-share-stopped', (sharingUserId) => {
      console.log(`User ${sharingUserId} stopped screen sharing.`);
      // Handle UI updates, e.g., hide the screen share modal
    });

    // --- Placeholder: Set a dummy otherUser for testing --- //
    // Replace this with your actual logic to set the user you are chatting with
    const dummyOtherUser = { _id: 'dummy-user-id', username: 'Other User', isOnline: true, avatar: '' };
    setOtherUser(dummyOtherUser);
    // --- End Placeholder --- //

    return () => {
      newSocket.disconnect();
    };
  }, []); // Empty dependency array for mount/unmount

  // Function to start screen sharing
  const startScreenSharing = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' }, // Capture video with the cursor
        audio: false // Set to true if you want to share screen audio
      });
      // screenStream now contains the video track(s) of the shared screen

      // You'll need to add this stream's track(s) to your existing RTCPeerConnection
      // And signal to the other user that you've started screen sharing.

      return screenStream; // Return the stream to be managed in your component state
    } catch (error) {
      console.error('Error accessing screen media:', error);
      // Handle the error (e.g., user denied permission)
      return null;
    }
  };

  // Function to stop screen sharing
  const stopScreenSharing = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      if (socket && otherUser) {
        socket.emit('stop-screen-share', otherUser._id); // Emit event to the specific user
      }
      // Close peer connections related to this screen share session
      Object.values(peerConnections).forEach(pc => pc.close()); // Assuming peer connections are managed here
      setPeerConnections({});
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">{/* ... (User info and Logout button) ... */}</header>
      <main className="home-main">
        {/* Pass necessary props to Chat component */}
        <Chat
          socket={socket}
          user={user}
          otherUser={otherUser} // Pass the selected chat user
          screenVideoRef={screenVideoRef}
          isScreenSharing={isScreenSharing}
          screenStream={screenStream}
          peerConnections={peerConnections}
          setPeerConnections={setPeerConnections}
          setIsScreenSharing={setIsScreenSharing}
          setScreenStream={setScreenStream}
          onStartScreenSharing={startScreenSharing} // Pass down the start function
          onStopScreenSharing={stopScreenSharing} // Pass down the stop function
        />
      </main>
    </div>
  );
}