/**
 * Skeleton Loading Component
 * Simple animated placeholders for loading states
 */

'use client';

import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number; // For text variant
}

export function Skeleton({ 
  className, 
  variant = 'rectangular', 
  width, 
  height, 
  lines = 1 
}: SkeletonProps) {
  const baseClasses = 'bg-muted/60 animate-pulse';
  
  if (variant === 'text' && lines > 1) {
    return (
      <div className={clsx('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              baseClasses,
              'h-4 rounded',
              index === lines - 1 ? 'w-3/4' : 'w-full'
            )}
            style={{ width, height }}
          />
        ))}
      </div>
    );
  }

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
    />
  );
}

// Preset skeleton components for common use cases
export function MessageSkeleton() {
  return (
    <div className="flex w-full mb-6 justify-start">
      <div className="flex flex-col max-w-[80%] items-start">
        <div className="text-primary space-y-3">
          <Skeleton variant="text" lines={3} className="w-96" />
          <Skeleton variant="text" lines={2} className="w-80" />
        </div>
      </div>
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="p-3.5 mx-1 rounded-xl animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-1">
          <Skeleton variant="text" className="w-3/4 h-4" />
          <Skeleton variant="text" className="w-1/2 h-3" />
        </div>
        <Skeleton variant="circular" width={24} height={24} />
      </div>
    </div>
  );
} 