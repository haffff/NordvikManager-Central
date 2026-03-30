'use strict';

module.exports = Object.freeze({
  // Client → Server
  AUTHENTICATE: 'authenticate',
  WEBRTC_OFFER: 'webrtc-offer',
  WEBRTC_ANSWER: 'webrtc-answer',
  ICE_CANDIDATE: 'ice-candidate',

  // Server → Client
  AUTHENTICATED: 'authenticated',
  AUTH_ERROR: 'auth-error',
  PEER_JOINED: 'peer-joined',
  PEER_LEFT: 'peer-left',
  SESSION_INFO: 'session-info',
  ERROR: 'error',
});
