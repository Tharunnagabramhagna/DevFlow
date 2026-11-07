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
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    full: 'max-w-full',
  };

  const isRight = position === 'right';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#25263A]/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={cn('fixed inset-y-0 flex max-w-full', isRight ? 'right-0 pl-10' : 'left-0 pr-10')}>
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'w-screen bg-white shadow-drawer-elevated border-l border-[#E9EAF2] flex flex-col transform transition-transform duration-300 ease-in-out',
            isRight ? 'border-l animate-in slide-in-from-right' : 'border-r animate-in slide-in-from-left',
            sizes[size],
            className
          )}
        >
          {/* Header */}
          {(title || description) && (
            <div className="px-6 py-4.5 border-b border-[#E9EAF2] flex items-start justify-between shrink-0 bg-white">
              <div className="space-y-1 pr-4 min-w-0">
                {title && (
                  typeof title === 'string' ? (
                    <h2 className="text-base sm:text-lg font-semibold text-[#25263A] tracking-tight truncate">
                      {title}
                    </h2>
                  ) : (
                    title
                  )
                )}
                {description && (
                  typeof description === 'string' ? (
                    <p className="text-xs text-[#777B91] leading-relaxed line-clamp-2">
                      {description}
                    </p>
                  ) : (
                    description
                  )
                )}
              </div>
              <button
                onClick={onClose}
                className="text-[#777B91] hover:text-[#25263A] p-1.5 rounded-lg hover:bg-[#F1F3FA] transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 bg-white">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 bg-[#F1F3FA] border-t border-[#E9EAF2] flex items-center justify-end gap-2.5 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

