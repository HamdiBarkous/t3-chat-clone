/**
 * File Upload Component
 * Handles file selection with drag-and-drop support
 */

'use client';

import React, { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import { getApiBaseUrlWithoutVersion } from '@/lib/api';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number; // in bytes
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const SUPPORTED_TYPES = [
  // Documents
  '.pdf',
  // Text files
  '.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml',
  // Code files
  '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', '.hpp',
  '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.sh', '.sql',
  '.css', '.html',
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp'
];

export function FileUpload({
  onFileSelect,
  accept = SUPPORTED_TYPES.join(','),
  multiple = false,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  children,
  className
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File "${file.name}" is too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB.`;
    }

    // Check file type
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_TYPES.includes(extension)) {
      return `File type "${extension}" is not supported.`;
    }

    return null;
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);
    
    // Validate all files
    for (const file of fileArray) {
      const validation = validateFile(file);
      if (validation) {
        setError(validation);
        return;
      }
    }

    onFileSelect(fileArray);
  }, [onFileSelect, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  // Generate unique ID for this instance
  const inputId = `file-upload-input-${Math.random().toString(36).substr(2, 9)}`;

  const handleClick = useCallback(() => {
    if (disabled) return;
    const input = document.getElementById(inputId) as HTMLInputElement;
    input?.click();
  }, [disabled, inputId]);

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={clsx(
          'relative cursor-pointer',
          isDragging && !disabled && 'opacity-75',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {children}
        
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}

// Hook for file upload functionality
export function useFileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setUploadedFiles([]);
  };

  const uploadFiles = async (messageId: string): Promise<boolean> => {
    if (uploadedFiles.length === 0) return true;

    setIsUploading(true);
    try {
      const uploadPromises = uploadedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${getApiBaseUrlWithoutVersion()}/api/v1/messages/${messageId}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        return response.json();
      });

      await Promise.all(uploadPromises);
      clearFiles();
      return true;
    } catch (error) {
      console.error('File upload failed:', error);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadedFiles,
    isUploading,
    addFiles,
    removeFile,
    clearFiles,
    uploadFiles
  };
} 