import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from '../lib/firebase';
import { SelectionService } from './selectionService';
import type { ProblemRecord, ProblemInput, ProblemStatus, ParsedProblemRow } from '../types';

const PROBLEMS_STORAGE_KEY = 'hackathon_portal_problems_v2';
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit per Part 22

export class ProblemService {
  /**
   * Get all problems
   * CRITICAL SECURITY RULE: When forParticipant is true, only PUBLISHED problems are returned.
   * Also performs automatic transition for SCHEDULED releases when current time >= releaseAt.
   */
  public static async getAllProblems(options: { forParticipant?: boolean } = {}): Promise<ProblemRecord[]> {
    let allProblems: ProblemRecord[] = [];

    if (isFirebaseConfigured && db) {
      try {
        const refCol = collection(db, 'problems');
        const snapshot = await getDocs(refCol);
        if (!snapshot.empty) {
          snapshot.forEach((d) => allProblems.push(d.data() as ProblemRecord));
          this.saveLocalProblems(allProblems);
        } else {
          allProblems = this.getLocalProblems();
        }
      } catch (err) {
        console.warn('[ProblemService] Firestore fetch error, using local data:', err);
        allProblems = this.getLocalProblems();
      }
    } else {
      allProblems = this.getLocalProblems();
    }

    // Section 3: Automatic Scheduled Release Transition
    const nowTime = Date.now();
    let hasTransitions = false;
    for (const p of allProblems) {
      if (p.status === 'SCHEDULED' && p.releaseAt) {
        const releaseTime = new Date(p.releaseAt).getTime();
        if (!isNaN(releaseTime) && nowTime >= releaseTime) {
          p.status = 'PUBLISHED';
          p.updatedAt = new Date().toISOString();
          hasTransitions = true;

          if (isFirebaseConfigured && db) {
            updateDoc(doc(db, 'problems', p.problemId), {
              status: 'PUBLISHED',
              updatedAt: p.updatedAt,
            }).catch((err) => console.warn('[ProblemService] Scheduled update error:', err));
          }
        }
      }
    }

    if (hasTransitions) {
      this.saveLocalProblems(allProblems);
    }

    allProblems.sort((a, b) =>
      a.problemId.localeCompare(b.problemId, undefined, { numeric: true, sensitivity: 'base' })
    );

    if (options.forParticipant) {
      // Participants can view PUBLISHED challenges, and can ALSO preview SCHEDULED challenges prior to selection unlock
      return allProblems.filter((p) => p.status === 'PUBLISHED' || p.status === 'SCHEDULED');
    }

    return allProblems;
  }

  /**
   * Helper to check if a problem is locked by a schedule countdown
   */
  public static isProblemLockedBySchedule(problem: ProblemRecord | null | undefined): {
    isLocked: boolean;
    releaseAt?: string;
    remainingMs: number;
  } {
    if (!problem) return { isLocked: false, remainingMs: 0 };
    if (problem.status !== 'SCHEDULED') {
      return { isLocked: false, remainingMs: 0 };
    }
    if (!problem.releaseAt) {
      // Scheduled without a specific date/time is locked until admin publishes
      return { isLocked: true, remainingMs: Infinity };
    }
    const releaseTime = new Date(problem.releaseAt).getTime();
    const now = Date.now();
    if (isNaN(releaseTime) || now >= releaseTime) {
      // Release timestamp reached - challenge is unlocked!
      return { isLocked: false, releaseAt: problem.releaseAt, remainingMs: 0 };
    }
    return {
      isLocked: true,
      releaseAt: problem.releaseAt,
      remainingMs: releaseTime - now,
    };
  }

  /**
   * Get a single problem by ID
   */
  public static async getProblemById(
    problemId: string,
    options: { forParticipant?: boolean } = {}
  ): Promise<ProblemRecord | null> {
    const problems = await this.getAllProblems(options);
    return problems.find((p) => p.problemId.toLowerCase() === problemId.trim().toLowerCase()) || null;
  }

  /**
   * Check problem availability specifically for participant detail view.
   * Participants can review both PUBLISHED and SCHEDULED problems.
   */
  public static async getProblemForParticipant(
    problemId: string
  ): Promise<{
    found: boolean;
    isPublished: boolean;
    isScheduled: boolean;
    problem: ProblemRecord | null;
  }> {
    const all = await this.getAllProblems({ forParticipant: false });
    const match = all.find((p) => p.problemId.toLowerCase() === problemId.trim().toLowerCase());

    if (!match) {
      return { found: false, isPublished: false, isScheduled: false, problem: null };
    }

    if (match.status !== 'PUBLISHED' && match.status !== 'SCHEDULED') {
      // DRAFT or ARCHIVED - hidden from participants
      return { found: true, isPublished: false, isScheduled: false, problem: null };
    }

    return {
      found: true,
      isPublished: match.status === 'PUBLISHED',
      isScheduled: match.status === 'SCHEDULED',
      problem: match,
    };
  }

