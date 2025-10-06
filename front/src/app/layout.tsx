import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkflowProvider } from "@/contexts/WorkflowContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mozart | Lovable for automations",
  description: "Build powerful automation workflows with AI. Just describe what you want and Mozart creates it for you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              <ThemeProvider>
                <WorkflowProvider>
                  {children}
                </WorkflowProvider>
              </ThemeProvider>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
