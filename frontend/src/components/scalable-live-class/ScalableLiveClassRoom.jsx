import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_URL, getToken, getSession } from '../../api/request';
import './ScalableLiveClassRoom.css';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export default function ScalableLiveClassRoom({ classId, token, user, onLeave }) {
  const [socket, setSocket] = useState(null);
  const [classData, setClassData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState(null);

  // Local media states
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  // Recording state
  const [recordingStatus, setRecordingStatus] = useState('not_started');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [finalRecordingUrl, setFinalRecordingUrl] = useState(null);

  // Chat & Tabs state
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // DOM Video References
  const localVideoRef = useRef(null);
  const mainStageVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recChunkNumberRef = useRef(0);

  // WebRTC Peer Connections Map: participantId -> RTCPeerConnection
  const peersRef = useRef(new Map());
  // Remote Streams Map: participantId -> MediaStream
  const remoteStreamsRef = useRef(new Map());
  const [, setStreamUpdateTrigger] = useState(0);

  const activeToken = token || getToken() || '';
  const currentUser = user || getSession()?.user || getSession();
  const currentUserId = (currentUser?._id || currentUser?.id)?.toString();

  // Create or retrieve PeerConnection for a specific remote participant
  const getOrCreatePeerConnection = useCallback((remoteUserId, currentSocket, shouldCreateOffer = false) => {
    if (!remoteUserId || remoteUserId === currentUserId) return null;
    if (peersRef.current.has(remoteUserId)) {
      return peersRef.current.get(remoteUserId);
    }

    console.log(`[WebRTC] Initializing PeerConnection with user ${remoteUserId}`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(remoteUserId, pc);

    // Add local tracks (mic, camera, or screen) if available
    const activeStream = screenStreamRef.current || localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        pc.addTrack(track, activeStream);
      });
    }

    // Exchange ICE candidates with this peer
    pc.onicecandidate = (event) => {
      if (event.candidate && currentSocket) {
        currentSocket.emit('webrtc:signal', {
          targetUserId: remoteUserId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    // Receive remote media tracks from this peer
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track (${event.track.kind}) from ${remoteUserId}`);
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      remoteStreamsRef.current.set(remoteUserId, remoteStream);
      setStreamUpdateTrigger((v) => v + 1);

      // If remote user is the host or sharing screen, stream on main stage!
      if (remoteUserId === hostId || isHost === false) {
        if (mainStageVideoRef.current) {
          mainStageVideoRef.current.srcObject = remoteStream;
          mainStageVideoRef.current.play().catch(() => {});
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${remoteUserId}: ${pc.connectionState}`);
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        peersRef.current.delete(remoteUserId);
        remoteStreamsRef.current.delete(remoteUserId);
        setStreamUpdateTrigger((v) => v + 1);
      }
    };

    // If host or designated caller, create and send SDP offer
    if (shouldCreateOffer) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          currentSocket.emit('webrtc:signal', {
            targetUserId: remoteUserId,
            signal: { type: 'offer', sdp: pc.localDescription }
          });
        })
        .catch((err) => console.error('[WebRTC] Error creating offer:', err));
    }

    return pc;
  }, [currentUserId, hostId, isHost]);

  // Handle incoming WebRTC signaling message (Offer, Answer, ICE Candidate)
  const handleIncomingSignal = useCallback(async (fromUserId, signal, currentSocket) => {
    if (!fromUserId || fromUserId === currentUserId) return;
    let pc = peersRef.current.get(fromUserId);

    if (signal.type === 'offer') {
      if (!pc) {
        pc = getOrCreatePeerConnection(fromUserId, currentSocket, false);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      currentSocket.emit('webrtc:signal', {
        targetUserId: fromUserId,
        signal: { type: 'answer', sdp: pc.localDescription }
      });
    } else if (signal.type === 'answer') {
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      }
    } else if (signal.type === 'candidate' && signal.candidate) {
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          console.warn('[WebRTC] Candidate error:', e);
        }
      }
    }
  }, [currentUserId, getOrCreatePeerConnection]);

  // Clean exit helper
  const handleExitMeeting = useCallback((msg = null) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    remoteStreamsRef.current.clear();

    if (socket) {
      socket.disconnect();
    }

    if (msg) alert(msg);
    if (onLeave) {
      onLeave();
    } else {
      window.location.href = isHost ? '/teacher/live-classes' : '/student/live-classes';
    }
  }, [isHost, onLeave, socket]);

  // Main Socket Connection Lifecycle
  useEffect(() => {
    if (!classId || !activeToken) return;

    const backendBase = (API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
    const newSocket = io(`${backendBase}/live-class`, {
      auth: { token: activeToken },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[LiveSocket] Connected to signaling gateway');
      newSocket.emit('class:join', { classId });
    });

    newSocket.on('class:joined', ({ class: liveClass, participant, participants: initialParticipants }) => {
      setClassData(liveClass);
      setParticipants(initialParticipants || []);
      const hostUserFlag = participant.role === 'host' || currentUser?.role === 'TEACHER' || currentUser?.role === 'ADMIN';
      setIsHost(hostUserFlag);
      const assignedHostId = (liveClass.hostId?._id || liveClass.hostId || '').toString();
      setHostId(assignedHostId);

      if (liveClass.recordingStatus) setRecordingStatus(liveClass.recordingStatus);
      if (liveClass.finalRecordingUrl) setFinalRecordingUrl(liveClass.finalRecordingUrl);

      // If joining user is a student, trigger peer connection with the teacher host
      if (!hostUserFlag && assignedHostId) {
        getOrCreatePeerConnection(assignedHostId, newSocket, true);
      }
    });

    newSocket.on('participant:joined', ({ participant }) => {
      setParticipants((prev) => {
        const exists = prev.some((p) => p.userId === participant.userId);
        return exists ? prev.map((p) => (p.userId === participant.userId ? participant : p)) : [...prev, participant];
      });

      // If teacher is host, initiate peer connection with joining student
      const joinedId = (participant.userId?._id || participant.userId)?.toString();
      if (joinedId && joinedId !== currentUserId) {
        getOrCreatePeerConnection(joinedId, newSocket, true);
      }
    });

    // Inbound WebRTC Signaling Exchange
    newSocket.on('webrtc:signal', ({ fromUserId, signal }) => {
      handleIncomingSignal(fromUserId, signal, newSocket);
    });

    newSocket.on('participant:updated', ({ userId, audioEnabled, videoEnabled }) => {
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.userId === userId) {
            return {
              ...p,
              audioEnabled: typeof audioEnabled === 'boolean' ? audioEnabled : p.audioEnabled,
              videoEnabled: typeof videoEnabled === 'boolean' ? videoEnabled : p.videoEnabled
            };
          }
          return p;
        })
      );
    });

    // Host Actions: Mute
    newSocket.on('participant:muted-by-host', ({ targetParticipantId }) => {
      if (currentUserId === targetParticipantId?.toString()) {
        setAudioEnabled(false);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        alert('You have been muted by the teacher.');
      }
    });

    // Host Actions: Camera Disabled
    newSocket.on('participant:camera-disabled-by-host', ({ targetParticipantId }) => {
      if (currentUserId === targetParticipantId?.toString()) {
        setVideoEnabled(false);
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
        }
        alert('Your camera has been disabled by the teacher.');
      }
    });

    // Host Actions: Student Removed -> Automatically kick out student!
    newSocket.on('participant:removed-by-host', ({ targetParticipantId, message }) => {
      if (currentUserId === targetParticipantId?.toString()) {
        handleExitMeeting(message || 'You have been removed from the class by the teacher.');
      } else {
        setParticipants((prev) => prev.filter((p) => p.userId !== targetParticipantId));
        peersRef.current.get(targetParticipantId)?.close();
        peersRef.current.delete(targetParticipantId);
        remoteStreamsRef.current.delete(targetParticipantId);
        setStreamUpdateTrigger((v) => v + 1);
      }
    });

    // Host Actions: Mute All
    newSocket.on('class:mute-all', () => {
      if (!isHost) {
        setAudioEnabled(false);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
      }
    });

    // Host Actions: Disable All Cameras
    newSocket.on('class:disable-all-cameras', () => {
      if (!isHost) {
        setVideoEnabled(false);
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
        }
      }
    });

    // Chat Message
    newSocket.on('chat:message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Recording Events
    newSocket.on('recording:started', () => {
      setRecordingStatus('recording');
      setRecordingSeconds(0);
    });

    newSocket.on('recording:stopped', () => {
      setRecordingStatus('processing');
    });

    // HOST ENDED CLASS -> AUTOMATICALLY REMOVES ALL PARTICIPANTS!
    newSocket.on('class:ended', ({ message }) => {
      handleExitMeeting(message || 'The teacher has ended this live meeting.');
    });

    newSocket.on('participant:left', ({ userId }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));
      peersRef.current.get(userId)?.close();
      peersRef.current.delete(userId);
      remoteStreamsRef.current.delete(userId);
      setStreamUpdateTrigger((v) => v + 1);
    });

    newSocket.on('error', (err) => {
      const errMsg = typeof err === 'string' ? err : err?.message || err?.code || JSON.stringify(err);
      console.error('[LiveSocket] Error:', errMsg, err);
      if (err?.message && !err.message.includes('ended')) {
        alert(`Classroom Notice: ${err.message}`);
      }
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[LiveSocket] Connection error:', err.message || err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [activeToken, classId, currentUserId, getOrCreatePeerConnection, handleExitMeeting, handleIncomingSignal, isHost]);

  // Recording Timer
  useEffect(() => {
    let timer = null;
    if (recordingStatus === 'recording') {
      timer = setInterval(() => setRecordingSeconds((p) => p + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [recordingStatus]);

  // Toggle Camera
  const toggleCamera = async () => {
    try {
      if (!videoEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: audioEnabled });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setVideoEnabled(true);

        // Add or replace video track across all active peer connections
        const videoTrack = stream.getVideoTracks()[0];
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          } else {
            pc.addTrack(videoTrack, stream);
          }
        });

        socket?.emit('participant:video-state', { enabled: true });
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
        }
        setVideoEnabled(false);
        socket?.emit('participant:video-state', { enabled: false });
      }
    } catch (err) {
      alert(`Camera Access Error: ${err.message}`);
    }
  };

  // Toggle Microphone
  const toggleMicrophone = async () => {
    try {
      if (!audioEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoEnabled });
        localStreamRef.current = stream;
        setAudioEnabled(true);

        const audioTrack = stream.getAudioTracks()[0];
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
          if (sender) {
            sender.replaceTrack(audioTrack);
          } else {
            pc.addTrack(audioTrack, stream);
          }
        });

        socket?.emit('participant:audio-state', { enabled: true });
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => t.stop());
        }
        setAudioEnabled(false);
        socket?.emit('participant:audio-state', { enabled: false });
      }
    } catch (err) {
      alert(`Microphone Access Error: ${err.message}`);
    }
  };

  // Toggle Screen Share (Teacher / Host)
  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        if (mainStageVideoRef.current) mainStageVideoRef.current.srcObject = stream;
        setScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack, stream);
          }
        });

        socket?.emit('screen:start');

        screenTrack.onended = () => {
          setScreenSharing(false);
          socket?.emit('screen:stop');
          if (videoEnabled && localStreamRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0];
            peersRef.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
              if (sender && camTrack) sender.replaceTrack(camTrack);
            });
          }
        };
      } else {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        setScreenSharing(false);
        socket?.emit('screen:stop');
      }
    } catch (err) {
      alert(`Screen Share Error: ${err.message}`);
    }
  };

  // Host Recording Control & Chunk Upload
  const handleToggleRecording = async () => {
    if (!isHost) return;

    if (recordingStatus === 'recording') {
      socket?.emit('recording:stop');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } else {
      socket?.emit('recording:start');
      recChunkNumberRef.current = 1;

      try {
        const stream = screenStreamRef.current || localStreamRef.current || (await navigator.mediaDevices.getUserMedia({ video: true, audio: true }));
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });

        recorder.ondataavailable = async (e) => {
          if (e.data && e.data.size > 0) {
            const chunkNum = recChunkNumberRef.current++;
            const formData = new FormData();
            formData.append('chunk', e.data, `chunk-${chunkNum}.webm`);
            formData.append('chunkNumber', chunkNum);

            try {
              const backendBase = (API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
              await fetch(`${backendBase}/api/scalable-live-class/${classId}/recording/rec_session/chunk`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${activeToken}` },
                body: formData
              });
            } catch (err) {
              console.error(`[ChunkUpload] Failed chunk ${chunkNum}:`, err);
            }
          }
        };

        recorder.start(60000);
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.warn('Recorder note:', err.message);
      }
    }
  };

  // Host Ends Meeting For All Participants
  const handleEndClassForAll = () => {
    if (!isHost) return;
    if (window.confirm('Are you sure you want to end this live class for all participants? Everyone will be removed.')) {
      socket?.emit('class:end');
      handleExitMeeting();
    }
  };

  // Host Removes Single Student
  const handleRemoveStudent = (targetId) => {
    if (!isHost) return;
    if (window.confirm('Remove this student from the live class immediately?')) {
      socket?.emit('host:remove-participant', { targetParticipantId: targetId });
    }
  };

  // Send Chat
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit('chat:message', { text: chatInput });
    setChatInput('');
  };

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="live-classroom-container">
      {/* Header Bar */}
      <header className="live-header">
        <div className="live-header-title">
          <span>{classData?.title || 'UniSkill Live Classroom'}</span>
          <span className={`status-badge ${classData?.status === 'live' ? 'live' : 'ended'}`}>
            {classData?.status === 'live' ? '● LIVE' : classData?.status || 'SCHEDULED'}
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>
            Room: {classId} · Role: {isHost ? 'Teacher (Host)' : 'Student'}
          </span>
        </div>

        {recordingStatus === 'recording' && (
          <div className="recording-indicator">
            <div className="rec-dot" />
            <span>RECORDING {formatTime(recordingSeconds)}</span>
          </div>
        )}

        {recordingStatus === 'processing' && (
          <div style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>
            ⏳ Finalizing Recording...
          </div>
        )}

        {recordingStatus === 'completed' && finalRecordingUrl && (
          <a
            href={finalRecordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline' }}
          >
            ▶ Watch Final Recording
          </a>
        )}
      </header>

      {/* Main Content Area */}
      <div className="live-main-content">
        <div className="stage-area">
          <div className="main-screen-container">
            {/* Main Stage (Teacher Screen / Feed) */}
            <video
              ref={mainStageVideoRef}
              autoPlay
              playsInline
              controls={!isHost}
              className="screen-video-feed"
              style={{
                display:
                  screenSharing || (!isHost && remoteStreamsRef.current.get(hostId)) ? 'block' : 'none'
              }}
            />

            {/* Local Video Preview (when camera is on and not sharing screen) */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="screen-video-feed"
              style={{
                display:
                  videoEnabled && !screenSharing && (!mainStageVideoRef.current?.srcObject || isHost)
                    ? 'block'
                    : 'none'
              }}
            />

            {/* Placeholder when no video is active */}
            {!videoEnabled &&
              !screenSharing &&
              (!mainStageVideoRef.current || !mainStageVideoRef.current.srcObject) && (
                <div className="screen-placeholder">
                  <span style={{ fontSize: '3.5rem' }}>🎓</span>
                  <h3>{classData?.title || 'UniSkill Live Classroom'}</h3>
                  <p>
                    {isHost
                      ? 'Click "Cam On" or "Share Screen" below to start broadcasting.'
                      : "Teacher's stream will appear here once broadcast begins."}
                  </p>
                </div>
              )}
          </div>

          {/* Connected Participants Grid */}
          <div className="participants-grid">
            {participants.map((p) => {
              const pId = (p.userId?._id || p.userId)?.toString();
              const isTeacher = p.role === 'host' || pId === hostId;
              const remoteStream = remoteStreamsRef.current.get(pId);

              return (
                <div key={pId} className={`participant-card ${isTeacher ? 'host' : ''}`}>
                  <div className="participant-info">
                    <div className="avatar">{p.email?.[0]?.toUpperCase() || 'U'}</div>
                    <div className="participant-name">
                      {p.email} {isTeacher && '👑 (Teacher)'}
                    </div>
                  </div>

                  {/* Remote video tile if participant has active stream */}
                  {remoteStream && (
                    <video
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el && el.srcObject !== remoteStream) el.srcObject = remoteStream;
                      }}
                      style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px', marginTop: '6px' }}
                    />
                  )}

                  <div className="participant-badges">
                    <span className={`mini-badge ${!p.audioEnabled ? 'muted' : ''}`}>
                      {p.audioEnabled ? '🎤 Mic On' : '🔇 Muted'}
                    </span>
                    <span className={`mini-badge ${!p.videoEnabled ? 'muted' : ''}`}>
                      {p.videoEnabled ? '📹 Cam On' : '📷 Cam Off'}
                    </span>
                  </div>

                  {isHost && !isTeacher && (
                    <div className="host-actions-menu">
                      <button className="btn-mini" onClick={() => socket?.emit('host:mute-participant', { targetParticipantId: pId })}>
                        Mute
                      </button>
                      <button className="btn-mini" onClick={() => socket?.emit('host:disable-camera', { targetParticipantId: pId })}>
                        Disable Cam
                      </button>
                      <button className="btn-mini danger" onClick={() => handleRemoveStudent(pId)}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Drawer: Chat & Attendees */}
        <div className="side-drawer">
          <div className="drawer-tabs">
            <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
              💬 Chat ({messages.length})
            </button>
            <button className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`} onClick={() => setActiveTab('participants')}>
              👥 Attendees ({participants.length})
            </button>
          </div>

          {activeTab === 'chat' ? (
            <>
              <div className="chat-messages">
                {messages.map((m) => (
                  <div key={m.id} className="chat-bubble">
                    <div className="chat-sender">{m.senderEmail}</div>
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
              <form className="chat-input-area" onSubmit={handleSendChat}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type a message to class..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="btn-mini" style={{ backgroundColor: '#2563eb' }}>
                  Send
                </button>
              </form>
            </>
          ) : (
            <div style={{ padding: '1rem', overflowY: 'auto' }}>
              <h4 style={{ margin: '0 0 12px' }}>Participant Roster ({participants.length})</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {participants.map((p) => (
                  <li key={p.userId} style={{ padding: '0.6rem 0', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{p.email}</span>
                    <strong style={{ color: p.role === 'host' ? '#38bdf8' : '#94a3b8' }}>
                      {p.role === 'host' ? 'Host' : 'Student'}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <footer className="live-controls-bar">
        <div className="control-group">
          <button className={`ctrl-btn ${audioEnabled ? 'active' : 'off'}`} onClick={toggleMicrophone}>
            {audioEnabled ? '🎤 Mic On' : '🔇 Mic Off'}
          </button>
          <button className={`ctrl-btn ${videoEnabled ? 'active' : 'off'}`} onClick={toggleCamera}>
            {videoEnabled ? '📹 Cam On' : '📷 Cam Off'}
          </button>
          {isHost && (
            <button className={`ctrl-btn ${screenSharing ? 'active' : ''}`} onClick={toggleScreenShare}>
              🖥️ {screenSharing ? 'Stop Screen' : 'Share Screen'}
            </button>
          )}
        </div>

        <div className="control-group">
          {isHost ? (
            <>
              <button
                className={`ctrl-btn record-btn ${recordingStatus === 'recording' ? 'recording' : ''}`}
                onClick={handleToggleRecording}
              >
                🔴 {recordingStatus === 'recording' ? 'Stop Recording' : 'Start Recording'}
              </button>
              <button className="ctrl-btn" onClick={() => socket?.emit('host:mute-all')}>
                🔇 Mute All
              </button>
              <button className="ctrl-btn" onClick={() => socket?.emit('host:disable-all-cameras')}>
                📷 Disable All Cams
              </button>
              <button className="ctrl-btn end-btn" onClick={handleEndClassForAll}>
                End Class For All
              </button>
            </>
          ) : (
            <button className="ctrl-btn end-btn" onClick={() => handleExitMeeting()}>
              Leave Class
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
