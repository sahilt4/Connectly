import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.94] ios-btn-interactive';

  const variants = {
    primary:
      'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-500/25 border border-white/20 focus:ring-indigo-500',
    emerald:
      'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/25 border border-white/20 focus:ring-emerald-500',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-100 border border-slate-200/50 dark:border-white/10 shadow-sm focus:ring-slate-400',
    outline:
      'border border-slate-300 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 focus:ring-indigo-400',
    ghost:
      'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 focus:ring-slate-400',
    danger:
      'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-500/25 border border-white/20 focus:ring-rose-500',
    dangerOutline:
      'border border-rose-400/50 dark:border-rose-500/30 text-rose-500 hover:bg-rose-500/10 focus:ring-rose-400',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-4.5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
    icon: 'p-2.5 text-sm rounded-2xl',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          {children}
        </>
      )}
    </button>
  );
};
