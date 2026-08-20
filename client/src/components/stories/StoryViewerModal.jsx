import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Send,
  Heart,
  Smile,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

export const StoryViewerModal = ({ isOpen, storyGroup, onClose, onStoryDeleted }) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [reactedEmoji, setReactedEmoji] = useState(null);

  const progressIntervalRef = useRef(null);

  const stories = storyGroup?.stories || [];
  const activeStory = stories[currentIndex];
  const isOwn = storyGroup?.isOwn;

  // Reset state on open or story group change
  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    setIsPaused(false);
    setShowViewers(false);
    setReactedEmoji(null);
  }, [storyGroup]);

  // Mark active story as viewed
  useEffect(() => {
    if (activeStory && !isOwn) {
      api.post(`/stories/${activeStory._id}/view`).catch(console.error);
    }
  }, [activeStory?._id, isOwn]);

  // Auto-progress timer (5 seconds per story)
  useEffect(() => {
    if (!isOpen || !activeStory || isPaused || showViewers) {
      clearInterval(progressIntervalRef.current);
      return;
    }

    const duration = activeStory.mediaType === 'video' ? 10000 : 5000;
    const step = 50; // ms
    const increment = (step / duration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, step);

    return () => clearInterval(progressIntervalRef.current);
  }, [isOpen, currentIndex, isPaused, activeStory, showViewers]);

  if (!isOpen || !storyGroup || stories.length === 0 || !activeStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleReact = async (emoji) => {
    try {
      setReactedEmoji(emoji);
      await api.post(`/stories/${activeStory._id}/react`, { emoji });
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply) return;

    try {
      setSendingReply(true);
      await api.post(`/stories/${activeStory._id}/reply`, { text: replyText.trim() });
      setReplyText('');
      // brief pause before resuming
      setTimeout(() => {
        setIsPaused(false);
      }, 500);
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this story?')) return;
    try {
      await api.delete(`/stories/${activeStory._id}`);
      if (onStoryDeleted) onStoryDeleted(activeStory._id);
      if (stories.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md select-none animate-fade-in">
      {/* Main Story Container */}
      <div
        className="relative w-full max-w-sm h-full max-h-[85vh] sm:max-h-[800px] sm:rounded-3xl overflow-hidden bg-slate-950 flex flex-col justify-between shadow-2xl border border-slate-800"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bars on Top */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
          {stories.map((s, idx) => (
            <div
              key={s._id}
              className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header (Author + Time + Close) */}
        <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar
              src={storyGroup.author.avatar}
              name={storyGroup.author.name}
              size="sm"
            />
            <div className="text-white drop-shadow-md">
              <div className="text-xs font-bold leading-tight">
                {isOwn ? 'Your Story' : storyGroup.author.name}
              </div>
              <div className="text-[10px] text-white/70">
                {formatDistanceToNow(new Date(activeStory.createdAt), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwn && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="p-1.5 rounded-full bg-black/40 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                title="Delete Story"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Story Content Viewport */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {activeStory.mediaType === 'image' && (
            <img
              src={activeStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-cover"
            />
          )}

          {activeStory.mediaType === 'video' && (
            <video
              src={activeStory.mediaUrl}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {activeStory.mediaType === 'text' && (
            <div
              className={`w-full h-full bg-gradient-to-br ${
                activeStory.textBackground || 'from-emerald-600 to-teal-800'
              } flex flex-col items-center justify-center p-8 text-center text-white`}
            >
              <p className="text-2xl font-extrabold leading-relaxed drop-shadow-md whitespace-pre-wrap">
                {activeStory.textContent}
              </p>
            </div>
          )}

          {/* Stickers */}
          {activeStory.stickers?.map((st, idx) => (
            <div
              key={idx}
              className="absolute text-5xl drop-shadow-lg"
              style={{
                top: `${st.y || 50}%`,
                left: `${st.x || 50}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {st.emoji}
            </div>
          ))}

          {/* Caption Overlay */}
          {activeStory.caption && (
            <div className="absolute bottom-20 left-4 right-4 z-20 p-3 rounded-2xl bg-black/60 backdrop-blur-md text-white text-xs font-medium text-center">
              {activeStory.caption}
            </div>
          )}

          {/* Left/Right Tap Area for Nav */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-0 top-16 bottom-20 w-1/3 z-10 focus:outline-none"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-0 top-16 bottom-20 w-1/3 z-10 focus:outline-none"
          />
        </div>

        {/* Footer Area: Replies & Reactions (for others) OR Viewer Counter (for author) */}
        <div className="relative z-30 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {isOwn ? (
            <div className="flex items-center justify-between text-white">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewers(!showViewers);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-xs font-semibold transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>{activeStory.viewers?.length || 0} Viewers</span>
              </button>

              {activeStory.reactions?.length > 0 && (
                <div className="flex items-center gap-1 text-sm bg-white/20 px-3 py-1 rounded-full">
                  {activeStory.reactions.map((r, i) => (
                    <span key={i} title={r.user?.name}>
                      {r.emoji}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Quick Reactions Bar */}
              <div className="flex items-center justify-around">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReact(emoji);
                    }}
                    className={`text-2xl p-1 hover:scale-125 transition-transform ${
                      reactedEmoji === emoji ? 'scale-125 drop-shadow' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${storyGroup.author.name}...`}
                  className="flex-1 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-xs placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sendingReply}
                  className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-full transition-transform hover:scale-105"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Viewers Bottom Drawer (for own stories) */}
        {showViewers && (
          <div className="absolute inset-x-0 bottom-0 top-1/3 z-40 bg-slate-900/95 backdrop-blur-xl rounded-t-3xl p-5 flex flex-col border-t border-slate-700 animate-slide-up text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Story Viewers</h3>
              </div>
              <button
                onClick={() => setShowViewers(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {activeStory.viewers?.map((v, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      src={v.user?.avatar}
                      name={v.user?.name || 'Viewer'}
                      size="sm"
                    />
                    <div>
                      <div className="text-xs font-semibold">{v.user?.name}</div>
                      <div className="text-[10px] text-slate-400">
                        @{v.user?.username}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {formatDistanceToNow(new Date(v.viewedAt), { addSuffix: true })}
                  </span>
                </div>
              ))}

              {(!activeStory.viewers || activeStory.viewers.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-6">
                  No views yet. Share with more friends!
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
