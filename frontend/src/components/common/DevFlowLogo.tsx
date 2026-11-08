import React from 'react';
import { cn } from '@/utils/cn';
import symbolAsset from '@/assets/devflow-symbol.jpg';
import bannerAsset from '@/assets/devflow-banner.jpg';

export interface BrandLogoProps {
  /** Sizing preset or custom numeric pixel height */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  alt?: string;
  glow?: boolean;
}

export interface BrandWordmarkProps {
  theme?: 'light' | 'dark' | 'auto';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export interface BrandHeroBannerProps {
  className?: string;
  glow?: boolean;
  alt?: string;
  priority?: boolean;
}

export interface DevFlowLogoProps {
  /** 'icon' = standalone symbol only | 'horizontal' = symbol + wordmark */
  variant?: 'icon' | 'horizontal';
  /** 'light' = white wordmark (dark backgrounds) | 'dark' = dark wordmark (light backgrounds) | 'auto' = adaptive */
  theme?: 'light' | 'dark' | 'auto';
  /** Controls overall height */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  showTagline?: boolean;
}

const sizeConfig: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', { heightClass: string; textClass: string; gapClass: string; heightPx: number }> = {
  xs: { heightClass: 'h-6', textClass: 'text-xs', gapClass: 'gap-1.5', heightPx: 24 },
  sm: { heightClass: 'h-8', textClass: 'text-sm font-bold', gapClass: 'gap-2.5', heightPx: 32 },
  md: { heightClass: 'h-10', textClass: 'text-base font-bold', gapClass: 'gap-3', heightPx: 40 },
  lg: { heightClass: 'h-12', textClass: 'text-xl font-bold', gapClass: 'gap-3.5', heightPx: 48 },
  xl: { heightClass: 'h-16', textClass: 'text-2xl font-extrabold', gapClass: 'gap-4', heightPx: 64 },
};

/**
 * BrandLogo — Standalone official DevFlow symbol.
 * Preserves the exact 1024:935 aspect ratio with zero distortion.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'sm',
  className,
  alt = 'DevFlow Symbol',
  glow = false,
}) => {
  const isPreset = typeof size === 'string' && size in sizeConfig;
  const preset = isPreset ? sizeConfig[size as 'xs' | 'sm' | 'md' | 'lg' | 'xl'] : null;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 select-none',
        glow && 'group',
        className
      )}
    >
      {glow && (
        <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600/30 via-cyan-400/20 to-purple-600/30 rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
      )}
      <img
        src={symbolAsset}
        alt={alt}
        loading="eager"
        decoding="async"
        className={cn(
          'relative object-contain aspect-[1024/935] rounded-md transition-transform duration-200',
          preset ? preset.heightClass : '',
          'w-auto max-h-full'
        )}
        style={!preset && typeof size === 'number' ? { height: `${size}px` } : undefined}
      />
    </div>
  );
};

/**
 * BrandWordmark — High-contrast typography component for the "DevFlow" brand mark.
 */
export const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  theme = 'auto',
  size = 'sm',
  className,
  showTagline = false,
}) => {
  const isPreset = typeof size === 'string' && size in sizeConfig;
  const preset = isPreset ? sizeConfig[size as 'xs' | 'sm' | 'md' | 'lg' | 'xl'] : sizeConfig.sm;

  return (
    <div className={cn('inline-flex flex-col justify-center leading-none select-none', className)}>
      <div className="flex items-center tracking-tight">
        <span
          className={cn(
            'font-black tracking-tight',
            preset.textClass,
            theme === 'dark'
              ? 'text-slate-900'
              : theme === 'light'
                ? 'text-white'
                : 'text-slate-900 dark:text-white'
          )}
        >
          Dev<span className="text-[#0070BA] dark:text-[#38BDF8]">Flow</span>
        </span>
      </div>
      {showTagline && (
        <span className="text-[10px] tracking-wider text-slate-400 font-medium uppercase mt-0.5">
          From Code to Cash
        </span>
      )}
    </div>
  );
};

/**
 * BrandHeroBanner — Full DevFlow logo banner asset with 3:1 aspect ratio.
 * Used for centered hero branding and high-visibility marketing surfaces.
 */
export const BrandHeroBanner: React.FC<BrandHeroBannerProps> = ({
  className,
  glow = true,
  alt = 'DevFlow — From Code to Cash',
  priority = false,
}) => {
  return (
    <div className={cn('relative inline-flex items-center justify-center w-full select-none', className)}>
      {glow && (
        <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/30 via-cyan-400/20 to-purple-600/25 rounded-2xl blur-xl opacity-75 pointer-events-none transition duration-500" />
      )}
      <div className="relative w-full rounded-2xl overflow-hidden border border-[#26344B]/70 bg-[#060A14] shadow-2xl p-2 sm:p-3">
        <img
          src={bannerAsset}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="w-full h-auto object-contain aspect-[1024/341] rounded-xl transition-all duration-300"
        />
      </div>
    </div>
  );
};

/**
 * DevFlowLogo — Universal brand component supporting both standalone symbol ('icon')
 * and full horizontal mark ('horizontal'). Completely backwards compatible with all existing views.
 */
export const DevFlowLogo: React.FC<DevFlowLogoProps> = ({
  variant = 'horizontal',
  theme = 'auto',
  size = 'sm',
  className,
  showTagline = false,
}) => {
  const isPreset = typeof size === 'string' && size in sizeConfig;
  const preset = isPreset ? sizeConfig[size as 'xs' | 'sm' | 'md' | 'lg' | 'xl'] : sizeConfig.sm;

  if (variant === 'icon') {
    return <BrandLogo size={size} className={className} />;
  }

  return (
    <span className={cn('inline-flex items-center shrink-0 cursor-pointer', preset.gapClass, className)} aria-label="DevFlow">
      <BrandLogo size={size} />
      <BrandWordmark theme={theme} size={typeof size === 'string' ? size : 'sm'} showTagline={showTagline} />
    </span>
  );
};

export default DevFlowLogo;
