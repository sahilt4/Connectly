import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Avatar } from '../common/Avatar';
import {
  X,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const CallHistoryModal = ({ isOpen, onClose, onStartCall }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCallHistory();
    }
  }, [isOpen]);

  const fetchCallHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/calls/history');
      if (res.data.success) {
        setCalls(res.data.calls);
      }
    } catch (err) {
      console.error('Failed to fetch call history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDuration = (secs) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Call History
              </h2>
              <p className="text-[11px] text-slate-500">Recent audio calls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {calls.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No recent calls</p>
            </div>
          ) : (
            calls.map((call) => {
              const isMissed = call.status === 'missed' || call.status === 'declined';
              return (
                <div
                  key={call._id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={call.peer?.avatar}
                      name={call.peer?.name || 'User'}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {call.peer?.name || 'User'}
                        </span>
                        {isMissed ? (
                          <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5">
                            <PhoneMissed className="w-3 h-3" /> Missed
                          </span>
                        ) : call.isCaller ? (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <PhoneOutgoing className="w-3 h-3 text-emerald-500" /> Outgoing (
                            {formatDuration(call.duration)})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <PhoneIncoming className="w-3 h-3 text-emerald-500" /> Incoming (
                            {formatDuration(call.duration)})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(call.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onStartCall(call.peer);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                    title="Call back"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
