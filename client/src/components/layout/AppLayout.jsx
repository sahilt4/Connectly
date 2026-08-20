import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import { ChatList } from '../chat/ChatList';
import { ChatRoom } from '../chat/ChatRoom';
import { UserSearch } from '../people/UserSearch';
import { UserProfileModal } from '../people/UserProfileModal';
import { SettingsView } from '../settings/SettingsView';
import { ReportModal } from '../settings/ReportModal';
import { StoryCreatorModal } from '../stories/StoryCreatorModal';
import { StoryViewerModal } from '../stories/StoryViewerModal';
import { ConnectionsModal } from '../connections/ConnectionsModal';
import { AudioCallOverlay } from '../calls/AudioCallOverlay';
import { CallHistoryModal } from '../calls/CallHistoryModal';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { QRCodeModal } from '../profile/QRCodeModal';
import { Avatar } from '../common/Avatar';
import {
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Phone,
  QrCode,
} from 'lucide-react';

export const AppLayout = () => {
  const { user } = useAuth();
  const { activeConversation, setActiveConversation, conversations } = useChat();
  const { isDark, toggleTheme } = useTheme();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'people' | 'settings'
  const [selectedUserForProfile, setSelectedUserForProfile] = useState(null);
  const [selectedUserForReport, setSelectedUserForReport] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Modals & Overlays state
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Total unread messages across all conversations
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  useEffect(() => {
    fetchUnreadNotificationsCount();
  }, []);

  const fetchUnreadNotificationsCount = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setUnreadNotifCount(res.data.unreadCount || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectChat = (conv) => {
    setActiveConversation(conv);
    setMobileShowChat(true);
  };

  const handleStartCallWithUser = (recipient) => {
    setActiveCall({ recipientId: recipient._id, recipient });
  };

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 relative antialiased selection:bg-emerald-500 selection:text-white">
      {/* Background Ambient iOS Lighting Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] rounded-full bg-teal-500/10 dark:bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* 1. DESKTOP iOS GLASS NAVIGATION RAIL (Narrow left dock) */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 py-6 ios-glass z-30 select-none m-3 rounded-[32px] border shadow-2xl">
        {/* Brand Logo with Glow */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition-opacity" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 ios-btn-interactive">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.35 5L2 22l5.15-1.33A9.955 9.955 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.61 0-3.1-.47-4.36-1.28l-.31-.2-3.23.84.86-3.15-.2-.33A7.95 7.95 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </div>
          </div>

          {/* Navigation Links with Glass Pills */}
          <nav className="flex flex-col items-center gap-2">
            {/* Chats Tab */}
            <button
              onClick={() => setActiveTab('chats')}
              className={`relative p-3.5 rounded-2xl transition-all duration-200 ios-btn-interactive ${
                activeTab === 'chats'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/35 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Chats"
            >
              <MessageSquare className="w-5 h-5" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-md animate-spring-popup">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </button>

            {/* People Tab */}
            <button
              onClick={() => setActiveTab('people')}
              className={`p-3.5 rounded-2xl transition-all duration-200 ios-btn-interactive ${
                activeTab === 'people'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/35 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Find People"
            >
              <Users className="w-5 h-5" />
            </button>

            {/* Call History */}
            <button
              onClick={() => setShowCallHistory(true)}
              className="p-3.5 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all ios-btn-interactive"
              title="Call History"
            >
              <Phone className="w-5 h-5" />
            </button>

            {/* QR Profile */}
            <button
              onClick={() => setShowQRModal(true)}
              className="p-3.5 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all ios-btn-interactive"
              title="My QR Code"
            >
              <QrCode className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-3.5 rounded-2xl transition-all duration-200 ios-btn-interactive ${
                showNotifications
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/35 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute 1.5 top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* Settings Tab */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-3.5 rounded-2xl transition-all duration-200 ios-btn-interactive ${
                activeTab === 'settings'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/35 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </nav>
        </div>

        {/* Bottom Dock Controls */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-3 text-slate-500 dark:text-slate-400 hover:text-amber-500 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors ios-btn-interactive"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          <div
            onClick={() => setActiveTab('settings')}
            className="cursor-pointer hover:ring-4 hover:ring-emerald-500/30 rounded-full transition-all ios-btn-interactive"
            title="My Profile"
          >
            <Avatar src={user?.avatar} name={user?.name} size="sm" />
          </div>
        </div>
      </aside>

      {/* 2. MAIN APP CONTENT CONTAINER WITH GLASS CARDS */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden p-0 md:p-3 md:pl-0 gap-3">
        {/* Left Side View Panel */}
        <div
          className={`h-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col ios-glass md:rounded-[32px] overflow-hidden ${
            mobileShowChat ? 'hidden md:flex' : 'flex w-full'
          }`}
        >
          {activeTab === 'chats' && (
            <ChatList
              onSelectChat={handleSelectChat}
              onNavigateToPeople={() => setActiveTab('people')}
              onOpenStoryCreator={() => setShowStoryCreator(true)}
              onOpenStoryViewer={(group) => setActiveStoryGroup(group)}
            />
          )}
          {activeTab === 'people' && (
            <UserSearch
              onOpenProfile={(u) => setSelectedUserForProfile(u)}
              onOpenConnections={() => setShowConnectionsModal(true)}
              onStartChat={() => {
                setActiveTab('chats');
                setMobileShowChat(true);
              }}
            />
          )}
          {activeTab === 'settings' && <SettingsView />}
        </div>

        {/* Right Chat Room View Panel */}
        <div
          className={`flex-1 h-full ios-glass md:rounded-[32px] overflow-hidden ${
            !mobileShowChat ? 'hidden md:flex' : 'flex w-full'
          }`}
        >
          <ChatRoom
            onBack={() => setMobileShowChat(false)}
            onOpenProfile={(u) => setSelectedUserForProfile(u)}
            onOpenReport={(u) => setSelectedUserForReport(u)}
            onStartCall={handleStartCallWithUser}
          />
        </div>
      </div>

      {/* 3. MOBILE FLOATING iOS GLASS DOCK (Visible on mobile when not inside active chat) */}
      {!mobileShowChat && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
          <nav className="h-16 ios-glass rounded-[28px] shadow-2xl flex items-center justify-around px-2 border border-white/20 dark:border-white/10">
            <button
              onClick={() => setActiveTab('chats')}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all ios-btn-interactive ${
                activeTab === 'chats'
                  ? 'text-emerald-500 font-bold scale-105'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px]">Chats</span>
              {totalUnread > 0 && (
                <span className="absolute -top-0.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {totalUnread}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('people')}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all ios-btn-interactive ${
                activeTab === 'people'
                  ? 'text-emerald-500 font-bold scale-105'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px]">People</span>
            </button>

            <button
              onClick={() => setShowQRModal(true)}
              className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-emerald-500 ios-btn-interactive"
            >
              <QrCode className="w-5 h-5" />
              <span className="text-[10px]">QR Code</span>
            </button>

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all ios-btn-interactive ${
                showNotifications
                  ? 'text-emerald-500 font-bold scale-105'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="text-[10px]">Alerts</span>
              {unreadNotifCount > 0 && (
                <span className="absolute 1 top-1 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all ios-btn-interactive ${
                activeTab === 'settings'
                  ? 'text-emerald-500 font-bold scale-105'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span className="text-[10px]">Settings</span>
            </button>
          </nav>
        </div>
      )}

      {/* Notification Dropdown */}
      <NotificationDropdown
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onOpenUser={(u) => setSelectedUserForProfile(u)}
      />

      {/* Story Creator Modal */}
      <StoryCreatorModal
        isOpen={showStoryCreator}
        onClose={() => setShowStoryCreator(false)}
        onCreated={() => {
          // story created
        }}
      />

      {/* Story Viewer Modal */}
      <StoryViewerModal
        isOpen={!!activeStoryGroup}
        storyGroup={activeStoryGroup}
        onClose={() => setActiveStoryGroup(null)}
      />

      {/* Connections Modal */}
      <ConnectionsModal
        isOpen={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
        onOpenProfile={(u) => setSelectedUserForProfile(u)}
        onStartChat={(u) => {
          setActiveTab('chats');
          setMobileShowChat(true);
        }}
      />

      {/* Audio Call WebRTC Overlay */}
      <AudioCallOverlay
        currentCall={activeCall}
        onEndCall={() => setActiveCall(null)}
      />

      {/* Call History Modal */}
      <CallHistoryModal
        isOpen={showCallHistory}
        onClose={() => setShowCallHistory(false)}
        onStartCall={handleStartCallWithUser}
      />

      {/* QR Code Profile Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onUserScanned={(u) => {
          setSelectedUserForProfile(u);
        }}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={!!selectedUserForProfile}
        user={selectedUserForProfile}
        onClose={() => setSelectedUserForProfile(null)}
        onOpenReport={(u) => setSelectedUserForReport(u)}
        onStartCall={handleStartCallWithUser}
        onOpenQR={() => setShowQRModal(true)}
        onStartChat={() => {
          setActiveTab('chats');
          setMobileShowChat(true);
        }}
      />

      {/* Safety Report Modal */}
      <ReportModal
        isOpen={!!selectedUserForReport}
        userToReport={selectedUserForReport}
        onClose={() => setSelectedUserForReport(null)}
      />
    </div>
  );
};
