/**
 * Dropdown Component
 * Reusable dropdown with keyboard navigation and custom styling
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else if (focusedIndex >= 0) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          setFocusedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex(prev => (prev + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => prev <= 0 ? options.length - 1 : prev - 1);
        }
        break;
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={clsx(
          'w-full px-3 py-2 text-left bg-[#2d2d2d] border border-[#3f3f46] rounded-lg text-white transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent',
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-[#52525b] cursor-pointer'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            {selectedOption ? (
              <div>
                <div className="font-medium text-sm">{selectedOption.label}</div>
                {selectedOption.description && (
                  <div className="text-xs text-zinc-400 truncate">{selectedOption.description}</div>
                )}
              </div>
            ) : (
              <span className="text-zinc-500">{placeholder}</span>
            )}
          </div>
          
          <svg 
            className={clsx(
              'w-4 h-4 text-zinc-400 transition-transform ml-2 flex-shrink-0',
              isOpen && 'rotate-180'
            )} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#1e1e1e] border border-[#3f3f46] rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option.value)}
              className={clsx(
                'w-full px-3 py-2 text-left transition-colors',
                'hover:bg-[#2d2d2d] focus:bg-[#2d2d2d] focus:outline-none',
                focusedIndex === index && 'bg-[#2d2d2d]',
                value === option.value && 'bg-[#8b5cf6]/10 text-[#8b5cf6]'
              )}
            >
              <div className="font-medium text-sm">{option.label}</div>
              {option.description && (
                <div className="text-xs text-zinc-400">{option.description}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 