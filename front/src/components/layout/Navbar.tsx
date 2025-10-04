'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Play, User, Settings, CreditCard, LogOut, ChevronDown, Workflow, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LoginDialog } from '@/components/LoginDialog';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isEditor = pathname === '/editor';
  const isPlatform = pathname === '/platform';
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Auto-authenticated for demo
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleSaveOrRun = () => {
    if (isAuthenticated) {
      router.push('/workflows');
    } else {
      setShowLoginDialog(true);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    router.push('/workflows');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowProfileMenu(false);
    router.push('/');
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfileMenu]);

  return (
    <>
      <nav className="sticky top-4 z-50 px-4 w-full">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-full shadow-lg px-6 py-3 flex items-center justify-between">
            <Link 
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Image 
                src="/logo.jpg" 
                alt="Mozart Logo" 
                width={32} 
                height={32} 
                className="rounded-full"
              />
              <span className="text-lg font-light tracking-tight text-black">
                Mozart
              </span>
            </Link>
            
            <div className="flex items-center gap-3">
              {isEditor && (
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    className="rounded-full bg-black text-white hover:bg-gray-800 shadow-md"
                    onClick={handleSaveOrRun}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Run
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="rounded-full border-black text-black hover:bg-gray-100"
                    onClick={handleSaveOrRun}
                  >
                    Save
                  </Button>
                </div>
              )}

              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center">
                    <User className="w-4 h-4 text-black" />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-black transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
                    >
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            router.push('/');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          <Home className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Home</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            router.push('/workflows');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          <Workflow className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Workflows</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            router.push('/settings');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          <Settings className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Settings</span>
                        </button>
                        <div className="my-1 border-t border-gray-200" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <LoginDialog
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLogin={handleLogin}
      />
    </>
  );
}
