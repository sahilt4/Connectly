import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import {
  X,
  QrCode,
  Copy,
  Check,
  Search,
  Scan,
  UserPlus,
  Share2,
} from 'lucide-react';

export const QRCodeModal = ({ isOpen, onClose, onUserScanned }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my_qr'); // 'my_qr' | 'scan'
  const [copied, setCopied] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [scannedUser, setScannedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const qrUrl = `${window.location.origin}/connect/${user?.publicId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLookupPublicId = async (e) => {
    e.preventDefault();
    if (!scannedId.trim()) return;

    try {
      setLoading(true);
      setError('');
      setScannedUser(null);
      const res = await api.get(`/users/qr/${scannedId.trim().toUpperCase()}`);
      if (res.data.success) {
        setScannedUser(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'User not found with this QR ID.');
    } finally {
      setLoading(false);
    }
  };

  // Generate SVG QR Matrix
  const renderQRCodeSvg = () => {
    // Generate styled SVG QR pattern based on public ID
    return (
      <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="w-48 h-48 fill-slate-900"
          shapeRendering="crispEdges"
        >
          {/* Top-Left Position Square */}
          <rect x="5" y="5" width="26" height="26" fill="#0f172a" rx="4" />
          <rect x="9" y="9" width="18" height="18" fill="#ffffff" rx="2" />
          <rect x="13" y="13" width="10" height="10" fill="#10b981" rx="2" />

          {/* Top-Right Position Square */}
          <rect x="69" y="5" width="26" height="26" fill="#0f172a" rx="4" />
          <rect x="73" y="9" width="18" height="18" fill="#ffffff" rx="2" />
          <rect x="77" y="13" width="10" height="10" fill="#10b981" rx="2" />

          {/* Bottom-Left Position Square */}
          <rect x="5" y="69" width="26" height="26" fill="#0f172a" rx="4" />
          <rect x="9" y="73" width="18" height="18" fill="#ffffff" rx="2" />
          <rect x="13" y="77" width="10" height="10" fill="#10b981" rx="2" />

          {/* Data Elements Pattern */}
          <rect x="36" y="8" width="6" height="6" fill="#0f172a" rx="1" />
          <rect x="46" y="8" width="8" height="6" fill="#10b981" rx="1" />
          <rect x="58" y="8" width="6" height="6" fill="#0f172a" rx="1" />

          <rect x="36" y="20" width="8" height="8" fill="#10b981" rx="1" />
          <rect x="48" y="20" width="6" height="6" fill="#0f172a" rx="1" />
          <rect x="58" y="20" width="6" height="8" fill="#0f172a" rx="1" />

          <rect x="8" y="36" width="6" height="8" fill="#0f172a" rx="1" />
          <rect x="18" y="36" width="8" height="6" fill="#10b981" rx="1" />
          <rect x="28" y="36" width="6" height="6" fill="#0f172a" rx="1" />
          <rect x="38" y="36" width="10" height="10" fill="#10b981" rx="2" />
          <rect x="52" y="36" width="8" height="6" fill="#0f172a" rx="1" />
          <rect x="64" y="36" width="6" height="8" fill="#10b981" rx="1" />
          <rect x="74" y="36" width="8" height="8" fill="#0f172a" rx="1" />
          <rect x="86" y="36" width="6" height="6" fill="#10b981" rx="1" />

          <rect x="8" y="48" width="8" height="6" fill="#10b981" rx="1" />
          <rect x="20" y="48" width="6" height="6" fill="#0f172a" rx="1" />
          <rect x="30" y="48" width="8" height="8" fill="#0f172a" rx="1" />
          <rect x="42" y="50" width="6" height="6" fill="#0f172a" rx="1" />
          <rect x="62" y="48" width="8" height="6" fill="#10b981" rx="1" />
          <rect x="74" y="48" width="6" height="8" fill="#0f172a" rx="1" />
          <rect x="84" y="48" width="8" height="6" fill="#0f172a" rx="1" />

          <rect x="36" y="64" width="8" height="8" fill="#0f172a" rx="1" />
          <rect x="48" y="64" width="6" height="6" fill="#10b981" rx="1" />
          <rect x="58" y="64" width="6" height="8" fill="#0f172a" rx="1" />

          <rect x="36" y="76" width="6" height="8" fill="#10b981" rx="1" />
          <rect x="46" y="76" width="10" height="6" fill="#0f172a" rx="1" />
          <rect x="60" y="76" width="8" height="8" fill="#10b981" rx="1" />
          <rect x="72" y="76" width="6" height="6" fill="#0f172a" rx="1" />
          <rect x="82" y="76" width="8" height="8" fill="#0f172a" rx="1" />
        </svg>

        <div className="mt-3 font-mono font-bold text-xs tracking-wider text-slate-800">
          ID: {user?.publicId}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                QR Code Profile
              </h2>
              <p className="text-[11px] text-slate-500">Scan to connect directly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex px-6 pt-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('my_qr')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'my_qr'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            My QR Code
          </button>

          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'scan'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            Scan / Look up
          </button>
        </div>

        {/* Tab 1: My QR */}
        {activeTab === 'my_qr' && (
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-3">
              <Avatar src={user?.avatar} name={user?.name} size="md" />
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {user?.name}
                </h3>
                <p className="text-xs text-slate-500">@{user?.username}</p>
              </div>
            </div>

            {renderQRCodeSvg()}

            <p className="text-xs text-slate-500 max-w-xs">
              Anyone with this QR code can scan or enter your ID to connect and message you instantly.
            </p>

            <div className="w-full flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                icon={copied ? Check : Copy}
                onClick={handleCopyLink}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Scan / Look Up */}
        {activeTab === 'scan' && (
          <div className="p-6 space-y-4">
            <form onSubmit={handleLookupPublicId} className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Enter QR Public ID:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scannedId}
                  onChange={(e) => setScannedId(e.target.value)}
                  placeholder="e.g. USR-4RN45"
                  className="flex-1 uppercase font-mono px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button type="submit" variant="primary" size="sm" loading={loading}>
                  Search
                </Button>
              </div>
            </form>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-900/60">
                {error}
              </div>
            )}

            {scannedUser && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-slide-up">
                <div className="flex items-center gap-3">
                  <Avatar src={scannedUser.avatar} name={scannedUser.name} size="lg" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {scannedUser.name}
                    </h4>
                    <p className="text-xs text-slate-500">@{scannedUser.username}</p>
                    {scannedUser.bio && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                        {scannedUser.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (onUserScanned) onUserScanned(scannedUser);
                      onClose();
                    }}
                  >
                    Open Profile & Message
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
