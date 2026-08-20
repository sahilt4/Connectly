import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { formatMessageTime, formatFileSize } from '../../utils/date';
import {
  Check,
  CheckCheck,
  Reply,
  Smile,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Share2,
  FileText,
  Download,
  Play,
  Pause,
  Clock,
  Flame,
} from 'lucide-react';

const POPULAR_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export const MessageBubble = ({
  message,
  previousMessage,
  onOpenLightbox,
  onForwardMessage,
}) => {
  const { user } = useAuth();
  const {
    setReplyingTo,
    setEditingMessage,
    deleteMessageAction,
    reactToMessageAction,
  } = useChat();

  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  // Audio voice player state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  const isSender =
    message.sender?._id?.toString() === user?._id?.toString() ||
    message.sender?.toString() === user?._id?.toString();

  const isDeleted = message.isDeletedForEveryone;

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.playbackRate = audioPlaybackRate;
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const togglePlaybackRate = () => {
    const nextRate = audioPlaybackRate === 1 ? 1.5 : audioPlaybackRate === 1.5 ? 2 : 1;
    setAudioPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatAudioTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderStatusTicks = () => {
    if (!isSender) return null;
    if (message.status === 'seen') {
      return <CheckCheck className="w-3.5 h-3.5 text-emerald-200" title="Seen" />;
    }
    if (message.status === 'delivered') {
      return <CheckCheck className="w-3.5 h-3.5 text-white/70" title="Delivered" />;
    }
    return <Check className="w-3.5 h-3.5 text-white/60" title="Sent" />;
  };

  // If system message
  if (message.type === 'system') {
    return (
      <div className="my-2.5 flex justify-center w-full">
        <span className="px-3 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-300/40 dark:border-slate-700/40 shadow-xs">
          {message.text}
        </span>
      </div>
    );
  }

  const waveform = message.waveform?.length > 0
    ? message.waveform
    : [30, 60, 90, 45, 80, 50, 70, 40, 85, 65, 45, 75, 55, 35];

  return (
    <div
      className={`group relative flex flex-col my-1 ${
        isSender ? 'items-end' : 'items-start'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
        setShowDeleteMenu(false);
      }}
    >
      <div
        className={`relative flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%] ${
          isSender ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Main Message Bubble */}
        <div
          className={`relative px-3.5 py-2 text-sm shadow-sm transition-all ${
            isSender
              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl rounded-tr-sm'
              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-sm border border-slate-100 dark:border-slate-700/60'
          }`}
        >
          {/* Reply Reference Preview */}
          {message.replyTo && (
            <div
              className={`mb-1.5 p-2 rounded-lg text-xs border-l-2 flex flex-col ${
                isSender
                  ? 'bg-black/15 border-white/80 text-white/90'
                  : 'bg-slate-100 dark:bg-slate-700/50 border-emerald-500 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-semibold text-[11px]">
                {message.replyTo.sender?.name || 'User'}
              </span>
              <span className="truncate opacity-80 mt-0.5">
                {message.replyTo.type === 'audio'
                  ? '🎤 Voice Message'
                  : message.replyTo.type === 'image'
                  ? '📷 Photo'
                  : message.replyTo.type === 'file'
                  ? '📎 Attachment'
                  : message.replyTo.text}
              </span>
            </div>
          )}

          {/* Deleted message state */}
          {isDeleted ? (
            <div className="italic text-xs opacity-75 flex items-center gap-1.5 py-1">
              <span>🚫 This message was deleted</span>
            </div>
          ) : (
            <>
              {/* Photo Attachment */}
              {message.type === 'image' && message.media?.url && (
                <div className="mb-1.5 mt-0.5 overflow-hidden rounded-xl cursor-pointer">
                  <img
                    src={message.media.url}
                    alt="attachment"
                    onClick={() => onOpenLightbox(message.media)}
                    className="max-h-64 sm:max-h-80 w-auto rounded-xl object-cover hover:opacity-95 transition-opacity"
                  />
                </div>
              )}

              {/* Video Attachment */}
              {message.type === 'video' && message.media?.url && (
                <div className="mb-1.5 mt-0.5 overflow-hidden rounded-xl">
                  <video
                    src={message.media.url}
                    controls
                    className="max-h-64 sm:max-h-80 w-auto rounded-xl"
                  />
                </div>
              )}

              {/* Voice Message Player */}
              {message.type === 'audio' && message.media?.url && (
                <div className="flex items-center gap-3 py-1 min-w-[200px] sm:min-w-[240px]">
                  <audio
                    ref={audioRef}
                    src={message.media.url}
                    onTimeUpdate={(e) => setAudioCurrentTime(e.target.currentTime)}
                    onEnded={() => {
                      setIsPlayingAudio(false);
                      setAudioCurrentTime(0);
                    }}
                  />

                  {/* Play / Pause Toggle Button */}
                  <button
                    onClick={togglePlayAudio}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-md flex-shrink-0 ${
                      isSender
                        ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Waveform Visualization Bars */}
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-0.5 h-6">
                      {waveform.map((val, idx) => {
                        const isPlayed =
                          (idx / waveform.length) * (message.audioDuration || 10) <=
                          audioCurrentTime;
                        return (
                          <div
                            key={idx}
                            className={`flex-1 rounded-full transition-all duration-100 ${
                              isPlayed
                                ? isSender
                                  ? 'bg-white'
                                  : 'bg-emerald-600'
                                : isSender
                                ? 'bg-white/40'
                                : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                            style={{ height: `${Math.max(20, val)}%` }}
                          />
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
                      <span>
                        {formatAudioTime(
                          isPlayingAudio ? audioCurrentTime : message.audioDuration || 0
                        )}
                      </span>
                      <button
                        onClick={togglePlaybackRate}
                        className="px-1 py-0.2 rounded bg-black/20 text-[9px] font-bold hover:bg-black/30"
                      >
                        {audioPlaybackRate}x
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Document File Attachment */}
              {message.type === 'file' && message.media?.url && (
                <div
                  className={`mb-1.5 flex items-center gap-3 p-2.5 rounded-xl ${
                    isSender
                      ? 'bg-black/15 text-white'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-indigo-500 text-white">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-semibold truncate">
                      {message.media.fileName || 'Document'}
                    </p>
                    <p className="text-[10px] opacity-75">
                      {formatFileSize(message.media.fileSize)}
                    </p>
                  </div>
                  <a
                    href={message.media.url}
                    download={message.media.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Message text */}
              {message.text && (
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.text}
                </p>
              )}
            </>
          )}

          {/* Bubble Meta Footer (Time, Disappearing icon, Edited tag, Status ticks) */}
          <div
            className={`flex items-center gap-1.5 justify-end mt-1 text-[10px] select-none ${
              isSender ? 'text-emerald-100/80' : 'text-slate-400 dark:text-slate-400'
            }`}
          >
            {message.expiresAt && (
              <Clock className="w-3 h-3 text-amber-300" title="Disappearing message" />
            )}
            {message.isEdited && !isDeleted && (
              <span className="text-[9px] italic opacity-80">(edited)</span>
            )}
            <span>{formatMessageTime(message.createdAt)}</span>
            {renderStatusTicks()}
          </div>
        </div>

        {/* Action buttons (Hover overlay menu) */}
        {!isDeleted && showActions && (
          <div
            className={`flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 animate-fade-in z-20 ${
              isSender ? 'mr-1' : 'ml-1'
            }`}
          >
            {/* Quick Reactions trigger */}
            <div className="relative">
              <button
                onClick={() => setShowReactionPicker((p) => !p)}
                className="p-1 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="React"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {/* Reaction picker popover */}
              {showReactionPicker && (
                <div className="absolute bottom-full mb-2 left-0 flex items-center gap-1 p-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 animate-slide-up">
                  {POPULAR_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        reactToMessageAction(message._id, emoji);
                        setShowReactionPicker(false);
                      }}
                      className="p-1 text-base hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply */}
            <button
              onClick={() => setReplyingTo(message)}
              className="p-1 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            {/* Copy */}
            {message.text && (
              <button
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Copy"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Forward */}
            <button
              onClick={() => onForwardMessage(message)}
              className="p-1 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Forward"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Edit (only if sender and text message) */}
            {isSender && message.type === 'text' && (
              <button
                onClick={() => setEditingMessage(message)}
                className="p-1 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDeleteMenu((p) => !p)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {showDeleteMenu && (
                <div className="absolute bottom-full mb-2 right-0 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30 animate-slide-up">
                  <button
                    onClick={() => {
                      deleteMessageAction(message._id, false);
                      setShowDeleteMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Delete for me
                  </button>
                  {isSender && (
                    <button
                      onClick={() => {
                        deleteMessageAction(message._id, true);
                        setShowDeleteMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium"
                    >
                      Delete for everyone
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reactions Badge Pills */}
      {message.reactions && message.reactions.length > 0 && !isDeleted && (
        <div
          className={`flex flex-wrap items-center gap-1 mt-1 z-10 ${
            isSender ? 'justify-end mr-1' : 'justify-start ml-1'
          }`}
        >
          {Object.entries(
            message.reactions.reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {})
          ).map(([emoji, count]) => {
            const hasMyReaction = message.reactions.some(
              (r) =>
                (r.userId?._id || r.userId)?.toString() === user?._id?.toString() &&
                r.emoji === emoji
            );

            return (
              <button
                key={emoji}
                onClick={() => reactToMessageAction(message._id, emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-transform active:scale-95 shadow-sm ${
                  hasMyReaction
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-[10px] font-bold">{count}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
