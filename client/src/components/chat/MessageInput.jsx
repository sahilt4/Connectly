import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import {
  Send,
  Paperclip,
  Smile,
  X,
  Loader2,
  FileText,
  Mic,
  Trash2,
  Check,
} from 'lucide-react';

const EMOJI_PALETTE = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😋', '😛',
  '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
  '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺',
  '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶',
  '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
  '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲',
  '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧',
  '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '✨', '🌟', '💫', '💥', '💯', '💢', '💨', '🎉', '🎊',
];

export const MessageInput = ({ isBlocked = false }) => {
  const {
    activeConversation,
    sendMessage,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    editMessageText,
  } = useChat();

  const { socket } = useSocket();

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [waveformBars, setWaveformBars] = useState([20, 45, 70, 30, 85, 40, 60, 90, 50, 75]);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Sync edit mode text
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [editingMessage]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [text]);

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  const handleTyping = () => {
    if (!socket || !activeConversation) return;

    socket.emit('typing', { conversationId: activeConversation._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { conversationId: activeConversation._id });
    }, 1500);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds the 25MB limit.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setAttachedFile(res.data.media);
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert(err.response?.data?.message || 'File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const bars = [];
        const step = Math.floor(dataArray.length / 10);
        for (let i = 0; i < 10; i++) {
          bars.push(Math.max(15, (dataArray[i * step] / 255) * 100));
        }
        setWaveformBars(bars);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current) audioContextRef.current.close();
        cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setRecordedBlob(null);
    setAudioChunks([]);
  };

  const sendVoiceMessage = async () => {
    if (!recordedBlob) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', recordedBlob, 'voice-message.webm');

      const res = await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        await sendMessage({
          type: 'audio',
          media: res.data.media,
          audioDuration: recordingDuration || 1,
          waveform: waveformBars,
        });
        cancelRecording();
      }
    } catch (err) {
      console.error('Failed to send voice message:', err);
      alert('Could not send voice message.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (isBlocked) return;

    if (socket && activeConversation) {
      socket.emit('stop_typing', { conversationId: activeConversation._id });
    }

    if (editingMessage) {
      if (text.trim() && text.trim() !== editingMessage.text) {
        await editMessageText(editingMessage._id, text.trim());
      }
      setEditingMessage(null);
      setText('');
      return;
    }

    if (!text.trim() && !attachedFile) return;

    let messageType = 'text';
    if (attachedFile) {
      if (attachedFile.fileType?.startsWith('image/')) messageType = 'image';
      else if (attachedFile.fileType?.startsWith('video/')) messageType = 'video';
      else messageType = 'file';
    }

    const payload = {
      text: text.trim(),
      type: messageType,
      media: attachedFile || undefined,
      replyTo: replyingTo?._id || undefined,
    };

    setText('');
    setAttachedFile(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(payload);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isBlocked) {
    return (
      <div className="p-4 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800 select-none">
        You cannot send messages to this user.
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 border-t border-slate-200/60 dark:border-white/10 ios-glass relative z-20 safe-bottom">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2.5 mb-2 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs animate-slide-up">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-8 rounded-full bg-emerald-500 flex-shrink-0" />
            <div className="truncate">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 block">
                Replying to {replyingTo.sender?.name}
              </span>
              <span className="text-slate-600 dark:text-slate-300 truncate block">
                {replyingTo.text || 'Attachment'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit Mode Banner */}
      {editingMessage && (
        <div className="flex items-center justify-between p-2.5 mb-2 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-500/20 text-xs animate-slide-up">
          <span className="font-semibold text-amber-800 dark:text-amber-300">
            Editing message
          </span>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Preview Card */}
      {attachedFile && (
        <div className="flex items-center justify-between p-2.5 mb-2 rounded-2xl ios-glass-card text-xs animate-slide-up">
          <div className="flex items-center gap-2.5 min-w-0">
            {attachedFile.fileType?.startsWith('image/') ? (
              <img
                src={attachedFile.url}
                alt="preview"
                className="w-12 h-12 object-cover rounded-xl shadow-sm"
              />
            ) : (
              <div className="p-3 rounded-xl bg-indigo-500 text-white shadow-md">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="truncate">
              <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                {attachedFile.fileName}
              </p>
              <p className="text-[10px] text-slate-500">
                {Math.round((attachedFile.fileSize || 0) / 1024)} KB
              </p>
            </div>
          </div>
          <button
            onClick={() => setAttachedFile(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-3 left-4 w-72 sm:w-84 max-h-64 overflow-y-auto ios-glass-card rounded-[28px] p-3.5 z-30 animate-spring-popup">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-white/10">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Emojis</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1.5 text-xl">
            {EMOJI_PALETTE.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => addEmoji(emoji)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-transform active:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Recording Active Bar OR Normal Composer */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 p-2.5 bg-rose-500/10 dark:bg-rose-950/40 rounded-2xl border border-rose-500/30 animate-fade-in">
          {/* Pulsing Mic & Timer */}
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
              {formatTimer(recordingDuration)}
            </span>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex items-center gap-1 h-6 flex-1 justify-center px-4">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className="w-1 bg-rose-500 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(12, height)}%` }}
              />
            ))}
          </div>

          {/* Actions: Cancel or Stop & Send */}
          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors ios-btn-interactive"
              title="Cancel recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                stopRecording();
                setTimeout(sendVoiceMessage, 200);
              }}
              className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/30 transition-transform ios-btn-interactive"
              title="Send voice message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Normal Message Composer Row */
        <form onSubmit={handleSend} className="flex items-end gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.xls,.xlsx"
          />

          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((p) => !p)}
            className={`p-2.5 rounded-2xl transition-all ios-btn-interactive ${
              showEmojiPicker
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-2xl transition-all disabled:opacity-50 ios-btn-interactive"
            title="Attach photo, video or document"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          {/* Text Input */}
          <div className="flex-1 ios-glass-input rounded-2xl px-4 py-2 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                editingMessage
                  ? 'Edit your message...'
                  : 'Message... (Enter to send)'
              }
              className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-36 py-0.5 leading-relaxed"
            />
          </div>

          {/* Send or Voice Record Button */}
          {text.trim() || attachedFile || editingMessage ? (
            <button
              type="submit"
              disabled={isUploading}
              className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 transition-all font-semibold flex items-center justify-center ios-btn-interactive"
              title={editingMessage ? 'Save changes' : 'Send'}
            >
              {editingMessage ? (
                <Check className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-all ios-btn-interactive"
              title="Record Voice Message"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </form>
      )}
    </div>
  );
};
