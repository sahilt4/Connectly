import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Avatar } from '../common/Avatar';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MediaLightbox } from './MediaLightbox';
import { ForwardModal } from './ForwardModal';
import { SharedMediaDrawer } from './SharedMediaDrawer';
import { DisappearingMessagesModal } from './DisappearingMessagesModal';
import { formatMessageDateHeader } from '../../utils/date';
import {
  ArrowLeft,
  Phone,
  Clock,
  MoreVertical,
  UserX,
  UserCheck,
  Flag,
  ChevronDown,
  Info,
  FolderOpen,
  Sparkles,
  X,
} from 'lucide-react';

export const ChatRoom = ({ onBack, onOpenProfile, onOpenReport, onStartCall }) => {
  const {
    activeConversation,
    setActiveConversation,
    messages,
    loadingMessages,
    isRecipientTyping,
    fetchConversations,
  } = useChat();

  const { isUserOnline } = useSocket();
  const { user: currentUser } = useAuth();

  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [forwardMessageData, setForwardMessageData] = useState(null);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [showSharedMedia, setShowSharedMedia] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [disappearingSettings, setDisappearingSettings] = useState(
    activeConversation?.disappearingSettings || { enabled: false, duration: 'off' }
  );
  const [isBlocking, setIsBlocking] = useState(false);

  const scrollContainerRef = useRef(null);

  const recipient = activeConversation?.recipient;
  const isOnline = recipient ? isUserOnline(recipient._id) : false;

  const handleCloseChat = () => {
    setActiveConversation(null);
    if (onBack) onBack();
  };

  // Close chat on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeConversation) {
        handleCloseChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeConversation]);

  useEffect(() => {
    if (activeConversation) {
      setDisappearingSettings(
        activeConversation.disappearingSettings || { enabled: false, duration: 'off' }
      );
      // Instant scroll to bottom inside container on chat switch
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [activeConversation?._id]);

  // Smooth scroll to bottom on new messages ONLY inside message container (no window scroll)
  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 250;
      if (isNearBottom || messages.length <= 1) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages.length, isRecipientTyping]);

  // Handle scroll detection for "Scroll to bottom" button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 180;
    setShowScrollBottomBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleToggleBlock = async () => {
    if (!recipient) return;
    try {
      setIsBlocking(true);
      if (recipient.isBlockedByMe) {
        await api.post('/safety/unblock', { userId: recipient._id });
        recipient.isBlocked = false;
        recipient.isBlockedByMe = false;
      } else {
        await api.post('/safety/block', { userId: recipient._id });
        recipient.isBlocked = true;
        recipient.isBlockedByMe = true;
      }
      setShowOptionsDropdown(false);
      fetchConversations();
    } catch (err) {
      console.error('Failed to toggle block:', err);
      alert(err.response?.data?.message || 'Failed to update block status.');
    } finally {
      setIsBlocking(false);
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500/20 via-violet-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-500 flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/10 animate-bounce-subtle">
          <Sparkles className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
          Welcome to <span className="gradient-text-primary">Connectly</span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          Select a conversation from the sidebar or find someone to start an ultra-fast private chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-white/40 dark:bg-slate-950/40">
      {/* Chat Room Top Navigation Header */}
      <div className="h-18 px-4 sm:px-6 border-b border-slate-200/60 dark:border-white/10 ios-glass flex items-center justify-between z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button (Mobile view) */}
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-1.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ios-btn-interactive"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Recipient Profile Info */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none py-1 group"
            onClick={() => onOpenProfile && onOpenProfile(recipient)}
          >
            <div className="relative">
              <Avatar
                src={recipient?.avatar}
                name={recipient?.name}
                size="md"
                showStatus={true}
                isOnline={isOnline}
                className="ring-2 ring-indigo-500/30 group-hover:ring-indigo-500 transition-all"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-tight group-hover:text-indigo-500 transition-colors">
                  {recipient?.name}
                </h2>
                {recipient?.customStatus && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium hidden sm:inline">
                    {recipient.statusEmoji} {recipient.customStatus}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {isRecipientTyping ? (
                  <span className="text-indigo-500 font-semibold animate-pulse">
                    typing...
                  </span>
                ) : isOnline ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    online
                  </span>
                ) : (
                  `@${recipient?.username || 'user'}`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Top Header Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Audio Call Button */}
          <button
            onClick={() => onStartCall && onStartCall(recipient)}
            disabled={recipient?.isBlocked}
            className="p-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-indigo-500 hover:bg-black/5 dark:hover:bg-white/10 transition-all disabled:opacity-40 ios-btn-interactive"
            title="Start Audio Call"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* Shared Media Drawer Toggle */}
          <button
            onClick={() => setShowSharedMedia(!showSharedMedia)}
            className={`p-2.5 rounded-2xl transition-all ios-btn-interactive ${
              showSharedMedia
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Shared Media & Files"
          >
            <FolderOpen className="w-5 h-5" />
          </button>

          {/* Disappearing Messages Quick Button */}
          <button
            onClick={() => setShowDisappearingModal(true)}
            className={`p-2.5 rounded-2xl transition-all ios-btn-interactive ${
              disappearingSettings?.enabled
                ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Disappearing Messages"
          >
            <Clock className="w-5 h-5" />
          </button>

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsDropdown((p) => !p)}
              className="p-2.5 rounded-2xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-all ios-btn-interactive"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showOptionsDropdown && (
              <div className="absolute right-0 mt-2 w-52 ios-glass-card rounded-2xl p-1.5 z-30 animate-spring-popup shadow-2xl">
                <button
                  onClick={() => {
                    setShowOptionsDropdown(false);
                    if (onOpenProfile) onOpenProfile(recipient);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2.5"
                >
                  <Info className="w-4 h-4 text-slate-400" />
                  View Profile
                </button>

                <button
                  onClick={() => {
                    setShowOptionsDropdown(false);
                    setShowDisappearingModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2.5"
                >
                  <Clock className="w-4 h-4 text-amber-500" />
                  Disappearing Messages
                </button>

                <button
                  onClick={handleToggleBlock}
                  disabled={isBlocking}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2.5"
                >
                  {recipient?.isBlockedByMe ? (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      Unblock User
                    </>
                  ) : (
                    <>
                      <UserX className="w-4 h-4 text-rose-500" />
                      Block User
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowOptionsDropdown(false);
                    if (onOpenReport) onOpenReport(recipient);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-2.5"
                >
                  <Flag className="w-4 h-4 text-rose-500" />
                  Report User
                </button>

                <div className="border-t border-white/10 my-1" />

                <button
                  onClick={() => {
                    setShowOptionsDropdown(false);
                    handleCloseChat();
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2.5"
                >
                  <X className="w-4 h-4 text-slate-400" />
                  Close Chat (Esc)
                </button>
              </div>
            )}
          </div>

          {/* Close Chat Button */}
          <button
            onClick={handleCloseChat}
            className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all ios-btn-interactive ml-1"
            title="Close chat (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Disappearing Messages Active Banner */}
      {disappearingSettings?.enabled && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-[11px] text-amber-600 dark:text-amber-300 flex items-center justify-between backdrop-blur-md">
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Disappearing messages are ON (Expires in {disappearingSettings.duration})
          </span>
          <button
            onClick={() => setShowDisappearingModal(true)}
            className="font-bold underline hover:text-amber-500"
          >
            Change
          </button>
        </div>
      )}

      {/* Blocked banner notice */}
      {recipient?.isBlocked && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs text-rose-600 dark:text-rose-300 flex items-center justify-between backdrop-blur-md">
          <span>
            {recipient?.isBlockedByMe
              ? 'You have blocked this user. Unblock to resume messaging.'
              : 'Communication is unavailable in this conversation.'}
          </span>
          {recipient?.isBlockedByMe && (
            <button
              onClick={handleToggleBlock}
              className="font-bold underline ml-2 hover:text-rose-500"
            >
              Unblock
            </button>
          )}
        </div>
      )}

      {/* Messages Stream Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1 relative"
      >
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <Avatar src={recipient?.avatar} name={recipient?.name} size="xl" className="mb-3 shadow-xl" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {recipient?.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              This is the beginning of your private end-to-end messaging history with @{recipient?.username}.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;

            const isNewDay =
              !prevMsg ||
              new Date(prevMsg.createdAt).toDateString() !==
                new Date(msg.createdAt).toDateString();

            return (
              <React.Fragment key={msg._id || index}>
                {isNewDay && (
                  <div className="flex justify-center my-4 select-none">
                    <span className="text-[11px] font-semibold px-3.5 py-1 rounded-full ios-glass text-slate-600 dark:text-slate-300 shadow-sm border">
                      {formatMessageDateHeader(msg.createdAt)}
                    </span>
                  </div>
                )}

                <MessageBubble
                  message={msg}
                  previousMessage={prevMsg}
                  onOpenLightbox={(media) => setLightboxMedia(media)}
                  onForwardMessage={(m) => setForwardMessageData(m)}
                />
              </React.Fragment>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {isRecipientTyping && (
          <div className="flex items-center gap-2 my-2 animate-fade-in">
            <div className="px-4 py-2.5 ios-glass rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span
                className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Scroll to Latest Button */}
      {showScrollBottomBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 p-3 rounded-full ios-glass text-indigo-500 shadow-xl border hover:scale-110 active:scale-95 transition-all z-20 ios-btn-interactive"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Message Composer */}
      <MessageInput isBlocked={recipient?.isBlocked} />

      {/* Shared Media Drawer */}
      <SharedMediaDrawer
        isOpen={showSharedMedia}
        onClose={() => setShowSharedMedia(false)}
        conversationId={activeConversation._id}
        onOpenLightbox={(m) => setLightboxMedia(m)}
      />

      {/* Disappearing Messages Configuration Modal */}
      <DisappearingMessagesModal
        isOpen={showDisappearingModal}
        onClose={() => setShowDisappearingModal(false)}
        conversationId={activeConversation._id}
        currentSetting={disappearingSettings?.duration || 'off'}
        onUpdated={(settings) => setDisappearingSettings(settings)}
      />

      {/* Lightbox Modal */}
      <MediaLightbox
        isOpen={!!lightboxMedia}
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />

      {/* Forward Modal */}
      <ForwardModal
        isOpen={!!forwardMessageData}
        messageToForward={forwardMessageData}
        onClose={() => setForwardMessageData(null)}
      />
    </div>
  );
};
