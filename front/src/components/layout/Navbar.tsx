"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Play,
  User,
  Settings,
  CreditCard,
  LogOut,
  ChevronDown,
  Workflow,
  Home,
  Moon,
  Sun,
  LogIn,
  Plug,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { AuthModal } from "@/components/auth/AuthModal";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const isEditor = pathname === "/editor";
  const isPlatform = pathname === "/platform";
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
    router.push("/");
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProfileMenu]);

  return (
    <>
      <nav className="sticky top-4 z-50 px-4 w-full">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-full shadow-lg px-6 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Image
                src="/logo.jpg"
                alt="Mozart Logo"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-lg font-light tracking-tight text-black dark:text-white">
                Mozart
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              {mounted && (
                <motion.button
                  onClick={toggleTheme}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  aria-label="Toggle dark mode"
                >
                  {theme === "dark" ? (
                    <Sun className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                  )}
                </motion.button>
              )}

              {/* Auth Button or Profile Menu */}
              {!isAuthenticated ? (
                <motion.button
                  onClick={() => setShowAuthModal(true)}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-1.5 rounded-full bg-black/90 dark:bg-white/90 text-white dark:text-black text-sm font-medium transition-colors cursor-pointer"
                >
                  Login
                </motion.button>
              ) : (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-300 flex items-center justify-center">
                      <User className="w-4 h-4 text-black dark:text-gray-100" />
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-black dark:text-gray-100 transition-transform ${
                        showProfileMenu ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden"
                    >
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            router.push("/");
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left cursor-pointer"
                        >
                          <Home className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Home
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            router.push("/workflows");
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left cursor-pointer"
                        >
                          <Workflow className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Workflows
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            router.push("/integrations");
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left cursor-pointer"
                        >
                          <Plug className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Integrations
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            router.push("/billing");
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Billing & Usage
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            router.push("/settings");
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left cursor-pointer"
                        >
                          <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Settings
                          </span>
                        </button>
                        <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            Logout
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}
