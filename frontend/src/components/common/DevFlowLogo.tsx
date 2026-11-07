import React from 'react';
import { cn } from '@/utils/cn';

interface DevFlowLogoProps {
  /** 'icon' = symbol only | 'horizontal' = symbol + wordmark */
  variant?: 'icon' | 'horizontal';
  /** 'light' = white wordmark (use on dark backgrounds) | 'dark' = navy wordmark (use on light backgrounds) */
  theme?: 'light' | 'dark';
  /** Controls overall height */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap: Record<string, { icon: number; text: string; gap: string }> = {
  xs: { icon: 24, text: 'text-xs', gap: 'gap-1.5' },
  sm: { icon: 28, text: 'text-sm', gap: 'gap-2' },
  md: { icon: 34, text: 'text-base', gap: 'gap-2.5' },
  lg: { icon: 42, text: 'text-xl', gap: 'gap-3' },
  xl: { icon: 52, text: 'text-2xl', gap: 'gap-3.5' },
};

/** Inline SVG icon — the DevFlow workflow-node symbol with central checkmark */
const DevFlowIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Connection lines */}
    <line x1="12" y1="24" x2="21" y2="15" stroke="#356DFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/>
    <line x1="12" y1="24" x2="21" y2="33" stroke="#356DFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/>
    <line x1="21" y1="15" x2="30" y2="15" stroke="#356DFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/>
    <line x1="21" y1="33" x2="30" y2="33" stroke="#356DFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/>
    <line x1="30" y1="15" x2="36" y2="24" stroke="#19C6B4" strokeWidth="1.6" strokeLinecap="round" opacity="0.85"/>
    <line x1="30" y1="33" x2="36" y2="24" stroke="#19C6B4" strokeWidth="1.6" strokeLinecap="round" opacity="0.85"/>
    <line x1="21" y1="15" x2="24" y2="24" stroke="#356DFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
    <line x1="21" y1="33" x2="24" y2="24" stroke="#356DFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
    {/* Outer nodes */}
    <circle cx="12" cy="24" r="3.2" fill="#356DFF" opacity="0.9"/>
    <circle cx="21" cy="15" r="2.6" fill="#356DFF" opacity="0.75"/>
    <circle cx="21" cy="33" r="2.6" fill="#356DFF" opacity="0.75"/>
    <circle cx="30" cy="15" r="2.4" fill="#19C6B4" opacity="0.8"/>
    <circle cx="30" cy="33" r="2.4" fill="#19C6B4" opacity="0.8"/>
    {/* Teal accent node */}
    <circle cx="36" cy="24" r="3" fill="#19C6B4" opacity="0.9"/>
    {/* Central circle */}
    <circle cx="24" cy="24" r="7" fill="url(#dfIconGrad)"/>
    {/* White checkmark */}
    <path
      d="M20.5 24.2 L23 26.8 L27.5 21.5"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Right-pointing arrow */}
    <path
      d="M39 22.5 L43 24 L39 25.5"
      stroke="#356DFF"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <defs>
      <linearGradient id="dfIconGrad" x1="17" y1="17" x2="31" y2="31" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#356DFF"/>
        <stop offset="100%" stopColor="#2252CC"/>
      </linearGradient>
    </defs>
  </svg>
);

/**
 * DevFlowLogo — reusable brand component.
 *
 * @example
 * // Sidebar (dark background)
 * <DevFlowLogo variant="horizontal" theme="light" size="sm" />
 *
 * // Landing page navbar (dark hero)
 * <DevFlowLogo variant="horizontal" theme="light" size="md" />
 *
 * // Favicon / icon only
 * <DevFlowLogo variant="icon" size="sm" />
 */
export const DevFlowLogo: React.FC<DevFlowLogoProps> = ({
  variant = 'horizontal',
  theme = 'light',
  size = 'sm',
  className,
}) => {
  const { icon: iconSize, text: textSize, gap } = sizeMap[size];
  const wordmarkColor = theme === 'light' ? '#FFFFFF' : '#101828';

  if (variant === 'icon') {
    return (
      <span className={cn('inline-flex items-center justify-center shrink-0', className)} aria-label="DevFlow">
        <DevFlowIcon size={iconSize} />
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center shrink-0', gap, className)} aria-label="DevFlow">
      <DevFlowIcon size={iconSize} />
      <span
        className={cn('font-bold tracking-widest uppercase leading-none', textSize)}
        style={{ color: wordmarkColor, letterSpacing: '0.12em' }}
      >
        DevFlow
      </span>
    </span>
  );
};

export default DevFlowLogo;

