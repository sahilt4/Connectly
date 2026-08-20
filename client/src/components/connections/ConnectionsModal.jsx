import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import {
  X,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Search,
  MessageSquare,
} from 'lucide-react';

export const ConnectionsModal = ({ isOpen, onClose, onStartChat, onOpenProfile }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('connections'); // 'connections' | 'pending' | 'find'
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchConnections();
      fetchPendingRequests();
    }
  }, [isOpen]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await api.get('/connections');
      if (res.data.success) {
        setConnections(res.data.connections);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await api.get('/connections/pending');
      if (res.data.success) {
        setPendingRequests(res.data.pendingRequests);
      }
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const res = await api.get(`/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.data.success) {
        setSearchResults(res.data.users);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (targetUserId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
      await api.post(`/connections/request/${targetUserId}`);
      // Update local status in search results
      setSearchResults((prev) =>
        prev.map((u) => (u._id === targetUserId ? { ...u, connectionStatus: 'pending' } : u))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request');
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleAcceptRequest = async (connectionId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [connectionId]: true }));
      await api.post(`/connections/${connectionId}/accept`);
      setPendingRequests((prev) => prev.filter((r) => r._id !== connectionId));
      fetchConnections();
    } catch (err) {
      alert('Failed to accept request');
    } finally {
      setActionLoading((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleRejectRequest = async (connectionId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [connectionId]: true }));
      await api.post(`/connections/${connectionId}/reject`);
      setPendingRequests((prev) => prev.filter((r) => r._id !== connectionId));
    } catch (err) {
      alert('Failed to reject request');
    } finally {
      setActionLoading((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleRemoveConnection = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to remove this connection?')) return;
    try {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
      await api.delete(`/connections/${targetUserId}`);
      setConnections((prev) => prev.filter((c) => c.user._id !== targetUserId));
    } catch (err) {
      alert('Failed to remove connection');
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Connections & Network
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Manage your direct communication connections
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 pt-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'connections'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            My Connections ({connections.length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all relative ${
              activeTab === 'pending'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-rose-500 text-white rounded-full font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('find')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'find'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Find People
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {/* Tab 1: My Connections */}
          {activeTab === 'connections' && (
            <div>
              {connections.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No connections yet</p>
                  <p className="text-xs mt-1">Connect with friends to share stories and call!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {connections.map(({ user: connUser }) => (
                    <div
                      key={connUser._id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between hover:border-emerald-500/40 transition-colors"
                    >
                      <div
                        onClick={() => {
                          onOpenProfile(connUser);
                          onClose();
                        }}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <div className="relative">
                          <Avatar src={connUser.avatar} name={connUser.name} size="md" />
                          {connUser.isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {connUser.name}
                            </span>
                            {connUser.customStatus && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {connUser.statusEmoji} {connUser.customStatus}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            @{connUser.username}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onStartChat(connUser);
                            onClose();
                          }}
                          className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          title="Message"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveConnection(connUser._id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remove Connection"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Pending Requests */}
          {activeTab === 'pending' && (
            <div>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingRequests.map((req) => (
                    <div
                      key={req._id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={req.requester.avatar}
                          name={req.requester.name}
                          size="md"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {req.requester.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            @{req.requester.username}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAcceptRequest(req._id)}
                          loading={actionLoading[req._id]}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRejectRequest(req._id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Find People */}
          {activeTab === 'find' && (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, username, or public ID..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button type="submit" variant="primary" size="sm">
                  Search
                </Button>
              </form>

              <div className="space-y-2">
                {searchResults.map((searchUser) => (
                  <div
                    key={searchUser._id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={searchUser.avatar}
                        name={searchUser.name}
                        size="md"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {searchUser.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          @{searchUser.username}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant={searchUser.connectionStatus === 'pending' ? 'secondary' : 'primary'}
                      size="sm"
                      icon={UserPlus}
                      disabled={searchUser.connectionStatus === 'pending'}
                      onClick={() => handleSendRequest(searchUser._id)}
                      loading={actionLoading[searchUser._id]}
                    >
                      {searchUser.connectionStatus === 'pending' ? 'Pending' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
