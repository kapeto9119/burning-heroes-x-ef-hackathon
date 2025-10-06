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
          <div className="backdrop-blur-xl bg-background/80 border border-border rounded-full shadow-lg px-6 py-3 flex items-center justify-between">
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
              <span className="text-lg font-light tracking-tight text-foreground">
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
                  className="p-1.5 rounded-full hover:bg-accent transition-colors cursor-pointer"
                  aria-label="Toggle dark mode"
                >
                  {theme === "dark" ? (
                    <Sun className="w-3.5 h-3.5 text-foreground" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-foreground" />
                  )}
                </motion.button>
              )}

              {/* Auth Button or Profile Menu */}
              {!isAuthenticated ? (
                <motion.button
                  onClick={() => setShowAuthModal(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Login
                </motion.button>
              ) : (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 p-2 rounded-full hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-foreground transition-transform ${
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
                        className="absolute right-0 mt-2 w-56 backdrop-blur-xl bg-background/95 border border-border rounded-2xl shadow-xl overflow-hidden"
                      >
                        <div className="p-2">
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              router.push("/");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-left cursor-pointer"
                          >
                            <Home className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              Home
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              router.push("/workflows");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-left cursor-pointer"
                          >
                            <Workflow className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              Workflows
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              router.push("/integrations");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-left cursor-pointer"
                          >
                            <Plug className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              Integrations
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              router.push("/billing");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-left cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              Billing & Usage
                            </span>
                          </button>
                          {/* Settings page hidden - deprecated, use /integrations instead */}
                          {/* <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              router.push("/settings");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-left cursor-pointer"
                          >
                            <Settings className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              Settings
                            </span>
                          </button> */}
                          <div className="my-1 border-t border-border" />
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                          >
                            <LogOut className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-red-500">
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
