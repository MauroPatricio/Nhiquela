/**
 * Mock para react-native-webrtc
 *
 * WebRTCModule não está compilado no dev client.
 * Exports no-op stubs para evitar crash ao importar o módulo.
 */

class RTCPeerConnection {
  constructor() {}
  createOffer() { return Promise.resolve({}); }
  createAnswer() { return Promise.resolve({}); }
  setLocalDescription() { return Promise.resolve(); }
  setRemoteDescription() { return Promise.resolve(); }
  addIceCandidate() { return Promise.resolve(); }
  addTrack() { return {}; }
  removeTrack() {}
  close() {}
  getStats() { return Promise.resolve(new Map()); }
  getSenders() { return []; }
  getReceivers() { return []; }
  getTransceivers() { return []; }
  addEventListener() {}
  removeEventListener() {}
}

class MediaStream {
  constructor() { this.id = ''; this._tracks = []; }
  getTracks() { return []; }
  getVideoTracks() { return []; }
  getAudioTracks() { return []; }
  addTrack() {}
  removeTrack() {}
  toURL() { return ''; }
  release() {}
}

class MediaStreamTrack {
  constructor() { this.kind = 'audio'; this.id = ''; this.enabled = true; this.muted = false; this.readyState = 'live'; }
  stop() {}
  applyConstraints() { return Promise.resolve(); }
  addEventListener() {}
  removeEventListener() {}
}

const mediaDevices = {
  getUserMedia: () => Promise.resolve(new MediaStream()),
  getDisplayMedia: () => Promise.resolve(new MediaStream()),
  enumerateDevices: () => Promise.resolve([]),
};

const RTCView = () => null;
RTCView.displayName = 'RTCView';

const RTCIceCandidate = function(data) { Object.assign(this, data); };
const RTCSessionDescription = function(data) { Object.assign(this, data); };

module.exports = {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  RTCView,
  registerGlobals: () => {},
  permissions: { CAMERA: 'camera', MICROPHONE: 'microphone' },
};
