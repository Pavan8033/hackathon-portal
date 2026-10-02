import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { TeamService } from './teamService';
import type { AuthSession, TeamRecord, AdminUser } from '../types';

const SESSION_KEY = 'hackathon_portal_auth_session_v2';

export class AuthService {
  /**
   * Authenticate Admin User
   */
  public static async loginAdmin(
    email: string,
    passcode: string
  ): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const globalProcess = typeof globalThis !== 'undefined' ? (globalThis as Record<string, any>).process : undefined;
    const env =
      typeof import.meta !== 'undefined' && import.meta.env
        ? (import.meta.env as unknown as Record<string, string | undefined>)
        : (globalProcess?.env as Record<string, string | undefined>) || {};

    const defaultAdminEmail = (
      env.VITE_ADMIN_DEFAULT_EMAIL || 'admin@hackathon.org'
    ).toLowerCase();
    const defaultAdminPass =
      env.VITE_ADMIN_DEFAULT_PASSWORD || 'admin123';

    // 1. Check Firebase Auth if configured
    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          trimmedEmail,
          passcode
        );
        const adminUser: AdminUser = {
          id: userCredential.user.uid,
          email: userCredential.user.email || trimmedEmail,
          name: 'Organizer Admin',
          role: 'admin',
        };
        const session: AuthSession = { role: 'admin', admin: adminUser };
        this.saveSession(session);
        return { success: true, session };
      } catch (err: any) {
        console.warn('[AuthService] Firebase admin auth error:', err?.message);
      }
    }

    // 2. Verified admin credentials check
    if (trimmedEmail === defaultAdminEmail && passcode === defaultAdminPass) {
      const adminUser: AdminUser = {
        id: 'admin-lead-01',
        email: trimmedEmail,
        name: 'Hackathon Organizing Committee',
        role: 'admin',
      };
      const session: AuthSession = { role: 'admin', admin: adminUser };
      this.saveSession(session);
      return { success: true, session };
    }

    return {
      success: false,
      error: 'Invalid organizer credentials. Please verify your email and passcode.',
    };
  }

  /**
   * Register first/primary admin account via Firebase Authentication (Step 9 #62)
   */
  public static async registerFirstAdmin(
    email: string,
    passcode: string,
    name: string = 'Hackathon Administrator'
  ): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !passcode || passcode.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (isFirebaseConfigured && auth) {
      try {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, passcode);
        const adminUser: AdminUser = {
          id: userCredential.user.uid,
          email: userCredential.user.email || trimmedEmail,
          name,
          role: 'admin',
        };

        if (db) {
          const { setDoc, doc } = await import('firebase/firestore');
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: trimmedEmail,
            name,
            role: 'admin',
            createdAt: new Date().toISOString(),
          });
        }

        const session: AuthSession = { role: 'admin', admin: adminUser };
        this.saveSession(session);
        return { success: true, session };
      } catch (err: any) {
        console.warn('[AuthService] Firebase register admin error:', err);
        return { success: false, error: err.message || 'Failed to create admin in Firebase Authentication.' };
      }
    }

    // Local fallback if Firebase not connected
    const adminUser: AdminUser = {
      id: `admin-${Date.now()}`,
      email: trimmedEmail,
      name,
      role: 'admin',
    };
    const session: AuthSession = { role: 'admin', admin: adminUser };
    this.saveSession(session);
    return { success: true, session };
  }

  /**
   * Authenticate Participant Team using Team ID (Username) & Password
   */
  public static async loginTeam(
    identifier: string,
    password: string,
    remember: boolean = true
  ): Promise<{ success: boolean; team?: TeamRecord; error?: string }> {
    const result = await TeamService.authenticateTeam(identifier, password);

    if (!result.success || !result.team) {
      return result;
    }

    const session: AuthSession = {
      role: 'team',
      team: result.team,
    };

    this.saveSession(session, remember);
    return { success: true, team: result.team };
  }

  /**
   * Get active session
   */
  public static getCurrentSession(): AuthSession | null {
    try {
      const item =
        localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (item) {
        return JSON.parse(item);
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Terminate session
   */
  public static async logout(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  /**
   * Save session
   */
  private static saveSession(session: AuthSession, persistent: boolean = true): void {
    const json = JSON.stringify(session);
    if (persistent) {
      localStorage.setItem(SESSION_KEY, json);
    } else {
      sessionStorage.setItem(SESSION_KEY, json);
    }
  }
}