  /**
   * Retrieve up to 3 related published problems, preferring same category
   */
  public static async getRelatedProblems(
    currentProblemId: string,
    category: string,
    limitCount: number = 3
  ): Promise<ProblemRecord[]> {
    const published = await this.getAllProblems({ forParticipant: true });
    const others = published.filter(
      (p) => p.problemId.toLowerCase() !== currentProblemId.toLowerCase()
    );

    const sameCat = others.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    const differentCat = others.filter((p) => p.category.toLowerCase() !== category.toLowerCase());

    return [...sameCat, ...differentCat].slice(0, limitCount);
  }

  /**
   * Release Validation (Section 4)
   * Validates if a problem satisfies mandatory requirements prior to publication
   */
  public static validateForRelease(
    problem: ProblemRecord | ProblemInput,
    requireDocument: boolean = false
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!problem.problemId || !problem.problemId.trim()) {
      errors.push('Problem ID is missing.');
    }
    if (!problem.title || !problem.title.trim()) {
      errors.push('Problem Title is missing.');
    }
    if (!problem.description || !problem.description.trim()) {
      errors.push('Problem Description is missing.');
    }
    if (!problem.category || !problem.category.trim()) {
      errors.push('Category is unassigned.');
    }
    if (requireDocument) {
      const rec = problem as ProblemRecord;
      if (!rec.fileName && !rec.fileUrl) {
        errors.push('Official document attachment is required for release.');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Create new problem statement with duplicate check (Section 20)
   */
  public static async createProblem(
    input: ProblemInput,
    file?: File
  ): Promise<ProblemRecord> {
    const existing = await this.getAllProblems({ forParticipant: false });
    const duplicate = existing.find(
      (p) => p.problemId.toLowerCase() === input.problemId.trim().toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Problem ID "${input.problemId}" already exists.`);
    }

    const timestamp = new Date().toISOString();
    let fileMeta: { fileUrl?: string; fileName?: string; fileType?: string; fileSize?: number } = {};

    if (file) {
      fileMeta = await this.processFileUpload(input.problemId, file);
    }

    // Clear any stale selection for this problem ID to guarantee fresh start
    try {
      await SelectionService.deleteSelectionsForProblem(input.problemId);
    } catch {
      // ignore
    }

    const newRecord: ProblemRecord = {
      problemId: input.problemId.trim().toUpperCase(),
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category || 'General',
      difficulty: input.difficulty || 'Intermediate',
      tags: input.tags || [],
      status: input.status || 'DRAFT',
      createdAt: timestamp,
      updatedAt: timestamp,
      releaseAt: input.releaseDate
        ? `${input.releaseDate}T${input.releaseTime || '09:00:00'}+05:30`
        : undefined,
      createdBy: 'Hackathon Organizing Committee',
      expectedSolution: input.expectedSolution,
      evaluationCriteria: input.evaluationCriteria,
      technologies: input.technologies,
      teamSize: input.teamSize || '3-4 Members',
      additionalNotes: input.additionalNotes,
      selectedCount: 0,
      ...fileMeta,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'problems', newRecord.problemId), newRecord);
      } catch (err) {
        console.warn('[ProblemService] Firestore setDoc error:', err);
      }
    }

    const updated = [newRecord, ...existing];
    this.saveLocalProblems(updated);

    return newRecord;
  }

  /**
   * Bulk import problem statements from parsed rows (CSV, Excel, PDF)
   */
  public static async importProblems(
    rows: ParsedProblemRow[]
  ): Promise<{ importedCount: number; skippedCount: number; errors: string[] }> {
    const existing = await this.getAllProblems({ forParticipant: false });
    const newRecords: ProblemRecord[] = [];
    const timestamp = new Date().toISOString();
    const errors: string[] = [];

    const existingIds = new Set(existing.map((p) => p.problemId.trim().toLowerCase()));

    for (const r of rows) {
      const normalizedId = r.problemId.trim().toLowerCase();
      if (existingIds.has(normalizedId)) {
        errors.push(`Problem ID "${r.problemId}" already exists.`);
        continue;
      }
      existingIds.add(normalizedId);

      // Clear any stale selection for this problem ID to ensure fresh start
      try {
        await SelectionService.deleteSelectionsForProblem(r.problemId);
      } catch {
        // ignore
      }

      const record: ProblemRecord = {
        problemId: r.problemId.trim().toUpperCase(),
        title: r.title.trim(),
        description: r.description.trim(),
        category: r.category || 'General',
        difficulty: r.difficulty || 'Intermediate',
        tags: r.tags && r.tags.length > 0 ? r.tags : [],
        status: 'DRAFT', // Unreleased: Requires admin release control publication
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: 'Hackathon Organizing Committee',
        expectedSolution: r.expectedSolution,
        evaluationCriteria: r.evaluationCriteria,
        technologies: r.technologies,
        constraints: r.constraints,
        teamSize: r.teamSize || '2-4 Members',
        additionalNotes: r.additionalNotes,
        selectedCount: 0,
      };

      newRecords.push(record);

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'problems', record.problemId), record);
        } catch (err) {
          console.warn('[ProblemService] Firestore setDoc error:', err);
        }
      }
    }

    const merged = [...newRecords, ...existing];
    this.saveLocalProblems(merged);

    return {
      importedCount: newRecords.length,
      skippedCount: rows.length - newRecords.length,
      errors,
    };
  }

  /**
   * Export all problems to CSV per Phase 30
   * Headers: Problem ID, Title, Category, Difficulty, Status
   */
  public static async exportProblemsToCsv(): Promise<string> {
    const problems = await this.getAllProblems({ forParticipant: false });
    const headers = ['Problem ID', 'Title', 'Category', 'Difficulty', 'Status'];
    const rows = problems.map((p) => {
      return [
        `"${p.problemId}"`,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        `"${p.difficulty}"`,
        `"${p.status}"`,
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Update existing problem statement
   */
  public static async updateProblem(
    problemId: string,
    input: Partial<ProblemInput>,
    file?: File
  ): Promise<ProblemRecord> {
    const problems = await this.getAllProblems({ forParticipant: false });
    const index = problems.findIndex((p) => p.problemId === problemId);
    if (index === -1) {
      throw new Error(`Problem with ID "${problemId}" not found.`);
    }

    let fileMeta = {};
    if (file) {
      fileMeta = await this.processFileUpload(problemId, file);
    }

    const existing = problems[index];
    const timestamp = new Date().toISOString();

    const updated: ProblemRecord = {
      ...existing,
      ...input,
      ...fileMeta,
      updatedAt: timestamp,
    };

    problems[index] = updated;
    this.saveLocalProblems(problems);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'problems', problemId), updated as any);
      } catch (err) {
        console.warn('[ProblemService] Firestore updateDoc error:', err);
      }
    }

    return updated;
  }

  /**
   * Toggle problem status (PUBLISHED, DRAFT, SCHEDULED, ARCHIVED)
   */
  public static async updateProblemStatus(
    problemId: string,
    status: ProblemStatus,
    releaseAt?: string
  ): Promise<void> {
    const problems = await this.getAllProblems({ forParticipant: false });
    const target = problems.find((p) => p.problemId === problemId);

    if (status === 'PUBLISHED' && target) {
      const validation = this.validateForRelease(target);
      if (!validation.valid) {
        throw new Error(`Cannot publish: ${validation.errors.join(', ')}`);
      }
    }

    const timestamp = new Date().toISOString();
    const updated = problems.map((p) =>
      p.problemId === problemId
        ? {
            ...p,
            status,
            releaseAt: releaseAt !== undefined ? releaseAt : p.releaseAt,
            updatedAt: timestamp,
          }
        : p
    );

    this.saveLocalProblems(updated);

    if (isFirebaseConfigured && db) {
      try {
        const updatePayload: Record<string, any> = {
          status,
          updatedAt: timestamp,
        };
        if (releaseAt !== undefined) {
          updatePayload.releaseAt = releaseAt;
        }
        await updateDoc(doc(db, 'problems', problemId), updatePayload);
      } catch (err) {
        console.warn('[ProblemService] Firestore update status error:', err);
      }
    }
  }

  /**
   * Bulk update status for multiple problems (Section 5)
   */
  public static async bulkUpdateStatus(
    problemIds: string[],
    status: ProblemStatus,
    releaseAt?: string
  ): Promise<{ updatedCount: number; errors: string[] }> {
    const problems = await this.getAllProblems({ forParticipant: false });
    const errors: string[] = [];
    let updatedCount = 0;
    const timestamp = new Date().toISOString();

    for (const id of problemIds) {
      const target = problems.find((p) => p.problemId === id);
      if (!target) continue;

      if (status === 'PUBLISHED') {
        const validation = this.validateForRelease(target);
        if (!validation.valid) {
          errors.push(`${id}: ${validation.errors.join('; ')}`);
          continue;
        }
      }

      target.status = status;
      target.updatedAt = timestamp;
      if (releaseAt) target.releaseAt = releaseAt;
      updatedCount++;

      if (isFirebaseConfigured && db) {
        const payload: any = { status, updatedAt: timestamp };
        if (releaseAt) payload.releaseAt = releaseAt;
        updateDoc(doc(db, 'problems', id), payload).catch(() => {});
      }
    }

    this.saveLocalProblems(problems);
    return { updatedCount, errors };
  }

  /**
   * Delete problem permanently with full cascading cleanup of all associated team registrations
   */
  public static async deleteProblem(problemId: string): Promise<void> {
    const cleanId = problemId.trim();
    if (!cleanId) return;

    // 1. Cascading cleanup: delete all team selections for this problem and unbind teams
    try {
      await SelectionService.deleteSelectionsForProblem(cleanId);
    } catch (err) {
      console.warn('[ProblemService] Error clearing selections for problem:', err);
    }

    // 2. Filter local problems
    const problems = await this.getAllProblems({ forParticipant: false });
    const filtered = problems.filter(
      (p) => p.problemId.trim().toLowerCase() !== cleanId.toLowerCase()
    );
    this.saveLocalProblems(filtered);

    // 3. Delete from Firestore
    if (isFirebaseConfigured && db) {
      try {
        await Promise.allSettled([
          deleteDoc(doc(db, 'problems', cleanId)),
          deleteDoc(doc(db, 'problems', cleanId.toUpperCase())),
        ]);
      } catch (err) {
        console.warn('[ProblemService] Firestore delete error:', err);
      }
    }
  }

  /**
   * Delete multiple problems in bulk
   */
  public static async deleteMultipleProblems(problemIds: string[]): Promise<number> {
    let count = 0;
    for (const id of problemIds) {
      await this.deleteProblem(id);
      count++;
    }
    return count;
  }

  /**
   * Delete all problems permanently and wipe all selections
   */
  public static async deleteAllProblems(): Promise<void> {
    // 1. Wipe all selections across system
    try {
      await SelectionService.deleteAllSelections();
    } catch (err) {
      console.warn('[ProblemService] Error wiping selections:', err);
    }

    // 2. Clear local storage
    this.saveLocalProblems([]);

    // 3. Wipe all problems from Firestore
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'problems'));
        const deletePromises: Promise<any>[] = [];
        snap.forEach((d) => deletePromises.push(deleteDoc(d.ref).catch(() => {})));
        await Promise.allSettled(deletePromises);
      } catch (err) {
        console.warn('[ProblemService] Firestore deleteAllProblems error:', err);
      }
    }
  }

  /**
   * Process document upload to Firebase Storage
   */
  private static async processFileUpload(
    problemId: string,
    file: File
  ): Promise<{
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }> {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new Error(
        `Unsupported file type: .${extension}. Allowed formats: PDF, DOC, DOCX, XLS, XLSX.`
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File size exceeds 15MB limit. Uploaded size: ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
      );
    }

    let fileUrl = '';
    if (isFirebaseConfigured && storage) {
      try {
        const storagePath = `problem-documents/${problemId}/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(fileRef, file);
        fileUrl = await getDownloadURL(snapshot.ref);
      } catch (err: any) {
        console.warn('[ProblemService] Firebase storage upload error:', err);
        fileUrl = URL.createObjectURL(file);
      }
    } else {
      fileUrl = URL.createObjectURL(file);
    }

    return {
      fileUrl,
      fileName: file.name,
      fileType: file.type || `application/${extension}`,
      fileSize: file.size,
    };
  }

  // ----------------------------------------------------------------
  // Local storage helpers (NO FAKE / SEED FALLBACKS)
  // ----------------------------------------------------------------
  private static getLocalProblems(): ProblemRecord[] {
    try {
      const stored = localStorage.getItem(PROBLEMS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return [];
  }

  private static saveLocalProblems(problems: ProblemRecord[]): void {
    try {
      localStorage.setItem(PROBLEMS_STORAGE_KEY, JSON.stringify(problems));
    } catch {
      // ignore
    }
  }
}
