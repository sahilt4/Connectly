import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import { Avatar } from '../common/Avatar';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const AudioCallOverlay = ({ currentCall, onEndCall }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [callState, setCallState] = useState('idle'); // 'incoming' | 'calling' | 'connected' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callTimerRef = useRef(null);
  const callStartTimeRef = useRef(null);

  // STUN servers configuration for WebRTC
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Listen for socket call events
  useEffect(() => {
    if (!socket) return;

    // 1. Incoming Call
    const handleIncomingCall = ({ caller, offer }) => {
      setCallState('incoming');
      // Store caller info & offer on window or state
      window.__incomingCallData = { caller, offer };
    };

    // 2. Call Answered by Recipient
    const handleCallAnswered = async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('connected');
        startCallTimer();
      }
    };

    // 3. Call Declined
    const handleCallDeclined = () => {
      setCallState('ended');
      setTimeout(cleanupCall, 1500);
      logCallInDB('declined');
    };

    // 4. Call Ended by Peer
    const handleCallEnded = ({ duration }) => {
      setCallState('ended');
      setTimeout(cleanupCall, 1500);
    };

    // 5. ICE Candidate
    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_answered', handleCallAnswered);
    socket.on('call_declined', handleCallDeclined);
    socket.on('call_ended', handleCallEnded);
    socket.on('ice_candidate', handleIceCandidate);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_answered', handleCallAnswered);
      socket.off('call_declined', handleCallDeclined);
      socket.off('call_ended', handleCallEnded);
      socket.off('ice_candidate', handleIceCandidate);
    };
  }, [socket]);

  // Handle outgoing call when currentCall prop is passed
  useEffect(() => {
    if (currentCall && currentCall.recipientId) {
      startOutgoingCall(currentCall.recipient);
    }
  }, [currentCall]);

  const startCallTimer = () => {
    callStartTimeRef.current = new Date();
    setCallDuration(0);
    clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const startOutgoingCall = async (recipient) => {
    try {
      setCallState('calling');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice_candidate', {
            targetUserId: recipient._id,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_start', {
        recipientId: recipient._id,
        offer,
        callType: 'audio',
      });
    } catch (err) {
      console.error('Failed to start call:', err);
      alert('Could not access microphone.');
      cleanupCall();
    }
  };

  const acceptIncomingCall = async () => {
    const incomingData = window.__incomingCallData || currentCall;
    if (!incomingData || !incomingData.caller) return;

    try {
      setCallState('connected');
      startCallTimer();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice_candidate', {
            targetUserId: incomingData.caller._id,
            candidate: event.candidate,
          });
        }
      };

      if (incomingData.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingData.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('call_accepted', {
          callerId: incomingData.caller._id,
          answer,
        });
      }
    } catch (err) {
      console.error('Failed to accept call:', err);
      cleanupCall();
    }
  };

  const declineIncomingCall = () => {
    const incomingData = window.__incomingCallData || currentCall;
    if (incomingData?.caller && socket) {
      socket.emit('call_rejected', {
        callerId: incomingData.caller._id,
        reason: 'declined',
      });
    }
    cleanupCall();
  };

  const endActiveCall = () => {
    const targetUserId =
      currentCall?.recipient?._id ||
      window.__incomingCallData?.caller?._id;

    if (targetUserId && socket) {
      socket.emit('call_end', {
        peerId: targetUserId,
        duration: callDuration,
      });
    }

    logCallInDB(callDuration > 0 ? 'completed' : 'missed');
    setCallState('ended');
    setTimeout(cleanupCall, 800);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const logCallInDB = (status) => {
    const recipientId =
      currentCall?.recipient?._id ||
      window.__incomingCallData?.caller?._id;

    if (recipientId) {
      api.post('/calls/log', {
        recipientId,
        status,
        duration: callDuration,
        startedAt: callStartTimeRef.current || new Date(),
        endedAt: new Date(),
      }).catch(console.error);
    }
  };

  const cleanupCall = () => {
    clearInterval(callTimerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    window.__incomingCallData = null;
    setCallState('idle');
    setCallDuration(0);
    if (onEndCall) onEndCall();
  };

  const formatCallTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (callState === 'idle') return null;

  const targetPeer =
    callState === 'incoming'
      ? window.__incomingCallData?.caller || currentCall?.caller
      : currentCall?.recipient || window.__incomingCallData?.caller;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-fade-in">
      {/* Remote Audio HTML element */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="relative w-full max-w-sm bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl flex flex-col items-center justify-between text-white overflow-hidden min-h-[420px]">
        {/* Ambient Pulsing Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-600/10 via-transparent to-teal-600/10 pointer-events-none" />

        {/* Call Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold">
          <Phone className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {callState === 'incoming'
              ? 'Incoming Audio Call...'
              : callState === 'calling'
              ? 'Calling...'
              : callState === 'connected'
              ? 'In Call'
              : 'Call Ended'}
          </span>
        </div>

        {/* Peer Avatar & Details */}
        <div className="flex flex-col items-center gap-3 my-auto text-center">
          <div className="relative">
            <div
              className={`p-1.5 rounded-full ${
                callState === 'calling' || callState === 'incoming'
                  ? 'ring-4 ring-emerald-500/40 animate-pulse'
                  : ''
              }`}
            >
              <Avatar
                src={targetPeer?.avatar}
                name={targetPeer?.name || 'User'}
                size="lg"
                className="w-24 h-24 text-2xl shadow-xl"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold">{targetPeer?.name || 'User'}</h3>
            <p className="text-xs text-slate-400">@{targetPeer?.username}</p>
          </div>

          {callState === 'connected' && (
            <div className="text-sm font-mono text-emerald-400 font-bold mt-1">
              {formatCallTime(callDuration)}
            </div>
          )}
        </div>

        {/* Call Action Controls */}
        <div className="w-full pt-4">
          {callState === 'incoming' ? (
            /* Incoming call: Accept (green) or Decline (red) */
            <div className="flex items-center justify-around w-full">
              <button
                onClick={declineIncomingCall}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform group-hover:scale-110">
                  <PhoneOff className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Decline</span>
              </button>

              <button
                onClick={acceptIncomingCall}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-transform group-hover:scale-110 animate-bounce">
                  <PhoneIncoming className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-emerald-400">Accept</span>
              </button>
            </div>
          ) : (
            /* Calling or Active Call: Mute, Speaker, End Call */
            <div className="flex items-center justify-center gap-5">
              {callState === 'connected' && (
                <>
                  <button
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isMuted
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isSpeakerOn
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                    title="Speaker"
                  >
                    {isSpeakerOn ? (
                      <Volume2 className="w-5 h-5" />
                    ) : (
                      <VolumeX className="w-5 h-5" />
                    )}
                  </button>
                </>
              )}

              {/* End Call Button */}
              <button
                onClick={endActiveCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform hover:scale-110"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
