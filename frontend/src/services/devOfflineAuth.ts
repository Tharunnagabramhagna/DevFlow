/**
 * DEVELOPMENT-ONLY OFFLINE AUTH SIMULATION
 * --------------------------------------------------------------------------
 * This module provides local simulated credential storage for offline UI tests
 * when a developer explicitly opts in during `vite dev` (`VITE_ENABLE_OFFLINE_AUTH=true`).
 *
 * SECURITY GUARANTEES:
 * - Strictly disabled in production builds (`import.meta.env.PROD`).
 * - Disabled by default even in development unless explicitly opted in.
 * - Never stores plaintext passwords (uses salted SHA-256 via SubtleCrypto).
 * - Guest Demo Mode does NOT use this module or any credential vault.
 */
import { AuthSession, AuthUser, UserRole } from '@/types';

export const DEV_CLIENT_VAULT_KEY = 'devflow_auth_client_vault';

interface DevVaultUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordSaltHex: string;
  passwordHashHex: string;
  organization?: string;
  createdAt: string;
}

export function isOfflineAuthSimulationEnabled(): boolean {
  return Boolean(
    import.meta.env.DEV &&
      import.meta.env.VITE_ENABLE_OFFLINE_AUTH === 'true'
  );
}

export function clearDevOfflineVault(): void {
  try {
    localStorage.removeItem(DEV_CLIENT_VAULT_KEY);
  } catch {
    // Ignore storage access errors
  }
}

async function hashSaltedPasswordSha256(
  password: string,
  saltHex: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${saltHex}:${password}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSaltHex(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getVaultUsers(): DevVaultUser[] {
  if (!isOfflineAuthSimulationEnabled()) return [];
  try {
    const raw = localStorage.getItem(DEV_CLIENT_VAULT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore corrupted storage
  }
  return [];
}

function saveVaultUser(vaultUser: DevVaultUser): void {
  if (!isOfflineAuthSimulationEnabled()) return;
  try {
    const users = getVaultUsers().filter(
      (u) => u.email.toLowerCase() !== vaultUser.email.toLowerCase()
    );
    users.push(vaultUser);
    localStorage.setItem(DEV_CLIENT_VAULT_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage quota errors
  }
}

export async function devOfflineRegister(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organization?: string;
}): Promise<AuthSession> {
  if (!isOfflineAuthSimulationEnabled()) {
    throw new Error('Offline authentication simulation is disabled.');
  }

  const emailLower = data.email.toLowerCase().trim();
  const existing = getVaultUsers().find(
    (u) => u.email.toLowerCase() === emailLower
  );
  if (existing) {
    throw new Error('A user with this email address already exists. Please log in.');
  }

  const passwordSaltHex = generateSaltHex();
  const passwordHashHex = await hashSaltedPasswordSha256(data.password, passwordSaltHex);

  const vaultUser: DevVaultUser = {
    id: `dev_usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: emailLower,
    name: data.name.trim(),
    role: data.role,
    passwordSaltHex,
    passwordHashHex,
    organization: data.organization,
    createdAt: new Date().toISOString(),
  };
  saveVaultUser(vaultUser);

  const user: AuthUser = {
    id: vaultUser.id,
    email: vaultUser.email,
    name: vaultUser.name,
    role: vaultUser.role,
    organization: vaultUser.organization,
    createdAt: vaultUser.createdAt,
  };

  return {
    user,
    accessToken: `simulated_token_${vaultUser.id}`,
  };
}

export async function devOfflineLogin(credentials: {
  email: string;
  password: string;
  selectedRole: UserRole;
}): Promise<AuthSession> {
  if (!isOfflineAuthSimulationEnabled()) {
    throw new Error('Offline authentication simulation is disabled.');
  }

  const emailLower = credentials.email.toLowerCase().trim();
  const vaultUser = getVaultUsers().find(
    (u) => u.email.toLowerCase() === emailLower
  );
  if (!vaultUser) {
    throw new Error('Invalid email or password.');
  }

  const inputHash = await hashSaltedPasswordSha256(
    credentials.password,
    vaultUser.passwordSaltHex
  );
  if (inputHash !== vaultUser.passwordHashHex) {
    throw new Error('Invalid email or password.');
  }

  if (vaultUser.role !== credentials.selectedRole) {
    const expectedLabel = vaultUser.role === 'CLIENT' ? 'Client' : 'Developer';
    throw new Error(
      `Role mismatch: This account is registered as a ${expectedLabel}. Please select the ${expectedLabel} role option to log in.`
    );
  }

  const user: AuthUser = {
    id: vaultUser.id,
    email: vaultUser.email,
    name: vaultUser.name,
    role: vaultUser.role,
    organization: vaultUser.organization,
    createdAt: vaultUser.createdAt,
  };

  return {
    user,
    accessToken: `simulated_token_${vaultUser.id}`,
  };
}

export async function devOfflineMockSocialAuth(params: {
  email: string;
  name: string;
  role: UserRole;
}): Promise<AuthSession> {
  if (!isOfflineAuthSimulationEnabled()) {
    throw new Error('Offline social authentication simulation is disabled.');
  }

  const emailLower = params.email.toLowerCase().trim();
  const existing = getVaultUsers().find(
    (u) => u.email.toLowerCase() === emailLower
  );
  if (existing) {
    if (existing.role !== params.role) {
      const expectedLabel = existing.role === 'CLIENT' ? 'Client' : 'Developer';
      throw new Error(
        `Role mismatch: This account is registered as a ${expectedLabel}. Please select the ${expectedLabel} role option to log in.`
      );
    }
    return {
      user: {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        organization: existing.organization,
        createdAt: existing.createdAt,
      },
      accessToken: `simulated_token_${existing.id}`,
    };
  }

  const passwordSaltHex = generateSaltHex();
  const passwordHashHex = await hashSaltedPasswordSha256(
    generateSaltHex(),
    passwordSaltHex
  );
  const newVaultUser: DevVaultUser = {
    id: `dev_usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: emailLower,
    name: params.name.trim(),
    role: params.role,
    passwordSaltHex,
    passwordHashHex,
    createdAt: new Date().toISOString(),
  };
  saveVaultUser(newVaultUser);

  return {
    user: {
      id: newVaultUser.id,
      email: newVaultUser.email,
      name: newVaultUser.name,
      role: newVaultUser.role,
      createdAt: newVaultUser.createdAt,
    },
    accessToken: `simulated_token_${newVaultUser.id}`,
  };
}

