import React, { useEffect } from 'react';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  position?: 'right' | 'left';
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  position = 'right',
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
    lg: 'max-w-xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    full: 'max-w-full',
  };

  const isRight = position === 'right';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 dark:bg-black/65 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={cn('fixed inset-y-0 flex max-w-full', isRight ? 'right-0 pl-10' : 'left-0 pr-10')}>
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'w-screen backdrop-blur-2xl bg-white/95 dark:bg-[#0F172A]/90 text-slate-900 dark:text-white shadow-2xl border-slate-200/80 dark:border-white/15 flex flex-col transform transition-transform duration-300 ease-in-out',
            isRight ? 'border-l animate-in slide-in-from-right' : 'border-r animate-in slide-in-from-left',
            sizes[size],
            className
          )}
        >
          {/* Header */}
          {(title || description) && (
            <div className="px-6 py-4.5 border-b border-slate-200/70 dark:border-white/10 flex items-start justify-between shrink-0 bg-transparent">
              <div className="space-y-1 pr-4 min-w-0">
                {title && (
                  typeof title === 'string' ? (
                    <h2 className="font-heading text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                      {title}
                    </h2>
                  ) : (
                    title
                  )
                )}
                {description && (
                  typeof description === 'string' ? (
                    <p className="font-sans text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {description}
                    </p>
                  ) : (
                    description
                  )
                )}
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 bg-transparent">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 bg-slate-50/80 dark:bg-white/5 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-end gap-2.5 shrink-0 backdrop-blur-md">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

