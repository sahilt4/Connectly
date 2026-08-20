import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../common/Avatar';
import { StoryBar } from '../stories/StoryBar';
import { formatChatListTime } from '../../utils/date';
import {
  Search,
  Image as ImageIcon,
  FileText,
  MessageSquare,
  Mic,
  Video,
  Clock,
  Sparkles,
} from 'lucide-react';

export const ChatList = ({
  onSelectChat,
  onNavigateToPeople,
  onOpenStoryCreator,
  onOpenStoryViewer,
}) => {
  const { conversations, activeConversation, loadingChats } = useChat();
  const { isUserOnline } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((c) => {
    if (!c.recipient) return false;
    const nameMatch = c.recipient.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const usernameMatch = c.recipient.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = c.recipient.publicId?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || usernameMatch || idMatch;
  });

  const renderLastMessageSnippet = (conv) => {
    const msg = conv.lastMessage;
    if (!msg) return <span className="italic text-slate-400">No messages yet</span>;

    if (msg.isDeletedForEveryone) {
      return <span className="italic text-slate-400">This message was deleted</span>;
    }

    if (msg.type === 'audio') {
      return (
        <span className="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400 font-medium">
          <Mic className="w-3.5 h-3.5" />
          <span>Voice message ({msg.audioDuration || 0}s)</span>
        </span>
      );
    }

    if (msg.type === 'video') {
      return (
        <span className="flex items-center gap-1.5 text-violet-500 font-medium">
          <Video className="w-3.5 h-3.5" />
          <span>Video</span>
        </span>
      );
    }

    if (msg.type === 'image') {
      return (
        <span className="flex items-center gap-1.5 text-cyan-500 font-medium">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Photo</span>
        </span>
      );
    }

    if (msg.type === 'file') {
      return (
        <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
          <FileText className="w-3.5 h-3.5" />
          <span className="truncate">{msg.media?.fileName || 'Attachment'}</span>
        </span>
      );
    }

    return <span className="truncate">{msg.text}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Top Header */}
      <div className="p-4 sm:p-5 pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight gradient-text-primary">
              Messages
            </h1>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
          </span>
        </div>

        {/* Liquid Glass Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 ios-glass-input text-slate-900 dark:text-slate-100 text-xs sm:text-sm rounded-2xl placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* 24-Hour Stories Carousel Bar */}
      <StoryBar
        onOpenCreator={onOpenStoryCreator}
        onOpenViewer={onOpenStoryViewer}
      />

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/40 dark:divide-white/5 p-2 space-y-1">
        {loadingChats ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl ios-glass animate-pulse">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-indigo-500/20 rounded-lg w-1/3" />
                  <div className="h-3 bg-indigo-500/10 rounded-lg w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
            <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/10 animate-bounce-subtle">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {searchQuery ? 'No chats match your search' : 'No conversations yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] leading-relaxed">
              {searchQuery
                ? 'Try searching by name, username, or public ID'
                : 'Connect with someone or start a new chat!'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNavigateToPeople}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all ios-btn-interactive"
              >
                Find People
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const recipient = conv.recipient;
            const isOnline = recipient ? isUserOnline(recipient._id) : false;
            const isSelected = activeConversation?._id === conv._id;
            const hasUnread = (conv.unreadCount || 0) > 0;

            return (
              <div
                key={conv._id}
                onClick={() => onSelectChat(conv)}
                className={`flex items-center gap-3.5 p-3 sm:px-3.5 rounded-2xl cursor-pointer transition-all duration-200 relative group ios-btn-interactive ${
                  isSelected
                    ? 'bg-indigo-500/15 dark:bg-indigo-500/20 border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                {/* Avatar with Online indicator */}
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={recipient?.avatar}
                    name={recipient?.name}
                    size="md"
                    showStatus={true}
                    isOnline={isOnline}
                    className="shadow-sm ring-2 ring-white/20 dark:ring-white/10 group-hover:scale-105 transition-transform"
                  />
                </div>

                {/* Chat summary details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3
                        className={`text-sm truncate ${
                          hasUnread
                            ? 'font-bold text-slate-900 dark:text-slate-100'
                            : 'font-semibold text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {recipient?.name}
                      </h3>
                      {recipient?.customStatus && (
                        <span className="text-[10px] text-slate-400">
                          {recipient.statusEmoji}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] flex-shrink-0 ${
                        hasUnread
                          ? 'font-bold text-indigo-500 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {conv.lastMessageAt ? formatChatListTime(conv.lastMessageAt) : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <p
                      className={`truncate max-w-[200px] text-xs ${
                        hasUnread
                          ? 'font-semibold text-slate-900 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {renderLastMessageSnippet(conv)}
                    </p>

                    {/* Unread badge or Disappearing indicator */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {conv.disappearingSettings?.enabled && (
                        <Clock className="w-3.5 h-3.5 text-amber-500" title="Disappearing messages" />
                      )}
                      {hasUnread && (
                        <span className="px-2 py-0.5 min-w-[20px] text-center text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-full shadow-md shadow-indigo-500/30 animate-spring-popup">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
