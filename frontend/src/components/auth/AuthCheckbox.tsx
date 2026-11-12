import React from 'react';
import { Check } from 'lucide-react';

export interface AuthCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hasError?: boolean;
  label: React.ReactNode;
}

/**
 * Accessible dark-mode-safe checkbox control matching the SaaS dark navy
 * authentication UI references.
 */
export const AuthCheckbox: React.FC<AuthCheckboxProps> = ({
  id,
  checked,
  onChange,
  hasError = false,
  label,
}) => {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer select-none group">
      <span className="relative inline-flex items-center justify-center w-4 h-4 mt-0.5 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={`peer appearance-none w-4 h-4 rounded-[4px] border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 ${
            hasError
              ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/30'
              : 'border-slate-300 dark:border-[#475569] bg-white dark:bg-[#192338] group-hover:border-slate-400 dark:group-hover:border-slate-400'
          } checked:bg-[#2563EB] checked:border-[#2563EB] dark:checked:bg-[#2563EB] dark:checked:border-[#2563EB]`}
        />
        <Check className="w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 absolute transition-opacity stroke-[3]" />
      </span>
      <span className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
        {label}
      </span>
    </label>
  );
};

export default AuthCheckbox;

