import React from 'react';
import { ArrowLeft, BriefcaseBusiness, Code2 } from 'lucide-react';
import { EffectiveRole } from '@/types';

export interface AuthStepHeaderProps {
  role: EffectiveRole;
  title: string;
  subtitle: string;
  onChangeRole: () => void;
}

/**
 * Shared Step-2 authentication header displaying the Change Role back button,
 * page title, role badge pill (blue Client / purple Developer), and description.
 */
export const AuthStepHeader: React.FC<AuthStepHeaderProps> = ({
  role,
  title,
  subtitle,
  onChangeRole,
}) => {
  const isClient = role === 'CLIENT';

  return (
    <div>
      <button
        type="button"
        onClick={onChangeRole}
        className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-3 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Change Role</span>
      </button>

      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h1>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${
            isClient
              ? 'bg-blue-50 dark:bg-blue-950/75 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/35'
              : 'bg-purple-50 dark:bg-purple-950/75 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/35'
          }`}
        >
          {isClient ? (
            <BriefcaseBusiness className="w-3.5 h-3.5" />
          ) : (
            <Code2 className="w-3.5 h-3.5" />
          )}
          <span>{isClient ? 'Client' : 'Developer'}</span>
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">{subtitle}</p>
    </div>
  );
};

export default AuthStepHeader;

