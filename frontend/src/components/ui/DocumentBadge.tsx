/**
 * Document Badge Component
 * Displays document attachment metadata with file icon and actions
 */

'use client';

import React from 'react';
import { clsx } from 'clsx';
import type { DocumentResponse } from '@/types/api';

interface DocumentBadgeProps {
  document: DocumentResponse;
  onDelete?: (documentId: string) => void;
  showActions?: boolean;
  size?: 'sm' | 'md';
}

export function DocumentBadge({ 
  document, 
  onDelete, 
  showActions = false,
  size = 'md'
}: DocumentBadgeProps) {
  
  const getFileIcon = (fileType: string, isImage: boolean = false) => {
    if (isImage) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }

    switch (fileType.toLowerCase()) {
      case 'pdf':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'txt':
      case 'md':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 6h10M7 10h10M7 14h10M7 18h10" />
          </svg>
        );
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'py':
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'java':
      case 'cpp':
      case 'c':
      case 'go':
      case 'rs':
      case 'php':
      case 'rb':
      case 'swift':
      case 'kt':
      case 'scala':
      case 'sh':
      case 'sql':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(document.id);
    }
  };

  return (
    <div className={clsx(
      'inline-flex items-center gap-2 rounded-md border border-[#3f3f46] bg-[#2d2d2d] text-white',
      size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
      'hover:bg-[#3a3a3a] transition-colors'
    )}>
      {/* File Icon */}
      <div className="text-[#8b5cf6]">
        {getFileIcon(document.file_type, document.is_image)}
      </div>

      {/* File Info */}
      <div className="flex flex-col min-w-0">
        <div className="truncate font-medium" title={document.filename}>
          {document.filename}
        </div>
        <div className="text-xs text-zinc-500 flex items-center gap-2">
          <span className="uppercase">{document.file_type}</span>
          <span>•</span>
          <span>{formatFileSize(document.file_size)}</span>
        </div>
      </div>

      {/* Actions */}
      {showActions && onDelete && (
        <button
          onClick={handleDelete}
          className="ml-1 p-1 rounded hover:bg-[#ef4444] hover:text-white transition-colors"
          title="Remove document"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
} 