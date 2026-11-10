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
      default: 'bg-white dark:bg-[#111C30] rounded-2xl border border-slate-200 dark:border-[#26344B] shadow-card-subtle text-[#0F172A] dark:text-[#F8FAFC]',
      elevated: 'bg-white dark:bg-[#111C30] rounded-2xl border border-slate-200 dark:border-[#26344B] shadow-card-hover text-[#0F172A] dark:text-[#F8FAFC]',
      bordered: 'bg-white dark:bg-[#111C30] rounded-2xl border-2 border-slate-200 dark:border-[#26344B] text-[#0F172A] dark:text-[#F8FAFC]',
      interactive:
        'bg-white dark:bg-[#111C30] rounded-2xl border border-slate-200 dark:border-[#26344B] shadow-card-subtle hover:shadow-card-hover hover:border-[#93C5FD] dark:hover:border-blue-500 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-[#0F172A] dark:text-[#F8FAFC]',
      pastelLavender:
        'bg-gradient-to-br from-white via-white to-[#F5F3FF] dark:from-[#111C30] dark:via-[#111C30] dark:to-purple-950/40 rounded-2xl border border-[#DDD6FE] dark:border-purple-800/50 shadow-card-subtle text-[#0F172A] dark:text-[#F8FAFC]',
      pastelBlue:
        'bg-gradient-to-br from-white via-white to-[#EFF6FF] dark:from-[#111C30] dark:via-[#111C30] dark:to-blue-950/40 rounded-2xl border border-[#BFDBFE] dark:border-blue-800/50 shadow-card-subtle text-[#0F172A] dark:text-[#F8FAFC]',
      pastelMint:
        'bg-gradient-to-br from-white via-white to-[#F0FDF4] dark:from-[#111C30] dark:via-[#111C30] dark:to-emerald-950/40 rounded-2xl border border-[#BBF7D0] dark:border-emerald-800/50 shadow-card-subtle text-[#0F172A] dark:text-[#F8FAFC]',
      pastelPeach:
        'bg-gradient-to-br from-white via-white to-[#FFF7ED] dark:from-[#111C30] dark:via-[#111C30] dark:to-orange-950/40 rounded-2xl border border-[#FED7AA] dark:border-orange-800/50 shadow-card-subtle text-[#0F172A] dark:text-[#F8FAFC]',
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
    className={cn('text-base font-semibold leading-tight text-slate-900 dark:text-white tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs text-slate-500 dark:text-slate-400 leading-relaxed', className)} {...props} />
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
