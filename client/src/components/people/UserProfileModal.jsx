import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import {
  MessageSquare,
  UserX,
  UserCheck,
  UserPlus,
  Phone,
  QrCode,
  Star,
  Flag,
  Copy,
  Check,
} from 'lucide-react';

export const UserProfileModal = ({
  isOpen,
  user,
  onClose,
  onOpenReport,
  onStartChat,
  onStartCall,
  onOpenQR,
}) => {
  const { openChatWithUser, fetchConversations } = useChat();
  const { isUserOnline } = useSocket();

  const [copiedId, setCopiedId] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(user?.isBlocked || false);
  const [connectionStatus, setConnectionStatus] = useState(user?.connectionStatus || 'none');
  const [isCloseFriend, setIsCloseFriend] = useState(user?.isCloseFriend || false);
  const [connecting, setConnecting] = useState(false);
  const [profileData, setProfileData] = useState(user);

  useEffect(() => {
    if (user && isOpen) {
      fetchFullProfile(user._id);
    }
  }, [user, isOpen]);

  const fetchFullProfile = async (userId) => {
    try {
      const res = await api.get(`/users/${userId}`);
      if (res.data.success) {
        setProfileData(res.data.user);
        setIsBlocked(res.data.user.isBlocked);
        setConnectionStatus(res.data.user.connectionStatus);
        setIsCloseFriend(res.data.user.isCloseFriend);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  const online = isUserOnline(user._id);
  const displayUser = profileData || user;

  const handleCopyId = () => {
    navigator.clipboard.writeText(displayUser.publicId || '');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const handleStartMessaging = async () => {
    try {
      await openChatWithUser(displayUser);
      onClose();
      if (onStartChat) onStartChat();
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      await api.post(`/connections/request/${displayUser._id}`);
      setConnectionStatus('pending');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send connection request');
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleCloseFriend = async () => {
    try {
      const res = await api.post(`/users/close-friends/${displayUser._id}`);
      if (res.data.success) {
        setIsCloseFriend(res.data.isCloseFriend);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlock = async () => {
    try {
      setIsBlocking(true);
      if (isBlocked) {
        await api.post('/safety/unblock', { userId: displayUser._id });
        setIsBlocked(false);
      } else {
        await api.post('/safety/block', { userId: displayUser._id });
        setIsBlocked(true);
      }
      fetchConversations();
    } catch (err) {
      console.error('Block toggle failed:', err);
      alert(err.response?.data?.message || 'Failed to update block state.');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Profile" maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center space-y-3.5 pt-1">
        {/* Avatar with live status */}
        <Avatar
          src={displayUser.avatar}
          name={displayUser.name}
          size="xl"
          showStatus={true}
          isOnline={online}
        />

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {displayUser.name}
          </h2>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            @{displayUser.username}
          </p>

          {/* Status Badge */}
          {displayUser.customStatus && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
              <span>{displayUser.statusEmoji || '🟢'}</span>
              <span>{displayUser.customStatus}</span>
            </div>
          )}

          {/* Public ID */}
          {displayUser.publicId && (
            <div className="pt-1">
              <button
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Click to copy public ID"
              >
                <span>{displayUser.publicId}</span>
                {copiedId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-60" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Bio */}
        {displayUser.bio && (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed text-left w-full">
            <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">Bio</span>
            {displayUser.bio}
          </div>
        )}

        {/* Primary Action Buttons: Message, Audio Call, Connect */}
        <div className="w-full space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={MessageSquare}
              onClick={handleStartMessaging}
            >
              Message
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Phone}
              onClick={() => {
                onClose();
                if (onStartCall) onStartCall(displayUser);
              }}
            >
              Audio Call
            </Button>
          </div>

          <div className="flex gap-2">
            {connectionStatus === 'accepted' ? (
              <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-500/20">
                <UserCheck className="w-4 h-4" />
                Connected
              </div>
            ) : connectionStatus === 'pending' ? (
              <div className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5">
                Pending Request
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                icon={UserPlus}
                onClick={handleConnect}
                loading={connecting}
              >
                Connect
              </Button>
            )}

            <Button
              variant={isCloseFriend ? 'primary' : 'secondary'}
              size="sm"
              icon={Star}
              onClick={handleToggleCloseFriend}
              title="Toggle Close Friend for Stories"
            >
              {isCloseFriend ? 'Close Friend' : 'Add Close Friend'}
            </Button>
          </div>

          {/* Secondary Options: Block & Report */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant={isBlocked ? 'outline' : 'dangerOutline'}
              size="sm"
              className="flex-1"
              disabled={isBlocking}
              loading={isBlocking}
              icon={isBlocked ? UserCheck : UserX}
              onClick={handleToggleBlock}
            >
              {isBlocked ? 'Unblock' : 'Block'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              icon={Flag}
              onClick={() => {
                onClose();
                if (onOpenReport) onOpenReport(displayUser);
              }}
            >
              Report
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
