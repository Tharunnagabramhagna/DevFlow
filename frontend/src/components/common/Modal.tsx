import React, { useEffect } from 'react';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-lg',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5">
      {/* Backdrop with frosted ambient blur */}
      <div
        className="fixed inset-0 bg-slate-950/40 dark:bg-black/65 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog with Glassmorphism */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full backdrop-blur-2xl bg-white/95 dark:bg-[#0F172A]/90 text-slate-900 dark:text-white shadow-2xl border border-white/80 dark:border-white/15 z-10 overflow-hidden transform transition-all',
          'rounded-t-2xl sm:rounded-2xl',
          'max-h-[92dvh] sm:max-h-[88vh] flex flex-col',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-6 sm:px-7 py-5 border-b border-slate-200/70 dark:border-white/10 flex items-start justify-between shrink-0">
            <div className="space-y-1 pr-4">
              {title && <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>}
              {description && <p className="font-sans text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content — scrollable */}
        <div className="p-6 sm:p-7 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 sm:px-7 py-4 bg-slate-50/80 dark:bg-white/5 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-end gap-3 shrink-0 backdrop-blur-md">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
