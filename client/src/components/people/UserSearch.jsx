import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { Search, MessageSquare, Loader2, Users, Sparkles } from 'lucide-react';

export const UserSearch = ({ onOpenProfile, onStartChat, onOpenConnections }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isUserOnline } = useSocket();
  const { openChatWithUser } = useChat();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
        if (res.data.success) {
          setResults(res.data.users);
        }
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleMessageClick = async (e, targetUser) => {
    e.stopPropagation();
    try {
      await openChatWithUser(targetUser);
      if (onStartChat) onStartChat();
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Search Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200/50 dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight gradient-text-primary">
              Find People
            </h1>
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          </div>

          <button
            onClick={onOpenConnections}
            className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 hover:from-indigo-500/25 hover:to-purple-500/25 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 ios-btn-interactive shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            Connections
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, @username, or #USR-ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 ios-glass-input text-xs sm:text-sm rounded-2xl placeholder:text-slate-400 focus:outline-none"
            autoFocus
          />
          {loading && (
            <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
        {results.length > 0 ? (
          results.map((targetUser) => {
            const online = isUserOnline(targetUser._id);
            return (
              <div
                key={targetUser._id}
                onClick={() => onOpenProfile && onOpenProfile(targetUser)}
                className="flex items-center justify-between p-3.5 rounded-2xl ios-glass-subtle hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 transition-all cursor-pointer shadow-sm hover:shadow-md group ios-btn-interactive"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={targetUser.avatar}
                    name={targetUser.name}
                    size="md"
                    showStatus={true}
                    isOnline={online}
                    className="group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-400 transition-colors">
                        {targetUser.name}
                      </h3>
                      {targetUser.customStatus && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 font-medium">
                          {targetUser.statusEmoji} {targetUser.customStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="truncate">@{targetUser.username}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10">
                        {targetUser.publicId}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={MessageSquare}
                  onClick={(e) => handleMessageClick(e, targetUser)}
                >
                  Chat
                </Button>
              </div>
            );
          })
        ) : query.trim() && !loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
            <Users className="w-12 h-12 mb-2 opacity-40 text-indigo-400" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No users found
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Check the spelling or try searching by exact username or public user ID.
            </p>
          </div>
        ) : !query.trim() ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
            <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/10 animate-bounce-subtle">
              <Sparkles className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Search for friends
            </p>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
              Type a name, username, or unique public ID like <span className="font-mono text-indigo-400 font-bold">USR-XXXXX</span> to connect instantly.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
