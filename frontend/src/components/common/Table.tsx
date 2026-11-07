import React from 'react';
import { cn } from '@/utils/cn';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-2xl border border-[#E9EAF2] bg-white shadow-card-subtle">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('bg-[#F1F3FA] border-b border-[#E9EAF2]', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('divide-y divide-[#E9EAF2] [&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors hover:bg-[#F7F8FC] data-[state=selected]:bg-[#F1F3FA]',
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
      'h-11 px-4 text-left align-middle text-xs font-semibold text-[#777B91] uppercase tracking-wider select-none',
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
  <td ref={ref} className={cn('p-4 align-middle text-sm text-[#25263A]', className)} {...props} />
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
          <div className="w-10 h-10 rounded-full bg-[#F1F3FA] border border-[#E9EAF2] flex items-center justify-center text-[#777B91] mb-1">
            {icon}
          </div>
        )}
        <p className="text-sm font-semibold text-[#25263A]">{title}</p>
        {description && <p className="text-xs text-[#777B91] max-w-sm">{description}</p>}
      </div>
    </td>
  </tr>
);
