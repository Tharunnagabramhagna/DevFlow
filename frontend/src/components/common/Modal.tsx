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
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop with soft blur */}
      <div
        className="fixed inset-0 bg-[#25263A]/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-white dark:bg-[#111C30] text-[#0F172A] dark:text-[#F8FAFC] shadow-modal-elevated border border-slate-200 dark:border-[#26344B] z-10 overflow-hidden transform transition-all',
          'rounded-t-2xl sm:rounded-2xl',
          'max-h-[92dvh] sm:max-h-[85vh] flex flex-col',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-[#26344B] flex items-start justify-between shrink-0">
            <div className="space-y-0.5 pr-4">
              {title && <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h2>}
              {description && <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A253A] transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content — scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-[#0A101D] border-t border-slate-200 dark:border-[#26344B] flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
