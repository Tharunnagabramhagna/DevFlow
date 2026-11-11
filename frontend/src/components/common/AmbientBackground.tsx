import React from 'react';

export interface AmbientBackgroundProps {
  className?: string;
}

/**
 * AmbientBackground creates the multi-layered subtle gradient lighting
 * and blurred ambient shapes required for authentic glassmorphism depth.
 * It is GPU-accelerated, non-blocking, and pointer-events-none.
 */
export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 overflow-hidden pointer-events-none -z-10 transition-opacity duration-700 select-none ${className}`}
    >
      {/* Base Canvas Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F4F7FC] via-[#F8FAFD] to-[#EDF2F9] dark:from-[#060A14] dark:via-[#090E1D] dark:to-[#0D152A]" />

      {/* Ambient Orb 1: Indigo / Blue Glow (Top-Left) */}
      <div
        className="absolute -top-[12%] -left-[10%] w-[55vw] max-w-[700px] h-[55vw] max-h-[700px] rounded-full transform-gpu blur-[130px] opacity-35 dark:opacity-25 bg-gradient-to-tr from-blue-600/50 via-indigo-500/40 to-cyan-400/30 dark:from-blue-600/60 dark:via-indigo-500/50 dark:to-cyan-400/40"
      />

      {/* Ambient Orb 2: Violet / Purple Glow (Top-Right) */}
      <div
        className="absolute -top-[8%] -right-[12%] w-[50vw] max-w-[650px] h-[50vw] max-h-[650px] rounded-full transform-gpu blur-[140px] opacity-30 dark:opacity-20 bg-gradient-to-bl from-purple-500/40 via-violet-600/35 to-indigo-500/30 dark:from-purple-500/50 dark:via-violet-600/40 dark:to-indigo-500/40"
      />

      {/* Ambient Orb 3: Teal / Emerald Accent (Center-Left / Mid-bottom) */}
      <div
        className="absolute top-[45%] -left-[8%] w-[45vw] max-w-[550px] h-[45vw] max-h-[550px] rounded-full transform-gpu blur-[130px] opacity-25 dark:opacity-15 bg-gradient-to-r from-teal-400/35 via-cyan-500/25 to-blue-500/20 dark:from-teal-400/40 dark:via-cyan-500/30 dark:to-blue-500/20"
      />

      {/* Ambient Orb 4: Deep Sapphire / Cobalt (Bottom-Right) */}
      <div
        className="absolute -bottom-[15%] -right-[8%] w-[60vw] max-w-[750px] h-[60vw] max-h-[750px] rounded-full transform-gpu blur-[150px] opacity-30 dark:opacity-25 bg-gradient-to-tl from-blue-700/40 via-indigo-600/30 to-violet-500/20 dark:from-blue-700/60 dark:via-indigo-600/40 dark:to-violet-500/30"
      />

      {/* Subtle Noise / Ambient Grid Texture Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.035] dark:opacity-[0.05]" />
    </div>
  );
};

export default AmbientBackground;

