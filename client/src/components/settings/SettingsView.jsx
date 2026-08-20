import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { QRCodeModal } from '../profile/QRCodeModal';
import {
  User,
  Shield,
  LogOut,
  Camera,
  Copy,
  Check,
  UserX,
  UserCheck,
  QrCode,
  Sparkles,
} from 'lucide-react';

const STATUS_PRESETS = [
  { id: 'available', label: 'Available', emoji: '🟢' },
  { id: 'busy', label: 'Busy', emoji: '⛔' },
  { id: 'studying', label: 'Studying', emoji: '📚' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'custom', label: 'Custom Status', emoji: '✨' },
];

export const SettingsView = () => {
  const { user, updateUserProfile, refreshUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'privacy' | 'blocked'
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [customStatus, setCustomStatus] = useState(user?.customStatus || '');
  const [statusEmoji, setStatusEmoji] = useState(user?.statusEmoji || '🟢');
  const [statusPreset, setStatusPreset] = useState(user?.statusPreset || 'available');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Privacy state
  const [privacy, setPrivacy] = useState(
    user?.privacy || {
      onlineStatus: 'everyone',
      readReceipts: true,
      profilePicture: 'everyone',
      whoCanMessage: 'everyone',
      storyVisibility: 'everyone',
      whoCanConnect: 'everyone',
      lastSeen: 'everyone',
    }
  );
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState('');

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setCustomStatus(user.customStatus || '');
      setStatusEmoji(user.statusEmoji || '🟢');
      setStatusPreset(user.statusPreset || 'available');
      if (user.privacy) setPrivacy(user.privacy);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'blocked') {
      fetchBlockedUsers();
    }
  }, [activeTab]);

  const fetchBlockedUsers = async () => {
    try {
      setLoadingBlocked(true);
      const res = await api.get('/safety/blocked');
      if (res.data.success) {
        setBlockedUsers(res.data.blockedUsers);
      }
    } catch (err) {
      console.error('Failed to fetch blocked users:', err);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblock = async (blockedUserId) => {
    try {
      await api.post('/safety/unblock', { userId: blockedUserId });
      setBlockedUsers((prev) => prev.filter((u) => u._id !== blockedUserId));
    } catch (err) {
      console.error('Failed to unblock user:', err);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        updateUserProfile(res.data.user);
        setProfileSuccess('Avatar updated successfully!');
        setTimeout(() => setProfileSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setProfileError(err.response?.data?.message || 'Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      const res = await api.put('/users/profile', {
        name,
        username,
        bio,
        customStatus,
        statusEmoji,
        statusPreset,
      });

      if (res.data.success) {
        updateUserProfile(res.data.user);
        setProfileSuccess('Profile updated successfully!');
        setTimeout(() => setProfileSuccess(''), 3000);
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSavePrivacy = async (e) => {
    e.preventDefault();
    setPrivacyLoading(true);
    setPrivacySuccess('');

    try {
      const res = await api.put('/users/privacy', privacy);
      if (res.data.success) {
        setPrivacySuccess('Privacy settings saved.');
        setTimeout(() => setPrivacySuccess(''), 3000);
        refreshUser();
      }
    } catch (err) {
      console.error('Failed to save privacy settings:', err);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handlePresetSelect = (preset) => {
    setStatusPreset(preset.id);
    setStatusEmoji(preset.emoji);
    if (preset.id !== 'custom') {
      setCustomStatus(preset.label);
    }
  };

  const handleCopyPublicId = () => {
    navigator.clipboard.writeText(user?.publicId || '');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold tracking-tight gradient-text-primary">
            Settings
          </h1>
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
        </div>
        <button
          onClick={() => setShowQRModal(true)}
          className="p-2.5 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 hover:from-indigo-500/25 hover:to-purple-500/25 border border-indigo-500/30 text-indigo-500 dark:text-indigo-300 transition-all flex items-center gap-1.5 text-xs font-bold ios-btn-interactive shadow-sm"
          title="Open QR Profile"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">My QR</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex px-4 pt-3 gap-2 border-b border-slate-100 dark:border-white/5 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ios-btn-interactive ${
            activeTab === 'profile'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Profile & Status
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`py-2 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ios-btn-interactive ${
            activeTab === 'privacy'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Privacy & Stories
        </button>

        <button
          onClick={() => setActiveTab('blocked')}
          className={`py-2 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ios-btn-interactive ${
            activeTab === 'blocked'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <UserX className="w-3.5 h-3.5" />
          Blocked ({blockedUsers.length})
        </button>
      </div>

      {/* Main Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Tab 1: Profile & Status */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Avatar Row */}
            <div className="flex items-center gap-4 p-4 rounded-3xl ios-glass-card">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar src={user?.avatar} name={user?.name} size="lg" className="shadow-lg ring-4 ring-indigo-500/20" />
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {user?.name}
                </h3>
                <p className="text-xs text-slate-500">@{user?.username}</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="text-xs font-bold text-indigo-500 hover:underline mt-1 block"
                >
                  {uploadingAvatar ? 'Uploading...' : 'Change avatar photo'}
                </button>
              </div>
            </div>

            {/* Public ID Pill */}
            <div className="flex items-center justify-between p-4 rounded-3xl ios-glass-card">
              <div>
                <span className="text-xs font-bold text-slate-500 block">Your Public ID</span>
                <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                  {user?.publicId}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                icon={copiedId ? Check : Copy}
                onClick={handleCopyPublicId}
              >
                {copiedId ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {/* Custom Status Presets */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Custom Status
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ios-btn-interactive ${
                      statusPreset === preset.id
                        ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-indigo-500/50 text-indigo-500 dark:text-indigo-300 shadow-sm'
                        : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10'
                    }`}
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={statusEmoji}
                  onChange={(e) => setStatusEmoji(e.target.value)}
                  className="w-12 text-center text-base px-2 py-2 rounded-2xl border border-slate-200 dark:border-white/10 ios-glass focus:outline-none"
                  title="Status Emoji"
                />
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => {
                    setCustomStatus(e.target.value);
                    setStatusPreset('custom');
                  }}
                  placeholder="Set custom status message..."
                  maxLength={100}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 ios-glass text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Bio Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                About / Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a few words about yourself..."
                maxLength={250}
                rows={3}
                className="w-full px-4 py-3 rounded-3xl border border-slate-200 dark:border-white/10 ios-glass text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
              <span className="text-[10px] text-slate-400 text-right block">
                {bio.length}/250 characters
              </span>
            </div>

            {/* Name & Username Inputs */}
            <div className="space-y-3">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
              />
            </div>

            {profileSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 text-xs font-bold border border-rose-500/20">
                {profileError}
              </div>
            )}

            <Button type="submit" variant="primary" loading={profileLoading} className="w-full">
              Save Profile Changes
            </Button>
          </form>
        )}

        {/* Tab 2: Privacy Controls */}
        {activeTab === 'privacy' && (
          <form onSubmit={handleSavePrivacy} className="space-y-4">
            {/* Story Visibility */}
            <div className="p-4 rounded-3xl ios-glass-card space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Story Privacy Default
              </label>
              <select
                value={privacy.storyVisibility || 'everyone'}
                onChange={(e) => setPrivacy({ ...privacy, storyVisibility: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 ios-glass text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="everyone">Everyone can see my stories</option>
                <option value="closeFriends">Close Friends only</option>
                <option value="nobody">Nobody (Private)</option>
              </select>
            </div>

            {/* Connection Requests */}
            <div className="p-4 rounded-3xl ios-glass-card space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Who can send you Connection Requests
              </label>
              <select
                value={privacy.whoCanConnect || 'everyone'}
                onChange={(e) => setPrivacy({ ...privacy, whoCanConnect: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 ios-glass text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="everyone">Everyone</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* Online Status */}
            <div className="p-4 rounded-3xl ios-glass-card space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Online Status Visibility
              </label>
              <select
                value={privacy.onlineStatus}
                onChange={(e) => setPrivacy({ ...privacy, onlineStatus: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 ios-glass text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="everyone">Visible to everyone</option>
                <option value="nobody">Hidden (Nobody)</option>
              </select>
            </div>

            {/* Read Receipts */}
            <div className="p-4 rounded-3xl ios-glass-card flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  Read Receipts (Blue Ticks)
                </span>
                <span className="text-[11px] text-slate-500">
                  Send & receive seen checkmarks
                </span>
              </div>
              <input
                type="checkbox"
                checked={privacy.readReceipts}
                onChange={(e) => setPrivacy({ ...privacy, readReceipts: e.target.checked })}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </div>

            {privacySuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                {privacySuccess}
              </div>
            )}

            <Button type="submit" variant="primary" loading={privacyLoading} className="w-full">
              Save Privacy Settings
            </Button>
          </form>
        )}

        {/* Tab 3: Blocked Users */}
        {activeTab === 'blocked' && (
          <div className="space-y-3">
            {blockedUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-40 text-indigo-400" />
                <p className="text-sm font-bold">No blocked users</p>
              </div>
            ) : (
              blockedUsers.map((b) => (
                <div
                  key={b._id}
                  className="p-4 rounded-3xl ios-glass-card flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={b.blocked?.avatar} name={b.blocked?.name} size="md" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {b.blocked?.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        @{b.blocked?.username}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(b.blocked?._id)}
                  >
                    Unblock
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Logout Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-4">
          <Button
            variant="dangerOutline"
            className="w-full"
            icon={LogOut}
            onClick={logout}
          >
            Log Out
          </Button>

          {/* App Branding & Developer Credit */}
          <div className="flex flex-col items-center justify-center text-center pt-2 pb-1 select-none">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Connectly v2.0</span>
              <span>•</span>
              <span className="gradient-text-primary font-bold">Build by Sahil Thorat</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
              Designed with precision & privacy
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Profile Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />
    </div>
  );
};
