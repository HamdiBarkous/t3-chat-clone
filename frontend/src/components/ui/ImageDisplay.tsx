/**
 * Image Display Component
 * Shows images in chat messages with lightbox functionality
 */

'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import type { DocumentResponse } from '@/types/api';

interface ImageDisplayProps {
  document: DocumentResponse;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ImageDisplay({ document, size = 'md', className }: ImageDisplayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // For now, we'll show a placeholder since we don't have the actual image URL
  // In a real implementation, you might want to fetch the image from a storage service
  const placeholderUrl = `data:image/svg+xml;base64,${btoa(`
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="var(--secondary)"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="var(--primary)" font-family="sans-serif" font-size="14">
        ${document.filename}
      </text>
    </svg>
  `)}`;

  const sizeClasses = {
    sm: 'max-w-32 max-h-24',
    md: 'max-w-64 max-h-48',
    lg: 'max-w-96 max-h-72'
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError(true);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className={clsx(
        'relative group cursor-pointer rounded-lg overflow-hidden border border-border bg-secondary',
        sizeClasses[size],
        className
      )}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-muted p-4">
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5C3.312 16.333 4.271 18 5.81 18z" />
            </svg>
            <div className="text-xs text-center">
              <div className="font-medium">Image unavailable</div>
              <div className="text-text-muted/60">{document.filename}</div>
            </div>
          </div>
        ) : (
          <div className="relative" onClick={openModal}>
            <img
              src={placeholderUrl}
              alt={document.filename}
              className="w-full h-full object-cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>

            {/* Image info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent text-text-primary text-xs p-2">
              <div className="truncate font-medium" title={document.filename}>
                {document.filename}
              </div>
              <div className="text-text-muted flex items-center gap-2">
                <span className="uppercase">{document.file_type}</span>
                <span>•</span>
                <span>{formatFileSize(document.file_size)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for full-size view */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div className="relative max-w-screen-lg max-h-screen-lg">
            <img
              src={placeholderUrl}
              alt={document.filename}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 w-8 h-8 bg-background/80 text-text-primary rounded-full flex items-center justify-center hover:bg-background/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image info */}
            <div className="absolute bottom-4 left-4 right-4 bg-background/80 text-text-primary rounded p-3">
              <div className="font-medium">{document.filename}</div>
              <div className="text-sm text-text-muted flex items-center gap-2 mt-1">
                <span className="uppercase">{document.file_type}</span>
                <span>•</span>
                <span>{formatFileSize(document.file_size)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 