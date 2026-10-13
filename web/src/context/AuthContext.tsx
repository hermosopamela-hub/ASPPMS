import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api, onSessionProblem } from '../lib/api';
import { dbService } from '../services/db';

export type Permission =
  | 'VIEW_DASHBOARD'
  | 'MANAGE_SUPPLIERS'
  | 'VIEW_SUPPLIERS'
  | 'MANAGE_MATERIALS'
  | 'VIEW_MATERIALS'
  | 'MANAGE_PURCHASES'
  | 'VIEW_PURCHASES'
  | 'IMPORT_DATA'
  | 'MANAGE_ALERTS'
  | 'VIEW_REPORTS'
  | 'EXPORT_REPORTS'
  | 'MANAGE_SETTINGS'
  | 'VIEW_AUDIT_LOGS'
  | 'MANAGE_USERS';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  PURCHASING_MANAGER: [
    'VIEW_DASHBOARD',
    'VIEW_SUPPLIERS',
    'VIEW_MATERIALS',
    'VIEW_PURCHASES',
    'VIEW_REPORTS',
    'EXPORT_REPORTS',
    'MANAGE_ALERTS',
    'MANAGE_SETTINGS',
    'VIEW_AUDIT_LOGS',
  ],
  PURCHASING_ASSISTANT_MANAGER: [
    'VIEW_DASHBOARD',
    'VIEW_SUPPLIERS',
    'VIEW_MATERIALS',
    'VIEW_PURCHASES',
    'VIEW_REPORTS',
    'EXPORT_REPORTS',
    'MANAGE_ALERTS',
    'VIEW_AUDIT_LOGS',
  ],
  PURCHASING_ANALYST: [
    'VIEW_DASHBOARD',
    'VIEW_SUPPLIERS',
    'MANAGE_SUPPLIERS',
    'VIEW_MATERIALS',
    'MANAGE_MATERIALS',
    'VIEW_PURCHASES',
    'MANAGE_PURCHASES',
    'IMPORT_DATA',
    'VIEW_REPORTS',
    'EXPORT_REPORTS',
    'MANAGE_ALERTS',
  ],
  ADMIN: [
    'VIEW_DASHBOARD',
    'VIEW_SUPPLIERS',
    'MANAGE_SUPPLIERS',
    'VIEW_MATERIALS',
    'MANAGE_MATERIALS',
    'VIEW_PURCHASES',
    'MANAGE_PURCHASES',
    'IMPORT_DATA',
    'MANAGE_ALERTS',
    'VIEW_REPORTS',
    'EXPORT_REPORTS',
    'MANAGE_SETTINGS',
    'VIEW_AUDIT_LOGS',
    'MANAGE_USERS',
  ],
};

export interface PasswordRules {
  minLength: number;
  easyWords: string[];
}

interface SessionAnswer {
  user: User & { mustChange?: boolean };
  permissions: Permission[];
  rules?: PasswordRules;
}

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  /** true until the first check for an existing session has finished */
  loading: boolean;
  /** true when the person must choose a new password before anything else */
  mustChangePassword: boolean;
  passwordRules: PasswordRules | null;
  /** Returns an error message, or null when signed in. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  /** Returns an error message, or null when the password was changed. */
  changePassword: (current: string, next: string) => Promise<string | null>;
  hasPermission: (permission: Permission) => boolean;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [passwordRules, setPasswordRules] = useState<PasswordRules | null>(null);
  const [loading, setLoading] = useState(true);

  const signedOut = useCallback(() => {
    dbService.clear();
    setCurrentUser(null);
    setPermissions([]);
    setMustChangePassword(false);
  }, []);

  // Takes the server's answer about a session; loads the data unless a password change comes first.
  const start = useCallback(async (answer: SessionAnswer) => {
    // the data is in place before the app shows, so no page ever renders without it
    if (!answer.user.mustChange) await dbService.load();
    setCurrentUser(answer.user);
    setPermissions(answer.permissions);
    setMustChangePassword(!!answer.user.mustChange);
    if (answer.rules) setPasswordRules(answer.rules);
  }, []);

  // A call that finds the session gone sends the person back to the sign-in page.
  useEffect(() => {
    onSessionProblem((reason) => {
      if (reason === 'ended') signedOut();
      else setMustChangePassword(true);
    });
    return () => onSessionProblem(null);
  }, [signedOut]);

  // Is there already a session (a page reload)?
  useEffect(() => {
    api<SessionAnswer>('GET', '/auth/me')
      .then(start)
      .catch(() => signedOut())
      .finally(() => setLoading(false));
  }, [start, signedOut]);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const answer = await api<SessionAnswer>('POST', '/auth/login', { email, password });
      // the password rules come with /auth/me; fetch them for the "choose a password" form
      if (answer.user.mustChange) {
        const me = await api<SessionAnswer>('GET', '/auth/me');
        await start(me);
      } else {
        await start(answer);
      }
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Could not sign in.';
    }
  };

  const logout = async () => {
    try {
      await api('POST', '/auth/logout');
    } finally {
      signedOut();
    }
  };

  const changePassword = async (current: string, next: string): Promise<string | null> => {
    try {
      const answer = await api<SessionAnswer>('POST', '/auth/change-password', { current, next });
      await start(answer);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Could not change the password.';
    }
  };

  const currentRole: UserRole = currentUser?.role || 'PURCHASING_MANAGER';
  const hasPermission = (permission: Permission): boolean => permissions.includes(permission);

  const switchRole = (role: UserRole) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, role });
      setPermissions(ROLE_PERMISSIONS[role] || []);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, currentRole, loading, mustChangePassword, passwordRules, login, logout, changePassword, hasPermission, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
