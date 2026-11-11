import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogIn, UserPlus, X } from 'lucide-react';
import { Button } from './Button';

export interface GuestGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle?: string;
  message?: string;
}

export const GuestGuardModal: React.FC<GuestGuardModalProps> = ({
  isOpen,
  onClose,
  actionTitle,
  message = 'Guest Mode: Please sign in or create an account to access this functionality.',
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#060814]/70 dark:bg-[#060814]/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0D1226] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden z-10 transform transition-all animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors focus:outline-none"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7 text-center">
          {/* Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
          </div>

          {/* Heading */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {actionTitle ? `Restricted: ${actionTitle}` : 'Action Restricted'}
          </h3>

          {/* Standard Required Notice */}
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-left">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {message}
            </p>
          </div>

          <p className="mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-left">
            You are currently exploring DevFlow with demonstration data. To create permanent projects, submit milestone deliverables, or generate real PayPal invoices, authenticate with an account.
          </p>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-col gap-2.5">
            <Button
              variant="primary"
              className="w-full justify-center gap-2 py-2.5 text-sm font-semibold shadow-md"
              onClick={() => {
                onClose();
                navigate('/signup');
              }}
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </Button>

            <Button
              variant="secondary"
              className="w-full justify-center gap-2 py-2.5 text-sm font-semibold"
              onClick={() => {
                onClose();
                navigate('/login');
              }}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="mt-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium py-1 transition-colors"
            >
              Continue Exploring as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestGuardModal;

