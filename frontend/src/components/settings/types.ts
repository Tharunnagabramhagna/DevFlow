export type SettingsTabId =
  | 'profile'
  | 'account'
  | 'security'
  | 'notifications'
  | 'integrations'
  | 'ai';

export interface ProfileData {
  fullName: string;
  email: string;
  role: string;
  organization: string;
  avatarUrl: string;
}

export interface NotificationToggles {
  email: boolean;
  milestones: boolean;
  inApp: boolean;
  githubActivity: boolean;
  aiResults: boolean;
  payments: boolean;
}

export interface InAppToggles {
  milestones: boolean;
  githubActivity: boolean;
  aiResults: boolean;
  payments: boolean;
}

export interface AccountPreferences {
  timeZone: string;
  dateFormat: string;
  currency: string;
  theme: string;
  language?: string;
}

export interface AiPreferences {
  model: string;
  approvalGitHub: boolean;
  approvalPayments: boolean;
  strictAstVerification: boolean;
  reasoningEffort?: string;
  autoDiffParsing?: boolean;
}

