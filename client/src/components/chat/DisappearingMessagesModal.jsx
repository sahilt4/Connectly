import React, { useState } from 'react';
import api from '../../api/axios';
import { X, Clock, Check } from 'lucide-react';
import { Button } from '../common/Button';

const OPTIONS = [
  { id: 'off', label: 'Off', desc: 'Messages will not disappear automatically' },
  { id: 'after_view', label: 'After Viewing', desc: 'Disappear shortly after recipient views the message' },
  { id: '1h', label: '1 Hour', desc: 'Disappear 1 hour after sending' },
  { id: '24h', label: '24 Hours', desc: 'Disappear 24 hours after sending' },
  { id: '7d', label: '7 Days', desc: 'Disappear 7 days after sending' },
];

export const DisappearingMessagesModal = ({
  isOpen,
  onClose,
  conversationId,
  currentSetting = 'off',
  onUpdated,
}) => {
  const [selectedDuration, setSelectedDuration] = useState(currentSetting);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await api.put(`/chats/${conversationId}/disappearing`, {
        duration: selectedDuration,
      });
      if (res.data.success) {
        if (onUpdated) onUpdated(res.data.disappearingSettings);
        onClose();
      }
    } catch (err) {
      console.error('Failed to update disappearing settings:', err);
      alert('Failed to update disappearing message setting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Disappearing Messages
              </h2>
              <p className="text-[11px] text-slate-500">Set automatic message expiration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-6 space-y-2.5">
          {OPTIONS.map((opt) => (
            <div
              key={opt.id}
              onClick={() => setSelectedDuration(opt.id)}
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                selectedDuration === opt.id
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {opt.label}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {opt.desc}
                </div>
              </div>
              {selectedDuration === opt.id && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={loading}>
            Apply Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
