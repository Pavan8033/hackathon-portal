import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../services/authService';
import { TeamService } from '../services/teamService';
import type { AuthSession, TeamRecord, AdminUser, UserRole } from '../types';

interface AuthContextValue {
  session: AuthSession | null;
  role: UserRole | null;
  team: TeamRecord | null;
  admin: AdminUser | null;
  isLoading: boolean;
  setSession: (session: AuthSession | null) => void;
  loginTeam: (identifier: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (email: string, passcode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initSession = async () => {
    setIsLoading(true);
    const existing = AuthService.getCurrentSession();
    if (existing) {
      if (existing.role === 'team' && existing.team) {
        // Refresh team profile from storage/Firestore
        const latest = await TeamService.getTeamById(existing.team.teamId);
        if (latest) {
          existing.team = latest;
          setSession(existing);
        } else {
          // Team record was deleted (e.g. Session reset by admin)
          await AuthService.logout();
          setSession(null);
        }
      } else {
        setSession(existing);
      }
    } else {
      setSession(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initSession();

    const handleSessionReset = () => {
      setSession(null);
      AuthService.logout();
    };

    window.addEventListener('hackathon_portal_session_reset', handleSessionReset);
    return () => {
      window.removeEventListener('hackathon_portal_session_reset', handleSessionReset);
    };
  }, []);

  const loginTeam = async (
    identifier: string,
    password: string,
    remember: boolean = true
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await AuthService.loginTeam(identifier, password, remember);
      if (res.success && res.team) {
        const newSession: AuthSession = { role: 'team', team: res.team };
        setSession(newSession);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: res.error || 'Authentication failed' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Login encountered an error.' };
    }
  };

  const loginAdmin = async (
    email: string,
    passcode: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await AuthService.loginAdmin(email, passcode);
      if (res.success && res.session) {
        setSession(res.session);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: res.error || 'Admin authentication failed' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Login encountered an error.' };
    }
  };

  const logout = async () => {
    await AuthService.logout();
    setSession(null);
  };

  const refreshSession = async () => {
    await initSession();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        role: session?.role || null,
        team: session?.team || null,
        admin: session?.admin || null,
        isLoading,
        setSession,
        loginTeam,
        loginAdmin,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
