import React from 'react';
import { cn } from '@/utils/cn';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/60 dark:border-white/10 backdrop-blur-xl bg-white/75 dark:bg-[#101A2D]/75 shadow-glass dark:shadow-dark-glass">
      <table ref={ref} className={cn('w-full caption-bottom text-sm font-sans tabular-nums', className)} {...props} />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('bg-slate-100/60 dark:bg-white/5 backdrop-blur-md border-b border-slate-200/70 dark:border-white/10', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('divide-y divide-slate-200/70 dark:divide-white/10 [&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors hover:bg-blue-50/50 dark:hover:bg-white/5 data-[state=selected]:bg-blue-100/40 dark:data-[state=selected]:bg-blue-600/20',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-11 px-4 text-left align-middle font-sans text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn('py-3.5 px-4 align-middle font-sans text-xs sm:text-sm text-slate-900 dark:text-slate-200 tabular-nums', className)} {...props} />
));
TableCell.displayName = 'TableCell';

export const TableEmptyState: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  colSpan?: number;
}> = ({ title, description, icon, colSpan = 5 }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-12 px-4">
      <div className="flex flex-col items-center justify-center space-y-2">
        {icon && (
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1B2A47] border border-slate-200 dark:border-[#26344B] flex items-center justify-center text-slate-500 dark:text-slate-400 mb-1">
            {icon}
          </div>
        )}
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>}
      </div>
    </td>
  </tr>
);
