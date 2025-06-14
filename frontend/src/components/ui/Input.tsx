/**
 * Input Component with T3.chat styling
 */

import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-white mb-2"
        >
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        className={clsx(
          'w-full px-3 py-2 bg-[#2d2d2d] border border-[#3f3f46] rounded-lg text-white placeholder-zinc-500',
          'focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-zinc-400">{helperText}</p>
      )}
    </div>
  );
} 