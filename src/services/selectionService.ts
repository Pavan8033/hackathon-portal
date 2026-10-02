import {
  collection,
  doc,
  getDocs,
  getDoc,
  runTransaction,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { SettingsService } from './settingsService';
import { ProblemService } from './problemService';
import { TeamService } from './teamService';
import type { TeamRecord, TeamSelection, AuditLogRecord } from '../types';

const SELECTIONS_STORAGE_KEY = 'hackathon_portal_selections_v2';
const AUDIT_LOGS_STORAGE_KEY = 'hackathon_portal_audit_logs_v2';

export class SelectionService {
  /**
   * Get selection for a specific team
   */
  public static async getSelectionForTeam(teamId: string): Promise<TeamSelection | null> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDoc(doc(db, 'teamSelections', teamId));
        if (snap.exists()) {
          return snap.data() as TeamSelection;
        }
      } catch (err) {
        console.warn('[SelectionService] getDoc error, checking local:', err);
      }
    }

    const localList = this.getLocalSelections();
    return localList.find((s) => s.teamId === teamId) || null;
  }

  /**
   * Get all confirmed selections
   */
  public static async getAllSelections(): Promise<TeamSelection[]> {
    if (isFirebaseConfigured && db) {
      try {
        const refCol = collection(db, 'teamSelections');
        const snapshot = await getDocs(refCol);
        if (!snapshot.empty) {
          const list: TeamSelection[] = [];
          snapshot.forEach((d) => list.push(d.data() as TeamSelection));
          this.saveLocalSelections(list);
          return list;
        }
      } catch (err) {
        console.warn('[SelectionService] getAllSelections error, using local:', err);
      }
    }

    return this.getLocalSelections();
  }

  /**
   * ATOMIC SELECTION TRANSACTION (Sections 6, 7, 34)
   * Enforces:
   * 1. User authenticated & active team
   * 2. Problem exists and is PUBLISHED
   * 3. Selection is open and deadline not passed
   * 4. Team has not already selected a problem (NO DOUBLE SELECTION)
   * 5. If allowMultipleTeamsPerProblem is false, problem not claimed by another team
   */
  public static async executeSelectionTransaction(
    team: TeamRecord,
    problemId: string,
    authenticatedUserIdentifier: string
  ): Promise<TeamSelection> {
    // 1. Basic validation
    if (!team || !team.teamId) {
      throw new Error('Your session has expired. Please log in again.');
    }

    if (team.status !== 'active') {
      throw new Error('Your team account is inactive. Selection is not permitted.');
    }

    // 2. Settings check
    const availability = await SettingsService.isSelectionAvailable();
    if (!availability.available) {
      throw new Error(availability.reason || 'Problem selection is currently closed.');
    }

    const settings = await SettingsService.getSettings();

    // 3. Firestore Atomic Transaction when live
    if (isFirebaseConfigured && db) {
      const firestore = db;
      try {
        const selectionResult = await runTransaction(firestore, async (transaction) => {
          const teamSelectionRef = doc(firestore, 'teamSelections', team.teamId);
          const problemRef = doc(firestore, 'problems', problemId);
          const teamRef = doc(firestore, 'teams', team.teamId);

          // A. Check if team already has a selection
          const existingSelectionDoc = await transaction.get(teamSelectionRef);
          if (existingSelectionDoc.exists()) {
            throw new Error('Your team has already selected a problem.');
          }

          // B. Check problem status
          const problemDoc = await transaction.get(problemRef);
          if (!problemDoc.exists()) {
            throw new Error('The requested problem does not exist.');
          }

          const problemData = problemDoc.data();
          if (problemData.status !== 'PUBLISHED') {
            throw new Error('This problem statement is no longer available.');
          }

          // C. Problem capacity / limit check
          const maxAllowed = Number(settings.problemSelectionLimit) || (settings.allowMultipleTeamsPerProblem ? 2 : 1);
          const currentCount = problemData.selectedCount || 0;
          if (currentCount >= maxAllowed) {
            throw new Error(
              `This problem statement has reached its maximum capacity of ${maxAllowed} ${maxAllowed === 1 ? 'team' : 'teams'} and is no longer available. Thank you for your interest! Please choose another exciting challenge for your team.`
            );
          }

          // D. Create selection record (Never store credentials or sensitive tokens)
          const timestamp = new Date().toISOString();
          const newSelection: TeamSelection = {
            teamId: team.teamId,
            teamName: team.teamName,
            teamLeadName: team.teamLeadName,
            problemId: problemData.problemId,
            problemTitle: problemData.title,
            category: problemData.category,
            selectedAt: timestamp,
            selectedBy: authenticatedUserIdentifier || team.teamLeadName,
            status: 'CONFIRMED',
          };

          transaction.set(teamSelectionRef, newSelection);

          // E. Update problem counter atomically
          transaction.update(problemRef, {
            selectedCount: currentCount + 1,
            updatedAt: timestamp,
          });

          // F. Update team record atomically
          transaction.update(teamRef, {
            selectedProblemId: problemData.problemId,
            selectedProblemTitle: problemData.title,
            selectionDate: timestamp,
            updatedAt: timestamp,
          });

          return newSelection;
        });

        // Update local caches
        this.addLocalSelection(selectionResult);
        await this.syncLocalTeamAndProblem(selectionResult);
        this.recordLocalActivity({
          id: `act-${Date.now()}`,
          type: 'SELECTION',
          title: `${team.teamName} selected ${problemId}`,
          description: `Team locked into challenge "${selectionResult.problemTitle}"`,
          timestamp: new Date().toISOString(),
          teamId: team.teamId,
          teamName: team.teamName,
          problemId,
        });

        return selectionResult;
      } catch (err: any) {
        console.error('[SelectionService] Transaction failed:', err);
        // Clean error messages (Section 10)
        if (err.message && (
          err.message.includes('already selected') ||
          err.message.includes('maximum capacity') ||
          err.message.includes('no longer available') ||
          err.message.includes('closed') ||
          err.message.includes('expired')
        )) {
          throw err;
        }
        throw new Error('Something went wrong during problem confirmation. Please try again.');
      }
    }

    // 4. Resilient Local Atomic Fallback
    const existingList = this.getLocalSelections();
    if (existingList.some((s) => s.teamId === team.teamId)) {
      throw new Error('Your team has already selected a problem.');
    }

    const problem = await ProblemService.getProblemById(problemId, { forParticipant: true });
    if (!problem || problem.status !== 'PUBLISHED') {
      throw new Error('This problem is no longer available.');
    }

    // Capacity / Limit enforcement
    const maxAllowed = Number(settings.problemSelectionLimit) || (settings.allowMultipleTeamsPerProblem ? 2 : 1);
    const existingClaimsForProblem = existingList.filter((s) => s.problemId === problemId).length;
    if (existingClaimsForProblem >= maxAllowed) {
      throw new Error(
        `This problem statement has reached its maximum capacity of ${maxAllowed} ${maxAllowed === 1 ? 'team' : 'teams'} and is no longer available. Thank you for your interest! Please choose another exciting challenge for your team.`
      );
    }

    const timestamp = new Date().toISOString();
    const localSelection: TeamSelection = {
      teamId: team.teamId,
      teamName: team.teamName,
      teamLeadName: team.teamLeadName,
      problemId: problem.problemId,
      problemTitle: problem.title,
      category: problem.category,
      selectedAt: timestamp,
      selectedBy: authenticatedUserIdentifier || team.teamLeadName,
      status: 'CONFIRMED',
    };

    this.addLocalSelection(localSelection);
    await this.syncLocalTeamAndProblem(localSelection);
    this.recordLocalActivity({
      id: `act-${Date.now()}`,
      type: 'SELECTION',
      title: `${team.teamName} selected ${problemId}`,
      description: `Team locked into challenge "${problem.title}"`,
      timestamp,
      teamId: team.teamId,
      teamName: team.teamName,
      problemId,
    });

    return localSelection;
  }

  /**
   * ADMIN MANUAL PROBLEM ASSIGNMENT
   * Manually assigns or re-assigns a problem statement to a team
   */
  public static async manuallyAssignProblem(
    teamId: string,
    problemId: string,
    adminId: string = 'admin',
    options: { overrideLimit?: boolean; reason?: string } = {}
  ): Promise<TeamSelection> {
    const allTeams = await TeamService.getAllTeams();
    const team = allTeams.find((t) => t.teamId === teamId);
    if (!team) {
      throw new Error(`Team with ID "${teamId}" not found.`);
    }

    const allProblems = await ProblemService.getAllProblems({ forParticipant: false });
    const problem = allProblems.find((p) => p.problemId === problemId);
    if (!problem) {
      throw new Error(`Problem with ID "${problemId}" not found.`);
    }

    const settings = await SettingsService.getSettings();
    const maxAllowed = Number(settings.problemSelectionLimit) || (settings.allowMultipleTeamsPerProblem ? 2 : 1);
    const allSelections = await this.getAllSelections();

    // Check capacity unless explicitly overridden
    if (!options.overrideLimit) {
      const selectionsForProblem = allSelections.filter(
        (s) => s.problemId === problemId && s.teamId !== teamId
      ).length;
      if (selectionsForProblem >= maxAllowed) {
        throw new Error(
          `Problem statement "${problemId}" has reached its maximum capacity of ${maxAllowed} teams. Check "Override capacity limit" if you wish to bypass this.`
        );
      }
    }

    const oldProblemId = team.selectedProblemId;
    const timestamp = new Date().toISOString();

    const newSelection: TeamSelection = {
      teamId: team.teamId,
      teamName: team.teamName,
      teamLeadName: team.teamLeadName,
      problemId: problem.problemId,
      problemTitle: problem.title,
      category: problem.category,
      selectedAt: timestamp,
      selectedBy: `Organizer Admin (${adminId})`,
      status: 'CONFIRMED',
    };

    // Save selection
    this.addLocalSelection(newSelection);

    // If changing from old problem, decrement old problem
    if (oldProblemId && oldProblemId !== problemId) {
      const oldProb = allProblems.find((p) => p.problemId === oldProblemId);
      if (oldProb && oldProb.selectedCount) {
        oldProb.selectedCount = Math.max(0, oldProb.selectedCount - 1);
      }
    }

    // Increment new problem count if it wasn't already selected by this team
    if (oldProblemId !== problemId) {
      problem.selectedCount = (problem.selectedCount || 0) + 1;
    }
    localStorage.setItem('hackathon_portal_problems_v2', JSON.stringify(allProblems));

    // Update team
    team.selectedProblemId = problem.problemId;
    team.selectedProblemTitle = problem.title;
    team.selectionDate = timestamp;
    team.updatedAt = timestamp;
    localStorage.setItem('hackathon_portal_teams_v2', JSON.stringify(allTeams));

    // Audit log
    const auditRecord: AuditLogRecord = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: 'MANUAL_ASSIGNMENT',
      teamId: team.teamId,
      teamName: team.teamName,
      oldProblemId: oldProblemId || undefined,
      adminId,
      timestamp,
      reason: options.reason || 'Admin manually assigned problem statement',
      details: `Team "${team.teamName}" (${team.teamId}) manually assigned to challenge "${problem.title}" (${problem.problemId})`,
    };
    this.recordLocalAudit(auditRecord);

    this.recordLocalActivity({
      id: `act-${Date.now()}`,
      type: 'SELECTION',
      title: `Admin assigned ${problem.problemId} to ${team.teamName}`,
      description: `Manual assignment by organizer. ${options.reason ? `Reason: ${options.reason}` : ''}`,
      timestamp,
      teamId: team.teamId,
      teamName: team.teamName,
      problemId: problem.problemId,
    });

    return newSelection;
  }

  /**
   * ADMIN RESET SELECTION (Sections 24 & 25)
   * Resets selection, logs audit entry, and decrements counter atomically
   */
  public static async resetTeamSelection(
    teamId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('A reason is required to reset a team selection.');
    }

    const currentSelection = await this.getSelectionForTeam(teamId);
    if (!currentSelection) {
      throw new Error('This team does not have an active problem selection.');
    }

    const oldProblemId = currentSelection.problemId;
    const teamName = currentSelection.teamName;
    const timestamp = new Date().toISOString();

    // 1. Audit Log Entry
    const auditRecord: AuditLogRecord = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: 'RESET_SELECTION',
      teamId,
      teamName,
      oldProblemId,
      adminId,
      timestamp,
      reason: reason.trim(),
      details: `Problem selection for ${teamName} (${teamId}) was reset. Old problem: ${oldProblemId}`,
    };

    // 2. Firestore Deletion & Re-allocation when live
    if (isFirebaseConfigured && db) {
      const firestore = db;
      try {
        await runTransaction(firestore, async (transaction) => {
          const teamSelectionRef = doc(firestore, 'teamSelections', teamId);
          const teamRef = doc(firestore, 'teams', teamId);
          const problemRef = doc(firestore, 'problems', oldProblemId);
          const auditRef = doc(firestore, 'auditLogs', auditRecord.id);

          // Delete selection
          transaction.delete(teamSelectionRef);

          // Record audit log
          transaction.set(auditRef, auditRecord);

          // Update team doc
          transaction.update(teamRef, {
            selectedProblemId: '',
            selectedProblemTitle: '',
            selectionDate: '',
            updatedAt: timestamp,
          });

          // Decrement problem count if exists
          const problemDoc = await transaction.get(problemRef);
          if (problemDoc.exists()) {
            const current = problemDoc.data().selectedCount || 1;
            transaction.update(problemRef, {
              selectedCount: Math.max(0, current - 1),
              updatedAt: timestamp,
            });
          }
        });
      } catch (err) {
        console.warn('[SelectionService] Firestore reset error:', err);
      }
    }

    // 3. Local fallback cleanup
    const localSelections = this.getLocalSelections().filter((s) => s.teamId !== teamId);
    this.saveLocalSelections(localSelections);

    // Update local team
    const allTeams = await TeamService.getAllTeams();
    const targetTeam = allTeams.find((t) => t.teamId === teamId);
    if (targetTeam) {
      targetTeam.selectedProblemId = undefined;
      targetTeam.selectedProblemTitle = undefined;
      targetTeam.selectionDate = undefined;
      targetTeam.updatedAt = timestamp;
      localStorage.setItem('hackathon_portal_teams_v2', JSON.stringify(allTeams));
    }

    // Update local problem counter
    const allProblems = await ProblemService.getAllProblems({ forParticipant: false });
    const targetProblem = allProblems.find((p) => p.problemId === oldProblemId);
    if (targetProblem && targetProblem.selectedCount) {
      targetProblem.selectedCount = Math.max(0, targetProblem.selectedCount - 1);
      localStorage.setItem('hackathon_portal_problems_v2', JSON.stringify(allProblems));
    }

    // Save local audit
    this.recordLocalAudit(auditRecord);
    this.recordLocalActivity({
      id: `act-${Date.now()}`,
      type: 'RESET',
      title: `Selection reset for ${teamName}`,
      description: `Admin removed selection of ${oldProblemId}. Reason: "${reason}"`,
      timestamp,
      teamId,
      teamName,
      problemId: oldProblemId,
    });
  }

  /**
   * Export selections to CSV (Section 22 - Admin only)
   */
  public static async exportSelectionsToCsv(): Promise<string> {
    const teams = await TeamService.getAllTeams();
    const selections = await this.getAllSelections();

    const selectionMap = new Map<string, TeamSelection>();
    selections.forEach((s) => selectionMap.set(s.teamId, s));

    const headers = [
      'Team ID',
      'Team Name',
      'Problem ID',
      'Problem Title',
      'Selected At',
      'Status',
    ];

    const rows = teams.map((team) => {
      const sel = selectionMap.get(team.teamId);
      const isSelected = Boolean(sel || team.selectedProblemId);
      const probId = sel?.problemId || team.selectedProblemId || 'N/A';
      const probTitle = sel?.problemTitle || team.selectedProblemTitle || 'N/A';
      const selAt = sel?.selectedAt || team.selectionDate || 'N/A';
      const status = isSelected ? 'SELECTED' : 'NOT SELECTED';

      return [
        `"${team.teamId}"`,
        `"${(team.teamName || '').replace(/"/g, '""')}"`,
        `"${probId}"`,
        `"${probTitle.replace(/"/g, '""')}"`,
        `"${selAt}"`,
        `"${status}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Real-time listener for team selections (Section 31)
   */
  public static subscribeToSelections(
    callback: (selections: TeamSelection[]) => void
  ): () => void {
    if (isFirebaseConfigured && db) {
      try {
        const refCol = collection(db, 'teamSelections');
        const unsubscribe = onSnapshot(
          refCol,
          (snapshot) => {
            const list: TeamSelection[] = [];
            snapshot.forEach((d) => list.push(d.data() as TeamSelection));
            this.saveLocalSelections(list);
            callback(list);
          },
          (err) => {
            console.warn('[SelectionService] subscribe error:', err);
            callback(this.getLocalSelections());
          }
        );
        return unsubscribe;
      } catch {
        // fallback
      }
    }

    callback(this.getLocalSelections());
    return () => {};
  }

  /**
   * Get all audit logs
   */
  public static async getAuditLogs(): Promise<AuditLogRecord[]> {
    if (isFirebaseConfigured && db) {
      try {
        const refCol = collection(db, 'auditLogs');
        const q = query(refCol, orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list: AuditLogRecord[] = [];
          snap.forEach((d) => list.push(d.data() as AuditLogRecord));
          return list;
        }
      } catch (err) {
        console.warn('[SelectionService] getAuditLogs error:', err);
      }
    }

    return this.getLocalAuditLogs();
  }

  // -------------------------------------------------------------
  // Helpers & Local Cache Management
  // -------------------------------------------------------------
  private static async syncLocalTeamAndProblem(selection: TeamSelection): Promise<void> {
    const allTeams = await TeamService.getAllTeams();
    const teamIndex = allTeams.findIndex((t) => t.teamId === selection.teamId);
    if (teamIndex >= 0) {
      allTeams[teamIndex].selectedProblemId = selection.problemId;
      allTeams[teamIndex].selectedProblemTitle = selection.problemTitle;
      allTeams[teamIndex].selectionDate = selection.selectedAt;
      localStorage.setItem('hackathon_portal_teams_v2', JSON.stringify(allTeams));
    }

    const allProblems = await ProblemService.getAllProblems({ forParticipant: false });
    const probIndex = allProblems.findIndex((p) => p.problemId === selection.problemId);
    if (probIndex >= 0) {
      allProblems[probIndex].selectedCount = (allProblems[probIndex].selectedCount || 0) + 1;
      localStorage.setItem('hackathon_portal_problems_v2', JSON.stringify(allProblems));
    }
  }

  private static getLocalSelections(): TeamSelection[] {
    try {
      const stored = localStorage.getItem(SELECTIONS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  }

  private static saveLocalSelections(selections: TeamSelection[]): void {
    try {
      localStorage.setItem(SELECTIONS_STORAGE_KEY, JSON.stringify(selections));
    } catch {
      // ignore
    }
  }

  private static addLocalSelection(selection: TeamSelection): void {
    const current = this.getLocalSelections().filter((s) => s.teamId !== selection.teamId);
    this.saveLocalSelections([selection, ...current]);
  }

  private static getLocalAuditLogs(): AuditLogRecord[] {
    try {
      const stored = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  }

  private static recordLocalAudit(audit: AuditLogRecord): void {
    const current = this.getLocalAuditLogs();
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify([audit, ...current]));
  }

  public static getRecentActivities(): any[] {
    try {
      const stored = localStorage.getItem('hackathon_portal_recent_activity_v1');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  }

  public static recordLocalActivity(item: any): void {
    const current = this.getRecentActivities();
    localStorage.setItem(
      'hackathon_portal_recent_activity_v1',
      JSON.stringify([item, ...current].slice(0, 50))
    );
  }
}
