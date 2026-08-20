import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

export const MediaLightbox = ({ isOpen, media, onClose }) => {
  if (!isOpen || !media) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Top action controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <a
          href={media.url}
          download={media.fileName || 'image.jpg'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image container */}
      <div
        className="max-w-4xl max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={media.url}
          alt={media.fileName || 'Image'}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl animate-slide-up"
        />
        {media.fileName && (
          <div className="mt-3 text-xs text-white/70 font-medium tracking-wide">
            {media.fileName}
          </div>
        )}
      </div>
    </div>
  );
};
