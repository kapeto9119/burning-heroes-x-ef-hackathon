'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Countdown and redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/billing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-green-500/50 shadow-2xl shadow-green-500/20 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-3">
            Payment Successful! 🎉
          </h1>

          {/* Message */}
          <p className="text-gray-300 mb-6">
            Your subscription has been activated. You now have access to all premium features!
          </p>

          {/* Features Unlocked */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-gray-400 mb-3 text-center">What's unlocked:</p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                Increased execution limits
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                More active workflows
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                Access to premium AI models
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                Priority support
              </li>
            </ul>
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 text-gray-400 mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              Redirecting to billing in {countdown} seconds...
            </span>
          </div>

          {/* Manual Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/billing')}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              View Billing
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/workflows')}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-semibold transition-all"
            >
              Create Workflow
            </button>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Questions? Contact us at support@yourapp.com
        </p>
      </div>
    </div>
  );
}
