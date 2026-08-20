import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
  X,
  Image as ImageIcon,
  Mic,
  FileText,
  Link2,
  Download,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { formatFileSize, formatMessageTime } from '../../utils/date';

export const SharedMediaDrawer = ({ isOpen, onClose, conversationId, onOpenLightbox }) => {
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'audio' | 'files' | 'links'
  const [data, setData] = useState({
    photosAndVideos: [],
    audio: [],
    files: [],
    links: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchSharedMedia();
    }
  }, [isOpen, conversationId]);

  const fetchSharedMedia = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/messages/conversation/${conversationId}/media`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch shared media:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 right-0 z-40 w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-slide-left">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Shared Media & Files
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-3 gap-1 border-b border-slate-100 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            activeTab === 'media'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Photos ({data.photosAndVideos.length})
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            activeTab === 'audio'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Voice ({data.audio.length})
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            activeTab === 'files'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Files ({data.files.length})
        </button>

        <button
          onClick={() => setActiveTab('links')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            activeTab === 'links'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          Links ({data.links.length})
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Photos & Videos Grid */}
            {activeTab === 'media' && (
              <div>
                {data.photosAndVideos.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No photos or videos shared yet
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {data.photosAndVideos.map((msg) => (
                      <div
                        key={msg._id}
                        onClick={() => onOpenLightbox(msg.media)}
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50"
                      >
                        {msg.type === 'video' ? (
                          <video
                            src={msg.media?.url}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={msg.media?.url}
                            alt="shared"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Voice Messages List */}
            {activeTab === 'audio' && (
              <div className="space-y-2">
                {data.audio.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No voice messages shared yet
                  </p>
                ) : (
                  data.audio.map((msg) => (
                    <div
                      key={msg._id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                          <Mic className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Voice Message
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatMessageTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                      <audio controls src={msg.media?.url} className="h-8 max-w-[140px]" />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Files & Documents List */}
            {activeTab === 'files' && (
              <div className="space-y-2">
                {data.files.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No files shared yet
                  </p>
                ) : (
                  data.files.map((msg) => (
                    <div
                      key={msg._id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {msg.media?.fileName || 'Document'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatFileSize(msg.media?.fileSize)}
                          </p>
                        </div>
                      </div>
                      <a
                        href={msg.media?.url}
                        download={msg.media?.fileName}
                        className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Links List */}
            {activeTab === 'links' && (
              <div className="space-y-2">
                {data.links.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No links shared yet
                  </p>
                ) : (
                  data.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between hover:border-emerald-500/40 transition-colors block"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600">
                          <Link2 className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
                          {link.url}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </a>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
