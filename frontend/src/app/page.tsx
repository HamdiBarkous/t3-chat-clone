/**
 * Home Page - Protected Chat Interface
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

function ChatInterface() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Header */}
      <header className="bg-[#171717] border-b border-[#3f3f46] p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">
            T3.chat
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-zinc-400 text-sm">
              Welcome, {user?.user_metadata?.name || user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-[#171717] border-r border-[#3f3f46] p-4">
          <Button className="w-full mb-4">
            New Chat
          </Button>
          <div className="text-zinc-400 text-sm">
            No conversations yet
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white mb-4">
                How can I help you, {user?.user_metadata?.name || 'there'}?
              </h2>
              <p className="text-zinc-400 mb-8">
                Start a conversation with AI
              </p>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button className="p-4 bg-[#2d2d2d] hover:bg-[#3f3f46] rounded-lg text-left transition-colors">
                  <div className="text-white font-medium mb-1">Create</div>
                  <div className="text-zinc-400 text-sm">Generate content</div>
                </button>
                <button className="p-4 bg-[#2d2d2d] hover:bg-[#3f3f46] rounded-lg text-left transition-colors">
                  <div className="text-white font-medium mb-1">Explore</div>
                  <div className="text-zinc-400 text-sm">Ask questions</div>
                </button>
                <button className="p-4 bg-[#2d2d2d] hover:bg-[#3f3f46] rounded-lg text-left transition-colors">
                  <div className="text-white font-medium mb-1">Code</div>
                  <div className="text-zinc-400 text-sm">Programming help</div>
                </button>
                <button className="p-4 bg-[#2d2d2d] hover:bg-[#3f3f46] rounded-lg text-left transition-colors">
                  <div className="text-white font-medium mb-1">Learn</div>
                  <div className="text-zinc-400 text-sm">Educational content</div>
                </button>
              </div>
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-[#3f3f46]">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type your message here..."
                  className="w-full px-4 py-3 bg-[#2d2d2d] border border-[#3f3f46] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent pr-12"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-zinc-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <ChatInterface />
    </AuthGuard>
  );
}
