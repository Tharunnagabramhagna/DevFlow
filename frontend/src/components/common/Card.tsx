import React from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
  | 'default'
  | 'elevated'
  | 'bordered'
  | 'interactive'
  | 'pastelLavender'
  | 'pastelBlue'
  | 'pastelMint'
  | 'pastelPeach';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default:
        'backdrop-blur-xl bg-white/75 dark:bg-[#101A2D]/75 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass dark:shadow-dark-glass text-[#0F172A] dark:text-[#F8FAFC] transition-all duration-200',
      elevated:
        'backdrop-blur-2xl bg-white/85 dark:bg-[#121E36]/85 rounded-2xl border border-white/80 dark:border-white/15 shadow-glass-elevated dark:shadow-dark-glass-elevated text-[#0F172A] dark:text-[#F8FAFC] transition-all duration-200',
      bordered:
        'backdrop-blur-xl bg-white/70 dark:bg-[#101A2D]/70 rounded-2xl border border-slate-300/70 dark:border-white/20 shadow-glass text-[#0F172A] dark:text-[#F8FAFC]',
      interactive:
        'backdrop-blur-xl bg-white/75 dark:bg-[#101A2D]/75 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass dark:shadow-dark-glass hover:shadow-glass-hover dark:hover:shadow-dark-glass-hover hover:border-blue-400/50 dark:hover:border-blue-400/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-[#0F172A] dark:text-[#F8FAFC]',
      pastelLavender:
        'backdrop-blur-xl bg-gradient-to-br from-white/85 via-white/75 to-[#F5F3FF]/80 dark:from-[#111C30]/80 dark:via-[#111C30]/75 dark:to-purple-950/40 rounded-2xl border border-[#DDD6FE]/80 dark:border-purple-800/40 shadow-glass text-[#0F172A] dark:text-[#F8FAFC]',
      pastelBlue:
        'backdrop-blur-xl bg-gradient-to-br from-white/85 via-white/75 to-[#EFF6FF]/80 dark:from-[#111C30]/80 dark:via-[#111C30]/75 dark:to-blue-950/40 rounded-2xl border border-[#BFDBFE]/80 dark:border-blue-800/40 shadow-glass text-[#0F172A] dark:text-[#F8FAFC]',
      pastelMint:
        'backdrop-blur-xl bg-gradient-to-br from-white/85 via-white/75 to-[#F0FDF4]/80 dark:from-[#111C30]/80 dark:via-[#111C30]/75 dark:to-emerald-950/40 rounded-2xl border border-[#BBF7D0]/80 dark:border-emerald-800/40 shadow-glass text-[#0F172A] dark:text-[#F8FAFC]',
      pastelPeach:
        'backdrop-blur-xl bg-gradient-to-br from-white/85 via-white/75 to-[#FFF7ED]/80 dark:from-[#111C30]/80 dark:via-[#111C30]/75 dark:to-orange-950/40 rounded-2xl border border-[#FED7AA]/80 dark:border-orange-800/40 shadow-glass text-[#0F172A] dark:text-[#F8FAFC]',
    };

    return (
      <div ref={ref} className={cn(variants[variant], className)} {...props}>
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-5 pb-3', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-heading text-sm sm:text-base font-semibold leading-snug text-slate-900 dark:text-white tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('font-sans text-xs text-slate-500 dark:text-slate-400 leading-relaxed', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-5 pt-0 border-t border-[#E9EAF2]/80 mt-4', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
