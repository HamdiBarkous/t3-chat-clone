/**
 * Image Display Component
 * Shows images in chat messages with lightbox functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'max-w-32 max-h-24',
    md: 'max-w-64 max-h-48',
    lg: 'max-w-96 max-h-72'
  };

  // Fetch the actual image data from the backend
  useEffect(() => {
    if (!document.is_image) {
      setError(true);
      setIsLoading(false);
      return;
    }

    const fetchImage = async () => {
      try {
        setIsLoading(true);
        setError(false);

        // Get the auth token
        const { supabase } = await import('@/lib/api');
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (!token) {
          throw new Error('No authentication token');
        }

        const response = await fetch(
          `http://localhost:8000/api/v1/messages/${document.message_id}/documents/${document.id}/image`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const data = await response.json();
        setImageUrl(data.data_url);
      } catch (error) {
        console.error('Error fetching image:', error);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [document.id, document.message_id, document.is_image]);

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
      <div className="space-y-2">
        {/* Image container */}
        <div className={clsx(
          'relative rounded-lg overflow-hidden border border-border bg-secondary',
          sizeClasses[size],
          className
        )}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error || !imageUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-text-muted p-4 min-h-24">
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="text-xs text-center">
                <div className="font-medium">
                  {error ? 'Image unavailable' : 'Loading...'}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full" onClick={openModal}>
              <img
                src={imageUrl}
                alt={document.filename}
                className="w-full h-full object-cover cursor-pointer"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          )}
        </div>


      </div>

      {/* Modal for full-size view */}
      {isModalOpen && imageUrl && (
        <div 
          className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div className="relative max-w-screen-lg max-h-screen-lg">
            <img
              src={imageUrl}
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


          </div>
        </div>
      )}
    </>
  );
} 