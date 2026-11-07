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
      default: 'bg-white rounded-2xl border border-[#E9EAF2] shadow-card-subtle',
      elevated: 'bg-white rounded-2xl border border-[#E9EAF2] shadow-card-hover',
      bordered: 'bg-white rounded-2xl border-2 border-[#E9EAF2]',
      interactive:
        'bg-white rounded-2xl border border-[#E9EAF2] shadow-card-subtle hover:shadow-card-hover hover:border-[#93C5FD] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
      pastelLavender:
        'bg-gradient-to-br from-white via-white to-[#F5F3FF] rounded-2xl border border-[#DDD6FE] shadow-card-subtle',
      pastelBlue:
        'bg-gradient-to-br from-white via-white to-[#EFF6FF] rounded-2xl border border-[#BFDBFE] shadow-card-subtle',
      pastelMint:
        'bg-gradient-to-br from-white via-white to-[#F0FDF4] rounded-2xl border border-[#BBF7D0] shadow-card-subtle',
      pastelPeach:
        'bg-gradient-to-br from-white via-white to-[#FFF7ED] rounded-2xl border border-[#FED7AA] shadow-card-subtle',
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
    className={cn('text-base font-semibold leading-tight text-[#25263A] tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs text-[#777B91] leading-relaxed', className)} {...props} />
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
