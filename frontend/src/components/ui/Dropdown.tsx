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
  info?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  direction?: 'up' | 'down' | 'auto';
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className,
  direction = 'down',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownDirection, setDropdownDirection] = useState(direction);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  // Calculate dropdown direction when opening
  useEffect(() => {
    if (isOpen && direction === 'auto' && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If there's more space above or not enough space below, open upward
      setDropdownDirection(spaceBelow < 200 && spaceAbove > spaceBelow ? 'up' : 'down');
    } else if (direction !== 'auto') {
      setDropdownDirection(direction);
    }
  }, [isOpen, direction]);

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
          'w-full px-3 py-2 text-left bg-secondary border border-border rounded-lg text-text-primary transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-primary/50 cursor-pointer'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            {selectedOption ? (
              <div>
                <div className="font-medium text-sm">{selectedOption.label}</div>
                {selectedOption.info && (
                  <div className="text-xs text-text-muted truncate">{selectedOption.info}</div>
                )}
              </div>
            ) : (
              <span className="text-text-muted">{placeholder}</span>
            )}
          </div>
          
          <svg 
            className={clsx(
              'w-4 h-4 text-text-muted transition-transform ml-2 flex-shrink-0',
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
        <div className={clsx(
          "absolute z-50 w-full bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto",
          dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
        )}>
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option.value)}
              className={clsx(
                'w-full px-3 py-2 text-left transition-colors',
                'hover:bg-muted focus:bg-muted focus:outline-none',
                focusedIndex === index && 'bg-muted',
                value === option.value ? 'bg-primary/20 text-primary' : 'text-text-primary'
              )}
            >
              <div className="font-medium text-sm">{option.label}</div>
              {option.info && (
                <div className={clsx(
                  "text-xs",
                  value === option.value ? "text-primary/80" : "text-text-muted"
                )}>
                  {option.info}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 