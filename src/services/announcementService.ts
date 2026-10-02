import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { AnnouncementRecord, AnnouncementInput, AnnouncementStatus } from '../types';

const ANNOUNCEMENTS_STORAGE_KEY = 'hackathon_portal_announcements_v2';

export class AnnouncementService {
  /**
   * Get all announcements
   * If forParticipant is true: only returns PUBLISHED announcements where publishDate <= now
   * and (expiryDate is unset or expiryDate > now).
   */
  public static async getAllAnnouncements(options: { forParticipant?: boolean } = {}): Promise<AnnouncementRecord[]> {
    let all: AnnouncementRecord[] = [];

    if (isFirebaseConfigured && db) {
      try {
        const refCol = collection(db, 'announcements');
        const q = query(refCol, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          snapshot.forEach((d) => all.push(d.data() as AnnouncementRecord));
          this.saveLocalAnnouncements(all);
        } else {
          all = this.getLocalAnnouncements();
        }
      } catch (err) {
        console.warn('[AnnouncementService] Firestore fetch error, using local:', err);
        all = this.getLocalAnnouncements();
      }
    } else {
      all = this.getLocalAnnouncements();
    }

    if (options.forParticipant) {
      const now = new Date().getTime();
      return all
        .filter((a) => {
          if (a.status !== 'PUBLISHED') return false;
          if (a.publishDate) {
            const pTime = new Date(a.publishDate).getTime();
            if (!isNaN(pTime) && pTime > now) return false;
          }
          if (a.expiryDate) {
            const eTime = new Date(a.expiryDate).getTime();
            if (!isNaN(eTime) && eTime < now) return false;
          }
          return true;
        })
        .sort((a, b) => new Date(b.publishDate || b.createdAt).getTime() - new Date(a.publishDate || a.createdAt).getTime());
    }

    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Create an announcement
   */
  public static async createAnnouncement(
    input: AnnouncementInput,
    adminId: string = 'admin'
  ): Promise<AnnouncementRecord> {
    const timestamp = new Date().toISOString();
    const id = `ann-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newRecord: AnnouncementRecord = {
      id,
      title: input.title.trim(),
      message: input.message.trim(),
      priority: input.priority || 'NORMAL',
      publishDate: input.publishDate || timestamp,
      expiryDate: input.expiryDate || undefined,
      status: input.status || 'PUBLISHED',
      target: input.target || 'All Teams',
      createdBy: adminId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'announcements', id), newRecord);
      } catch (err) {
        console.warn('[AnnouncementService] Firestore create error:', err);
      }
    }

    const current = this.getLocalAnnouncements();
    this.saveLocalAnnouncements([newRecord, ...current]);

    return newRecord;
  }

  /**
   * Update an announcement
   */
  public static async updateAnnouncement(
    id: string,
    updates: Partial<AnnouncementInput>
  ): Promise<AnnouncementRecord> {
    const all = await this.getAllAnnouncements();
    const idx = all.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error(`Announcement "${id}" not found.`);
    }

    const timestamp = new Date().toISOString();
    const updated: AnnouncementRecord = {
      ...all[idx],
      ...updates,
      updatedAt: timestamp,
    };

    all[idx] = updated;
    this.saveLocalAnnouncements(all);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'announcements', id), {
          ...updates,
          updatedAt: timestamp,
        });
      } catch (err) {
        console.warn('[AnnouncementService] Firestore update error:', err);
      }
    }

    return updated;
  }

  /**
   * Toggle announcement status (DRAFT, PUBLISHED, ARCHIVED)
   */
  public static async updateStatus(
    id: string,
    status: AnnouncementStatus
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const all = this.getLocalAnnouncements();
    const target = all.find((a) => a.id === id);
    if (target) {
      target.status = status;
      target.updatedAt = timestamp;
      this.saveLocalAnnouncements(all);
    }

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'announcements', id), {
          status,
          updatedAt: timestamp,
        });
      } catch (err) {
        console.warn('[AnnouncementService] Firestore status update error:', err);
      }
    }
  }

  /**
   * Delete an announcement
   */
  public static async deleteAnnouncement(id: string): Promise<void> {
    const all = this.getLocalAnnouncements().filter((a) => a.id !== id);
    this.saveLocalAnnouncements(all);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
      } catch (err) {
        console.warn('[AnnouncementService] Firestore delete error:', err);
      }
    }
  }

  /**
   * Real-time subscription to announcements
   */
  public static subscribeToAnnouncements(
    callback: (announcements: AnnouncementRecord[]) => void,
    options: { forParticipant?: boolean } = {}
  ): () => void {
    if (isFirebaseConfigured && db) {
      try {
        const refCol = collection(db, 'announcements');
        const q = query(refCol, orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(
          q,
          (snap) => {
            const list: AnnouncementRecord[] = [];
            snap.forEach((d) => list.push(d.data() as AnnouncementRecord));
            this.saveLocalAnnouncements(list);

            if (options.forParticipant) {
              const now = new Date().getTime();
              const filtered = list.filter((a) => {
                if (a.status !== 'PUBLISHED') return false;
                if (a.publishDate) {
                  const pTime = new Date(a.publishDate).getTime();
                  if (!isNaN(pTime) && pTime > now) return false;
                }
                if (a.expiryDate) {
                  const eTime = new Date(a.expiryDate).getTime();
                  if (!isNaN(eTime) && eTime < now) return false;
                }
                return true;
              });
              callback(filtered);
            } else {
              callback(list);
            }
          },
          (err) => {
            console.warn('[AnnouncementService] Subscription error:', err);
            this.getAllAnnouncements(options).then(callback);
          }
        );
        return unsub;
      } catch {
        // fallback
      }
    }

    this.getAllAnnouncements(options).then(callback);
    return () => {};
  }

  // -------------------------------------------------------------
  // Local storage helpers (NO FAKE / SEED FALLBACKS)
  // -------------------------------------------------------------
  private static getLocalAnnouncements(): AnnouncementRecord[] {
    try {
      const stored = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  }

  private static saveLocalAnnouncements(items: AnnouncementRecord[]): void {
    try {
      localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }
}
