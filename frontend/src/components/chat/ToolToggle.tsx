'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';
import { ClientsResponse } from '@/types/api';

interface ToolToggleProps {
  enabled: boolean;
  enabledTools: string[];
  onToggle: (enabled: boolean, enabledTools: string[]) => void;
  disabled?: boolean;
}

export function ToolToggle({ enabled, enabledTools, onToggle, disabled = false }: ToolToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch available MCP clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/api/v1/tools/clients');
        if (response.ok) {
          const data: ClientsResponse = await response.json();
          setAvailableClients(data.clients);
        }
      } catch (error) {
        console.error('Failed to fetch MCP clients:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && availableClients.length === 0) {
      fetchClients();
    }
  }, [isOpen, availableClients.length]);

  const toggleClient = (client: string) => {
    const newEnabledTools = enabledTools.includes(client)
      ? enabledTools.filter(t => t !== client)
      : [...enabledTools, client];
    
    // Auto-enable tools if any client is selected
    const newEnabled = newEnabledTools.length > 0;
    onToggle(newEnabled, newEnabledTools);
  };

  const handleMainToggle = () => {
    if (enabled) {
      // Disable all tools
      onToggle(false, []);
    } else {
      // Enable with default tools (supabase if available)
      const defaultTools = availableClients.includes('supabase') ? ['supabase'] : availableClients.slice(0, 1);
      onToggle(true, defaultTools);
    }
  };

  return (
    <div className="relative">
      {/* Main Toggle Button */}
      <Button
        type="button"
        variant={enabled ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 transition-colors"
      >
        <span className="text-sm">🤖</span>
        <span className="text-sm">
          {enabled 
            ? `Agent (${enabledTools.length})` 
            : 'Chat Mode'
          }
        </span>
        <span className={clsx(
          'text-xs transition-transform',
          isOpen && 'rotate-180'
        )}>
          ▼
        </span>
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-64 bg-secondary border border-border rounded-lg shadow-lg z-50">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-primary">MCP Servers</h3>
              <Button
                type="button"
                variant={enabled ? 'secondary' : 'primary'}
                size="xs"
                onClick={handleMainToggle}
                disabled={disabled}
              >
                {enabled ? 'Disable All' : 'Enable'}
              </Button>
            </div>

            {loading ? (
              <div className="text-sm text-text-muted text-center py-2">
                Loading servers...
              </div>
            ) : availableClients.length === 0 ? (
              <div className="text-sm text-text-muted text-center py-2">
                No MCP servers available
              </div>
            ) : (
              <div className="space-y-2">
                {availableClients.map((client) => {
                  const isEnabled = enabledTools.includes(client);
                  return (
                    <label
                      key={client}
                      className={clsx(
                        'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
                        'hover:bg-muted',
                        isEnabled && 'bg-muted'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleClient(client)}
                        disabled={disabled}
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary capitalize">
                          {client}
                        </div>
                        <div className="text-xs text-text-muted">
                          {client === 'supabase' ? 'Database operations' : 
                           client === 'firecrawl' ? 'Web scraping & search' : 
                           client === 'tavily' ? 'AI-powered web search' : 
                           client === 'sequential-thinking' ? 'Step-by-step reasoning' : 
                           `${client} tools`}
                        </div>
                      </div>
                      {isEnabled && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs text-text-muted">
                {enabled 
                  ? `${enabledTools.length} server${enabledTools.length !== 1 ? 's' : ''} enabled`
                  : 'Click a server to enable agent mode'
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 