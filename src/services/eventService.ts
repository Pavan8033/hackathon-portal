import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { EventConfig } from '../types';
import { SettingsService } from './settingsService';
import { TeamService } from './teamService';
import { ProblemService } from './problemService';
import { SelectionService } from './selectionService';

const EVENT_STORAGE_KEY = 'hackathon_portal_event_config_v2';
const EVENT_CHANGE_EVENT = 'hackathon_portal_event_changed';
const SESSION_RESET_EVENT = 'hackathon_portal_session_reset';

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  eventName: 'Hackathon 2026',
  clubName: 'Innovation & Tech Club',
  clubLogo: '',
  eventBanner: '',
  problemSelectionLimit: 2,
  edition: 'Annual National Edition',
  academicYear: '2026',
  tagline: 'Building solutions for real-world challenges.',
  description: 'Explore real-world problem statements, understand the challenges, and choose the problem your team wants to solve.',
  contactEmail: 'hackathon-portal@university.edu',
  supportHours: '9:00 AM – 8:00 PM IST',
  venue: 'Campus Innovation Center, Hall A',
  dates: 'October 15–17, 2026',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export class EventService {
  private static memoryEventConfig: EventConfig | null = null;
  private static isListeningToRemote: boolean = false;

  /**
   * Get the active event configuration
   */
  public static getEventConfig(): EventConfig {
    if (this.memoryEventConfig) {
      return this.memoryEventConfig;
    }
    try {
      const stored = localStorage.getItem(EVENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const resolved = {
          ...DEFAULT_EVENT_CONFIG,
          ...parsed,
          problemSelectionLimit: Number(parsed.problemSelectionLimit) || DEFAULT_EVENT_CONFIG.problemSelectionLimit,
        };
        this.memoryEventConfig = resolved;
        return resolved;
      }
    } catch {
      // ignore
    }
    this.memoryEventConfig = DEFAULT_EVENT_CONFIG;
    return DEFAULT_EVENT_CONFIG;
  }

  /**
   * Fetch latest event config from Firestore
   */
  public static async fetchRemoteEventConfig(): Promise<EventConfig> {
    const local = this.getEventConfig();
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'settings', 'eventConfig');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const remote = snap.data() as Partial<EventConfig>;
          const merged: EventConfig = {
            ...DEFAULT_EVENT_CONFIG,
            ...local,
            ...remote,
          };
          this.memoryEventConfig = merged;
          localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent(EVENT_CHANGE_EVENT, { detail: merged }));
          return merged;
        }
      } catch (err) {
        console.warn('[EventService] Firestore get error:', err);
      }
    }
    return local;
  }

  /**
   * Update event configuration
   */
  public static async updateEventConfig(
    updates: Partial<EventConfig>
  ): Promise<EventConfig> {
    const current = this.getEventConfig();
    const updated: EventConfig = {
      ...current,
      ...updates,
      problemSelectionLimit: updates.problemSelectionLimit !== undefined
        ? Math.max(1, Number(updates.problemSelectionLimit) || 1)
        : current.problemSelectionLimit,
      updatedAt: new Date().toISOString(),
    };

    this.memoryEventConfig = updated;

    try {
      localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_CHANGE_EVENT, { detail: updated }));
    } catch (err) {
      console.warn('[EventService] Storage error:', err);
    }

    // Persist to Firestore
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'settings', 'eventConfig');
        await setDoc(docRef, updated, { merge: true });
      } catch (err) {
        console.warn('[EventService] Firestore update error:', err);
      }
    }

    // Synchronize selection limit with portal settings
    try {
      await SettingsService.updateSettings({
        problemSelectionLimit: updated.problemSelectionLimit,
        allowMultipleTeamsPerProblem: updated.problemSelectionLimit > 1,
      });
    } catch {
      // ignore
    }

    return updated;
  }

  /**
   * Subscribe to event configuration changes across the application
   */
  public static subscribeToEvent(
    callback: (config: EventConfig) => void
  ): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<EventConfig>;
      callback(customEvent.detail || this.getEventConfig());
    };

    window.addEventListener(EVENT_CHANGE_EVENT, handler);
    window.addEventListener('storage', (e) => {
      if (e.key === EVENT_STORAGE_KEY) {
        callback(this.getEventConfig());
      }
    });

    // Remote Firestore Realtime Listener
    let unsubscribeFirestore: (() => void) | undefined;
    if (isFirebaseConfigured && db && !this.isListeningToRemote) {
      try {
        this.isListeningToRemote = true;
        const docRef = doc(db, 'settings', 'eventConfig');
        unsubscribeFirestore = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const remote = snap.data() as Partial<EventConfig>;
            const current = this.getEventConfig();
            const merged: EventConfig = {
              ...DEFAULT_EVENT_CONFIG,
              ...current,
              ...remote,
            };
            this.memoryEventConfig = merged;
            try {
              localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(merged));
            } catch {
              // ignore
            }
            callback(merged);
          }
        }, (err) => {
          console.warn('[EventService] Realtime listener error:', err);
        });
      } catch {
        // ignore
      }
    }

    // Invoke immediately
    callback(this.getEventConfig());

    return () => {
      window.removeEventListener(EVENT_CHANGE_EVENT, handler);
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }

  /**
   * Delete Session / Purge Event Data
   * "and also i admin deletes the session all the details and login credentials should disapper and should not work"
   */
  public static async deleteSession(options: {
    deleteTeams?: boolean;
    deleteSelections?: boolean;
    deleteProblems?: boolean;
    adminId?: string;
    reason?: string;
  } = {}): Promise<{ success: boolean; message: string }> {
    const {
      deleteTeams = true,
      deleteSelections = true,
      deleteProblems = false,
      adminId = 'admin',
      reason = 'Admin requested complete session deletion and data purge',
    } = options;

    const timestamp = new Date().toISOString();

    // 1. Wipe Teams & Credentials if requested
    if (deleteTeams) {
      await TeamService.deleteAllTeams();
    }

    // 2. Wipe Selections across system if requested
    if (deleteSelections) {
      await SelectionService.deleteAllSelections();
    }

    // 3. Reset or delete Problems
    if (deleteProblems) {
      await ProblemService.deleteAllProblems();
    } else {
      // Keep problem definitions, but reset selected counts
      try {
        const storedProblems = localStorage.getItem('hackathon_portal_problems_v2');
        if (storedProblems) {
          const list = JSON.parse(storedProblems);
          const resetList = list.map((p: any) => ({
            ...p,
            selectedCount: 0,
            updatedAt: timestamp,
          }));
          localStorage.setItem('hackathon_portal_problems_v2', JSON.stringify(resetList));
        }
      } catch {
        // ignore
      }
    }

    // 4. Invalidate Active Auth Sessions (All team credentials disappear and active logins are expelled immediately)
    try {
      const activeSessionRaw = localStorage.getItem('hackathon_portal_auth_session_v2');
      if (activeSessionRaw) {
        const session = JSON.parse(activeSessionRaw);
        if (session.role === 'team') {
          localStorage.removeItem('hackathon_portal_auth_session_v2');
          sessionStorage.removeItem('hackathon_portal_auth_session_v2');
        }
      }
    } catch {
      // ignore
    }

    // 5. Record Audit Action
    try {
      const auditRecord = {
        id: `audit-${Date.now()}`,
        action: 'SESSION_RESET',
        adminId,
        timestamp,
        reason,
        details: `Session purged: Teams deleted (${deleteTeams}), Selections wiped (${deleteSelections}), Problems wiped (${deleteProblems})`,
      };
      const existingAudit = localStorage.getItem('hackathon_portal_audit_logs_v2');
      const audits = existingAudit ? JSON.parse(existingAudit) : [];
      localStorage.setItem(
        'hackathon_portal_audit_logs_v2',
        JSON.stringify([auditRecord, ...audits])
      );
    } catch {
      // ignore
    }

    // 6. Broadcast session reset event to all tabs and mounted components
    window.dispatchEvent(new CustomEvent(SESSION_RESET_EVENT));

    return {
      success: true,
      message: 'Event session deleted successfully. All credentials have been revoked and data removed.',
    };
  }
}
