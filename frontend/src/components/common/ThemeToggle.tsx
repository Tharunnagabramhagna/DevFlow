import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export interface ThemeToggleProps {
  /** Optional layout style: 'icon' (default in nav) | 'labeled' (full row in mobile drawers) */
  variant?: 'icon' | 'labeled';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'icon',
  className = '',
}) => {
  const { isDark, toggleTheme } = useTheme();

  const label = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';

  if (variant === 'labeled') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
          isDark
            ? 'bg-[#101A2D] text-slate-300 hover:text-white hover:bg-[#1B2A47] border-[#26344B]'
            : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200 shadow-xs'
        } ${className}`}
        aria-label={label}
        title={label}
      >
        <div className="flex items-center gap-2">
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600" />
          )}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </div>
        <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
          {isDark ? '🌙 Dark Active' : '☀️ Light Active'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center p-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0070BA] ${
        isDark
          ? 'bg-[#101A2D]/80 hover:bg-[#1B2A47] border-[#26344B] text-amber-400 hover:text-amber-300'
          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-blue-600 shadow-xs'
      } ${className}`}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-300 hover:-rotate-12" />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
};

export default ThemeToggle;

