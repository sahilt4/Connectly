import React, { forwardRef } from 'react';

export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      rightIcon: RightIcon,
      onRightIconClick,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 ${
              Icon ? 'pl-10' : ''
            } ${RightIcon ? 'pr-10' : ''} ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-800'
            } ${className}`}
            {...props}
          />
          {RightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              tabIndex={-1}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 flex items-center transition-colors"
            >
              <RightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        {error && <span className="text-xs text-rose-500 mt-0.5">{error}</span>}
        {helperText && !error && (
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);
