import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { AuditLogRecord, AuditActionType } from '../types';

const AUDIT_STORAGE_KEY = 'hackathon_portal_audit_logs_v2';

export class AuditService {
  /**
   * Log an administrative action
   */
  public static async logAction(entry: {
    action: AuditActionType;
    adminId: string;
    target?: string;
    teamId?: string;
    teamName?: string;
    oldProblemId?: string;
    reason?: string;
    details?: string;
  }): Promise<AuditLogRecord> {
    const timestamp = new Date().toISOString();
    const id = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const record: AuditLogRecord = {
      id,
      action: entry.action,
      adminId: entry.adminId || 'admin',
      timestamp,
      target: entry.target,
      teamId: entry.teamId,
      teamName: entry.teamName,
      oldProblemId: entry.oldProblemId,
      reason: entry.reason,
      details: entry.details,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'auditLogs', id), record);
      } catch (err) {
        console.warn('[AuditService] Firestore write failed:', err);
      }
    }

    const current = this.getLocalLogs();
    this.saveLocalLogs([record, ...current]);

    return record;
  }

  /**
   * Get all audit logs in reverse chronological order
   */
  public static async getAllLogs(): Promise<AuditLogRecord[]> {
    if (isFirebaseConfigured && db) {
      try {
        const refCol = collection(db, 'auditLogs');
        const q = query(refCol, orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list: AuditLogRecord[] = [];
          snap.forEach((d) => list.push(d.data() as AuditLogRecord));
          this.saveLocalLogs(list);
          return list;
        }
      } catch (err) {
        console.warn('[AuditService] Firestore get error, using local:', err);
      }
    }

    return this.getLocalLogs();
  }

  private static getLocalLogs(): AuditLogRecord[] {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  }

  private static saveLocalLogs(logs: AuditLogRecord[]): void {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, 200)));
    } catch {
      // ignore
    }
  }
}
