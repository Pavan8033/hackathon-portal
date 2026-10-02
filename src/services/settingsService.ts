import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { PortalSettings } from '../types';

const SETTINGS_STORAGE_KEY = 'hackathon_portal_settings_v2';

export const DEFAULT_SETTINGS: PortalSettings = {
  allowMultipleTeamsPerProblem: true,
  problemSelectionLimit: 2, // Default limit: 2 teams per problem statement
  isSelectionOpen: true,
  selectionDeadline: '', // e.g. "2026-10-31T23:59:59Z"
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export class SettingsService {
  /**
   * Get current portal settings
   */
  public static async getSettings(): Promise<PortalSettings> {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'settings', 'portalConfig');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const remote = snap.data() as PortalSettings;
          this.saveLocalSettings(remote);
          return remote;
        } else {
          // Initialize default in Firestore
          await setDoc(docRef, DEFAULT_SETTINGS);
          this.saveLocalSettings(DEFAULT_SETTINGS);
          return DEFAULT_SETTINGS;
        }
      } catch (err) {
        console.warn('[SettingsService] Firestore get error, using local:', err);
      }
    }

    return this.getLocalSettings();
  }

  /**
   * Update portal settings (Admin only)
   */
  public static async updateSettings(
    updates: Partial<PortalSettings>,
    adminId: string = 'admin'
  ): Promise<PortalSettings> {
    const current = await this.getSettings();
    const updated: PortalSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'settings', 'portalConfig'), updated);
      } catch (err) {
        console.warn('[SettingsService] Firestore save error:', err);
      }
    }

    this.saveLocalSettings(updated);
    return updated;
  }

  /**
   * Toggle problem selection open/closed (Section 38)
   */
  public static async toggleSelection(
    isOpen: boolean,
    adminId: string = 'admin'
  ): Promise<PortalSettings> {
    return this.updateSettings({ isSelectionOpen: isOpen }, adminId);
  }

  /**
   * Validate if problem selection is currently allowed (Section 36, 37)
   */
  public static async isSelectionAvailable(): Promise<{
    available: boolean;
    reason?: string;
    isClosed?: boolean;
    pastDeadline?: boolean;
  }> {
    const settings = await this.getSettings();

    // 1. Admin switch check
    if (!settings.isSelectionOpen) {
      return {
        available: false,
        reason: 'Problem selection is currently closed by organizers.',
        isClosed: true,
      };
    }

    // 2. Deadline check
    if (settings.selectionDeadline) {
      const deadlineDate = new Date(settings.selectionDeadline).getTime();
      const now = Date.now();
      if (!isNaN(deadlineDate) && now > deadlineDate) {
        return {
          available: false,
          reason: 'Selection deadline has passed. Selection is closed.',
          pastDeadline: true,
        };
      }
    }

    return { available: true };
  }

  /**
   * Real-time listener for portal settings (Section 31)
   */
  public static subscribeToSettings(
    callback: (settings: PortalSettings) => void
  ): () => void {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'settings', 'portalConfig');
        const unsubscribe = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as PortalSettings;
              this.saveLocalSettings(data);
              callback(data);
            } else {
              callback(this.getLocalSettings());
            }
          },
          (err) => {
            console.warn('[SettingsService] onSnapshot error:', err);
            callback(this.getLocalSettings());
          }
        );
        return unsubscribe;
      } catch {
        // fallback
      }
    }

    // Local fallback: invoke immediately
    callback(this.getLocalSettings());
    return () => {};
  }

  // -------------------------------------------------------------
  // Local storage helpers
  // -------------------------------------------------------------
  private static getLocalSettings(): PortalSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          problemSelectionLimit: Number(parsed.problemSelectionLimit) || DEFAULT_SETTINGS.problemSelectionLimit,
        };
      }
    } catch {
      // ignore
    }
    this.saveLocalSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  private static saveLocalSettings(settings: PortalSettings): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }
}
