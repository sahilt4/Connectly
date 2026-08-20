import React from 'react';

export const Avatar = ({
  src,
  name = 'User',
  size = 'md',
  isOnline = false,
  showStatus = false,
  className = '',
}) => {
  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm font-bold',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-2xl font-black',
  };

  const statusDotSizes = {
    xs: 'w-2 h-2 ring-1',
    sm: 'w-2.5 h-2.5 ring-2',
    md: 'w-3.5 h-3.5 ring-2',
    lg: 'w-4 h-4 ring-2',
    xl: 'w-5 h-5 ring-4',
  };

  // Neo-luminous gradients
  const getGradient = (str) => {
    const gradients = [
      'from-indigo-500 via-purple-500 to-pink-500',
      'from-cyan-500 via-blue-600 to-indigo-600',
      'from-emerald-400 via-teal-500 to-cyan-600',
      'from-rose-500 via-pink-500 to-purple-600',
      'from-amber-400 via-orange-500 to-rose-500',
      'from-violet-600 via-fuchsia-500 to-pink-500',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover shadow-md ring-2 ring-white/20 dark:ring-white/10`}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}

      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr ${getGradient(
          name
        )} text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 ring-2 ring-white/20 dark:ring-white/10 ${
          src ? 'hidden' : 'flex'
        }`}
      >
        {getInitials(name)}
      </div>

      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-white dark:ring-[#090d16] shadow-sm ${
            statusDotSizes[size]
          } ${
            isOnline
              ? 'bg-gradient-to-tr from-emerald-400 to-cyan-400 animate-pulse'
              : 'bg-slate-400'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
