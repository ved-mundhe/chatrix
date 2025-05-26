let peerConnection = null;

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' }
];

export function createPeerConnection({ onTrack, onIceCandidate }) {
  peerConnection = new RTCPeerConnection({ iceServers });

  peerConnection.ontrack = (event) => {
    if (onTrack) onTrack(event.streams[0]);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && onIceCandidate) {
      onIceCandidate(event.candidate);
    }
  };

  return peerConnection;
}

export function addLocalStream(stream) {
  if (!peerConnection) return;
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });
}

export async function createOffer() {
  if (!peerConnection) return;
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  return offer;
}

export async function createAnswer() {
  if (!peerConnection) return;
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  return answer;
}

export async function setRemoteDescription(desc) {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(desc));
}

export function addIceCandidate(candidate) {
  if (!peerConnection) return;
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

export function closeConnection() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
} 