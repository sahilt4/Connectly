import React, { useState, useRef } from 'react';
import api from '../../api/axios';
import { Button } from '../common/Button';
import {
  X,
  Image as ImageIcon,
  Type,
  Smile,
  Send,
  Lock,
  Globe,
  Sparkles,
} from 'lucide-react';

const GRADIENTS = [
  { id: 'emerald', class: 'from-emerald-600 to-teal-800', label: 'Emerald' },
  { id: 'indigo', class: 'from-indigo-600 to-purple-800', label: 'Indigo' },
  { id: 'rose', class: 'from-rose-500 to-amber-700', label: 'Sunset' },
  { id: 'slate', class: 'from-slate-800 to-slate-950', label: 'Midnight' },
  { id: 'ocean', class: 'from-cyan-600 to-blue-800', label: 'Ocean' },
];

const STICKERS = ['🔥', '✨', '🎉', '❤️', '🙌', '💯', '☕', '💡', '🎵', '⭐'];

export const StoryCreatorModal = ({ isOpen, onClose, onCreated }) => {
  const [mode, setMode] = useState('media'); // 'media' | 'text'
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].class);
  const [caption, setCaption] = useState('');
  const [selectedSticker, setSelectedSticker] = useState('');
  const [privacy, setPrivacy] = useState('everyone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError('File size must be under 20MB.');
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setError('');
  };

  const handlePublish = async () => {
    setError('');

    if (mode === 'media' && !mediaFile) {
      setError('Please select an image or video to share.');
      return;
    }

    if (mode === 'text' && !textContent.trim()) {
      setError('Please type some text for your story.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();

      if (mode === 'media') {
        formData.append('media', mediaFile);
        formData.append('mediaType', mediaFile.type.startsWith('video') ? 'video' : 'image');
      } else {
        formData.append('mediaType', 'text');
        formData.append('textContent', textContent.trim());
        formData.append('textBackground', selectedGradient);
      }

      if (caption.trim()) formData.append('caption', caption.trim());
      formData.append('privacy', privacy);

      if (selectedSticker) {
        formData.append(
          'stickers',
          JSON.stringify([{ emoji: selectedSticker, x: 50, y: 50, scale: 1.5 }])
        );
      }

      const res = await api.post('/stories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        onCreated(res.data.story);
        handleClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to share story.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setTextContent('');
    setCaption('');
    setSelectedSticker('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Create 24h Story
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Type Selector Tabs */}
        <div className="flex px-6 pt-3 gap-2">
          <button
            onClick={() => setMode('media')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'media'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Photo / Video
          </button>

          <button
            onClick={() => setMode('text')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'text'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
            }`}
          >
            <Type className="w-4 h-4" />
            Text Story
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {mode === 'media' ? (
            <div className="space-y-3">
              {mediaPreview ? (
                <div className="relative aspect-[9/14] max-h-72 w-full mx-auto rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-700">
                  {mediaFile?.type.startsWith('video') ? (
                    <video
                      src={mediaPreview}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Story preview"
                      className="w-full h-full object-contain"
                    />
                  )}
                  <button
                    onClick={() => {
                      setMediaFile(null);
                      setMediaPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[9/14] max-h-64 w-full mx-auto border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors bg-slate-50 dark:bg-slate-950/50"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Upload photo or video
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      JPG, PNG, GIF, MP4 up to 20MB
                    </p>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                maxLength={300}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Text Canvas Preview */}
              <div
                className={`relative aspect-[9/14] max-h-72 w-full mx-auto rounded-2xl bg-gradient-to-br ${selectedGradient} flex flex-col items-center justify-center p-6 text-white text-center shadow-inner`}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type your story here..."
                  maxLength={500}
                  className="w-full bg-transparent text-white font-bold text-center text-lg placeholder-white/60 resize-none focus:outline-none focus:ring-0 leading-relaxed"
                  rows={4}
                />

                {selectedSticker && (
                  <div className="text-3xl mt-2 animate-bounce">
                    {selectedSticker}
                  </div>
                )}
              </div>

              {/* Gradient Selector */}
              <div className="flex items-center gap-2 justify-center py-1">
                {GRADIENTS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGradient(g.class)}
                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${g.class} transition-transform ${
                      selectedGradient === g.class
                        ? 'ring-2 ring-emerald-400 scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    title={g.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stickers Picker */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
              <Smile className="w-3.5 h-3.5" />
              Add Reaction Sticker
            </label>
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
              {STICKERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSticker(selectedSticker === s ? '' : s)}
                  className={`text-xl p-1.5 rounded-xl transition-all ${
                    selectedSticker === s
                      ? 'bg-emerald-100 dark:bg-emerald-950 scale-125'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Selector */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Who can see this:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPrivacy('everyone')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  privacy === 'everyone'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Everyone
              </button>
              <button
                onClick={() => setPrivacy('closeFriends')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  privacy === 'closeFriends'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Close Friends
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-900/60">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            loading={loading}
            icon={Send}
          >
            Share Story (24h)
          </Button>
        </div>
      </div>
    </div>
  );
};
