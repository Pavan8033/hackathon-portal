import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { hashCredential } from '../utils/crypto';
import type { TeamRecord, ParsedTeamRow, TeamStatus } from '../types';

const TEAMS_STORAGE_KEY = 'hackathon_portal_teams_v2';

export class TeamService {
  /**
   * Universal Team ID Normalizer: strips hyphens, spaces, underscores, and lowercases.
   * e.g. "ALPHA-004", "alpha 004", "ALPHA004" -> "alpha004"
   */
  public static normalizeId(id?: string | null): string {
    if (!id) return '';
    return id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Initialize and retrieve all teams
   */
  public static async getAllTeams(): Promise<TeamRecord[]> {
    let list: TeamRecord[] = [];
    if (isFirebaseConfigured && db) {
      try {
        const teamsRef = collection(db, 'teams');
        const snapshot = await getDocs(teamsRef);
        if (!snapshot.empty) {
          snapshot.forEach((d) => list.push(d.data() as TeamRecord));
        }
      } catch (err) {
        console.warn('[TeamService] Firestore fetch error, using local fallback:', err);
      }
    }

    if (list.length === 0) {
      list = this.getLocalTeams();
    } else {
      // Merge with any local additions
      const local = this.getLocalTeams();
      for (const loc of local) {
        const cleanLocId = this.normalizeId(loc.teamId);
        if (!list.some((r) => this.normalizeId(r.teamId) === cleanLocId)) {
          list.push(loc);
        }
      }
    }

    // Deduplicate and merge any multiple records for the same team ID
    const mergedMap = new Map<string, TeamRecord>();
    for (const t of list) {
      const nid = this.normalizeId(t.teamId);
      if (!nid) continue;
      if (!mergedMap.has(nid)) {
        mergedMap.set(nid, t);
      } else {
        const prev = mergedMap.get(nid)!;
        // Merge records, favoring real participant details over placeholder data
        const prevCleanLead = prev.teamLeadName && prev.teamLeadName.toLowerCase() !== 'team lead';
        const currCleanLead = t.teamLeadName && t.teamLeadName.toLowerCase() !== 'team lead';
        const currHasRoster = (t.teamMembers?.length || 0) > 0 && currCleanLead;

        const merged: TeamRecord = {
          ...(currHasRoster ? prev : t),
          ...(currHasRoster ? t : prev),
          teamId: t.teamId || prev.teamId,
          teamName:
            t.teamName && !t.teamName.startsWith('Team TM-') && !t.teamName.startsWith('Team ALPHA-') && t.teamName.toLowerCase() !== 'team name'
              ? t.teamName
              : prev.teamName,
          teamLeadName: currCleanLead ? t.teamLeadName : prevCleanLead ? prev.teamLeadName : t.teamLeadName || prev.teamLeadName,
          teamLeadRegistrationNumber: t.teamLeadRegistrationNumber || prev.teamLeadRegistrationNumber,
          credentialHash: t.credentialHash || prev.credentialHash,
          selectedProblemId: t.selectedProblemId || prev.selectedProblemId,
          selectedProblemTitle: t.selectedProblemTitle || prev.selectedProblemTitle,
        };
        mergedMap.set(nid, merged);
      }
    }

    const finalList = Array.from(mergedMap.values());
    this.saveLocalTeams(finalList);
    return finalList;
  }

  /**
   * Get team by ID, matching case-insensitively and alphanumeric-normalized
   */
  public static async getTeamById(teamId: string): Promise<TeamRecord | null> {
    const cleanId = this.normalizeId(teamId);
    if (!cleanId) return null;

    if (isFirebaseConfigured && db) {
      try {
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (teamDoc.exists()) {
          const remote = teamDoc.data() as TeamRecord;
          const hasRoster =
            remote.teamMembers &&
            remote.teamMembers.length > 0 &&
            remote.teamLeadName &&
            remote.teamLeadName.toLowerCase() !== 'team lead';
          if (hasRoster) return remote;
        }
      } catch (err) {
        console.warn('[TeamService] Firestore getDoc error:', err);
      }
    }

    const all = await this.getAllTeams();
    const matches = all.filter(
      (t) => this.normalizeId(t.teamId) === cleanId || this.normalizeId(t.teamName) === cleanId
    );
    if (matches.length === 0) return null;

    // Pick best enriched record with actual participant roster details
    return matches.reduce((best, curr) => {
      const score = (r: TeamRecord) => {
        let s = 0;
        const cleanMems = (r.teamMembers || []).filter(
          (m) => m && m.toLowerCase() !== 'team lead' && m.toLowerCase() !== 'participant institution'
        );
        s += cleanMems.length * 3;
        if (r.teamLeadName && r.teamLeadName.toLowerCase() !== 'team lead' && r.teamLeadName.trim() !== '') s += 5;
        if (
          r.teamName &&
          !r.teamName.startsWith('Team TM-') &&
          !r.teamName.startsWith('Team ALPHA-') &&
          r.teamName.toLowerCase() !== 'team name'
        ) {
          s += 4;
        }
        if (r.college && r.college.toLowerCase() !== 'participant institution') s += 1;
        return s;
      };
      return score(curr) > score(best) ? curr : best;
    });
  }

  /**
   * Authenticate team using Team ID (Username) & Password per Admin Participant List
   */
  public static async authenticateTeam(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; team?: TeamRecord; error?: string }> {
    const cleanId = this.normalizeId(identifier);
    const trimmedPass = password.trim();

    if (!cleanId || !trimmedPass) {
      return {
        success: false,
        error: 'Please enter both your Team ID (Username) and Password.',
      };
    }

    const teams = await this.getAllTeams();
    const matchedTeams = teams.filter(
      (t) =>
        this.normalizeId(t.teamId) === cleanId ||
        this.normalizeId(t.teamName) === cleanId
    );

    if (matchedTeams.length === 0) {
      return {
        success: false,
        error: 'Invalid team credentials. Team ID not recognized. Please use the exact credentials provided by the organizers.',
      };
    }

    // Pick the best enriched record with actual roster details
    const team = matchedTeams.reduce((best, curr) => {
      const score = (r: TeamRecord) => {
        let s = 0;
        const cleanMems = (r.teamMembers || []).filter(
          (m) => m && m.toLowerCase() !== 'team lead' && m.toLowerCase() !== 'participant institution'
        );
        s += cleanMems.length * 3;
        if (r.teamLeadName && r.teamLeadName.toLowerCase() !== 'team lead' && r.teamLeadName.trim() !== '') s += 5;
        if (
          r.teamName &&
          !r.teamName.startsWith('Team TM-') &&
          !r.teamName.startsWith('Team ALPHA-') &&
          r.teamName.toLowerCase() !== 'team name'
        ) {
          s += 4;
        }
        return s;
      };
      return score(curr) > score(best) ? curr : best;
    });

    // Verify password credential securely (via SHA-256 hash or plain fallback)
    const inputHash = await hashCredential(trimmedPass);
    const matchesHash = matchedTeams.some((t) =>
      Boolean(
        (t.credentialHash && t.credentialHash === inputHash) ||
        (t.teamLeadRegistrationNumber &&
          t.teamLeadRegistrationNumber.trim().toLowerCase() === trimmedPass.toLowerCase()) ||
        (t.teamId && t.teamId.trim().toLowerCase() === trimmedPass.toLowerCase())
      )
    );

    if (!matchesHash) {
      return {
        success: false,
        error: 'Invalid password. Please check your assigned Registration Number / Password.',
      };
    }

    // Validate active status per Part 9
    if (team.status !== 'active') {
      return {
        success: false,
        error: 'Your team account is currently inactive. Please contact the organizers.',
      };
    }

    return {
      success: true,
      team,
    };
  }

  /**
   * Import valid teams from parsed spreadsheet rows with columns (TEAM ID, TEAM NAME, TEAM LEAD, REGISTRATION NUMBER, MEMBERS)
   * If a team with the given teamId already exists (e.g. from credentials import), merges and updates with full participant details!
   */
  public static async importTeams(
    rows: ParsedTeamRow[]
  ): Promise<{ importedCount: number; updatedCount: number; skippedCount: number; errors: string[] }> {
    const existing = await this.getAllTeams();
    const newRecords: TeamRecord[] = [];
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    let updatedCount = 0;

    for (const r of rows) {
      const customId = this.normalizeId(r.teamId);
      if (!customId) continue;

      // Filter out title/header row if included in data
      const isHeaderRow =
        customId === 'teamid' ||
        (r.teamLeadName?.toLowerCase() === 'team lead' && r.teamName?.toLowerCase() === 'team name');
      if (isHeaderRow) continue;

      // Check if team already exists by normalized teamId -> MERGE with all participant details!
      const existingIndex = existing.findIndex((t) => this.normalizeId(t.teamId) === customId);
      if (existingIndex >= 0) {
        const prev = existing[existingIndex];
        const secretPassword = (
          r.password ||
          r.teamLeadRegistrationNumber ||
          prev.teamLeadRegistrationNumber ||
          prev.teamId
        ).trim();
        const credentialHash = await hashCredential(secretPassword);

        // Extract real team name, real lead name, real members
        const realTeamName =
          r.teamName && r.teamName.toLowerCase() !== 'team name' && !r.teamName.toLowerCase().startsWith('team team ')
            ? r.teamName.trim()
            : prev.teamName && !prev.teamName.toLowerCase().startsWith('team team ')
            ? prev.teamName
            : `Team ${r.teamId}`;

        const realLead =
          r.teamLeadName && r.teamLeadName.toLowerCase() !== 'team lead' && r.teamLeadName.toLowerCase() !== 'leader'
            ? r.teamLeadName.trim()
            : prev.teamLeadName && prev.teamLeadName.toLowerCase() !== 'team lead'
            ? prev.teamLeadName
            : r.members?.[0] || '';

        const cleanMembers = (r.members && r.members.length > 0 ? r.members : prev.teamMembers || [])
          .filter((m) => m && m.toLowerCase() !== 'team lead' && m.toLowerCase() !== 'participant institution');

        const updated: TeamRecord = {
          ...prev,
          teamId: r.teamId?.trim() || prev.teamId,
          teamName: realTeamName,
          teamLeadName: realLead,
          teamLeadRegistrationNumber:
            r.teamLeadRegistrationNumber?.trim() || prev.teamLeadRegistrationNumber,
          credentialHash,
          teamMembers: cleanMembers.length > 0 ? cleanMembers : realLead ? [realLead] : [],
          email: r.email?.trim() || prev.email,
          phone: r.phone?.trim() || prev.phone,
          college:
            r.college?.trim() && r.college.toLowerCase() !== 'participant institution'
              ? r.college.trim()
              : prev.college,
          status: 'active',
          updatedAt: timestamp,
        };

        existing[existingIndex] = updated;

        if (isFirebaseConfigured && db) {
          try {
            await setDoc(doc(db, 'teams', updated.teamId), updated);
          } catch (err) {
            console.warn('[TeamService] Firestore merge error:', err);
          }
        }

        updatedCount++;
        continue;
      }

      // Check duplicate team name among existing teams
      const normalizedName = this.normalizeId(r.teamName);
      if (normalizedName && existing.some((t) => this.normalizeId(t.teamName) === normalizedName)) {
        errors.push(`Team "${r.teamName.trim()}" already exists in the directory.`);
        continue;
      }

      const assignedId =
        r.teamId?.trim() ||
        `TM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      const secretPassword = (
        r.password ||
        r.teamLeadRegistrationNumber ||
        assignedId
      ).trim();
      const credentialHash = await hashCredential(secretPassword);

      const realTeamName =
        r.teamName && r.teamName.toLowerCase() !== 'team name'
          ? r.teamName.trim()
          : `Team ${assignedId}`;

      const realLead =
        r.teamLeadName && r.teamLeadName.toLowerCase() !== 'team lead' && r.teamLeadName.toLowerCase() !== 'leader'
          ? r.teamLeadName.trim()
          : r.members?.[0] || '';

      const cleanMembers = (r.members || []).filter(
        (m) => m && m.toLowerCase() !== 'team lead' && m.toLowerCase() !== 'participant institution'
      );

      const record: TeamRecord = {
        teamId: assignedId,
        teamName: realTeamName,
        teamLeadName: realLead,
        teamLeadRegistrationNumber: r.teamLeadRegistrationNumber?.trim() || '',
        credentialHash,
        teamMembers: cleanMembers.length > 0 ? cleanMembers : realLead ? [realLead] : [],
        email: r.email?.trim() || '',
        phone: r.phone?.trim() || '',
        college: r.college?.trim() || 'Participant Institution',
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      newRecords.push(record);
      existing.push(record);

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'teams', record.teamId), record);
        } catch (err) {
          console.warn('[TeamService] Firestore save error:', err);
        }
      }
    }

    // Update local cache
    this.saveLocalTeams(existing);

    return {
      importedCount: newRecords.length,
      updatedCount,
      skippedCount: rows.length - (newRecords.length + updatedCount),
      errors,
    };
  }

  /**
   * Bulk import login credentials (TEAM ID as username and REGISTRATION NUMBER as password)
   */
  public static async importCredentials(
    credentials: { teamId: string; registrationNumber: string }[]
  ): Promise<{ importedCount: number; updatedCount: number; totalProcessed: number }> {
    const existing = await this.getAllTeams();
    const timestamp = new Date().toISOString();
    let importedCount = 0;
    let updatedCount = 0;

    for (const cred of credentials) {
      const cleanId = cred.teamId.trim();
      const cleanReg = cred.registrationNumber.trim();
      if (!cleanId || !cleanReg) continue;

      const normId = this.normalizeId(cleanId);
      const existingIndex = existing.findIndex((t) => this.normalizeId(t.teamId) === normId);
      const credentialHash = await hashCredential(cleanReg);

      if (existingIndex >= 0) {
        // Update existing team credentials ONLY, preserving all imported participant details!
        const prev = existing[existingIndex];
        const updated: TeamRecord = {
          ...prev,
          teamLeadRegistrationNumber: cleanReg,
          credentialHash,
          updatedAt: timestamp,
        };
        existing[existingIndex] = updated;

        if (isFirebaseConfigured && db) {
          try {
            await setDoc(doc(db, 'teams', updated.teamId), updated);
          } catch (err) {
            console.warn('[TeamService] Firestore credential update error:', err);
          }
        }
        updatedCount++;
      } else {
        // Create new standalone team record awaiting full participant roster details
        const newRecord: TeamRecord = {
          teamId: cleanId,
          teamName: `Team ${cleanId}`,
          teamLeadName: '',
          teamLeadRegistrationNumber: cleanReg,
          credentialHash,
          teamMembers: [],
          email: `${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '')}@hackathon.local`,
          phone: '',
          college: '',
          status: 'active',
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        existing.push(newRecord);

        if (isFirebaseConfigured && db) {
          try {
            await setDoc(doc(db, 'teams', newRecord.teamId), newRecord);
          } catch (err) {
            console.warn('[TeamService] Firestore credential save error:', err);
          }
        }
        importedCount++;
      }
    }

    this.saveLocalTeams(existing);

    return {
      importedCount,
      updatedCount,
      totalProcessed: importedCount + updatedCount,
    };
  }

  /**
   * Export credentials (Team ID, Registration Number, Team Name) to CSV for admin records
   */
  public static async exportCredentialsToCsv(): Promise<string> {
    const teams = await this.getAllTeams();
    const headers = [
      'Team ID (Username)',
      'Registration Number (Password)',
      'Team Name',
      'Team Lead',
      'Status',
    ];
    const rows = teams.map((team) => {
      const pass = team.teamLeadRegistrationNumber || team.teamId;
      return [
        `"${team.teamId}"`,
        `"${pass.replace(/"/g, '""')}"`,
        `"${(team.teamName || '').replace(/"/g, '""')}"`,
        `"${(team.teamLeadName || '').replace(/"/g, '""')}"`,
        `"${team.status.toUpperCase()}"`,
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export all teams to CSV per Phase 30
   * Fields: Team ID, Team Name, Team Lead, Members, Status
   * NEVER exports passwords, hashes, or credentials
   */
  public static async exportTeamsToCsv(): Promise<string> {
    const teams = await this.getAllTeams();
    const headers = ['Team ID', 'Team Name', 'Team Lead', 'Members', 'Status'];
    const rows = teams.map((team) => {
      const members = (team.teamMembers || []).join('; ');
      return [
        `"${team.teamId}"`,
        `"${(team.teamName || '').replace(/"/g, '""')}"`,
        `"${(team.teamLeadName || '').replace(/"/g, '""')}"`,
        `"${members.replace(/"/g, '""')}"`,
        `"${team.status.toUpperCase()}"`,
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Toggle team active/inactive status per Part 7
   */
  public static async updateTeamStatus(
    teamId: string,
    status: TeamStatus
  ): Promise<void> {
    const teams = this.getLocalTeams();
    const updated = teams.map((t) =>
      t.teamId === teamId
        ? { ...t, status, updatedAt: new Date().toISOString() }
        : t
    );
    this.saveLocalTeams(updated);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'teams', teamId), {
          status,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[TeamService] Firestore update status error:', err);
      }
    }
  }

  /**
   * Reset team credential (Registration Number) per Part 7
   */
  public static async resetTeamCredentials(
    teamId: string,
    newRegistrationNumber: string
  ): Promise<void> {
    const trimmed = newRegistrationNumber.trim();
    const newHash = await hashCredential(trimmed);
    const timestamp = new Date().toISOString();

    const teams = this.getLocalTeams();
    const updated = teams.map((t) =>
      t.teamId === teamId
        ? {
            ...t,
            teamLeadRegistrationNumber: trimmed,
            credentialHash: newHash,
            updatedAt: timestamp,
          }
        : t
    );
    this.saveLocalTeams(updated);

    if (isFirebaseConfigured && db) {
      try {
        // Never write raw registration numbers to Firestore
        await updateDoc(doc(db, 'teams', teamId), {
          credentialHash: newHash,
          updatedAt: timestamp,
        });
      } catch (err) {
        console.warn('[TeamService] Firestore credential reset error:', err);
      }
    }
  }

  /**
   * Deactivate team
   */
  public static async deactivateTeam(teamId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const teams = this.getLocalTeams();
    const updated = teams.map((t) =>
      t.teamId === teamId
        ? {
            ...t,
            status: 'inactive' as const,
            updatedAt: timestamp,
          }
        : t
    );
    this.saveLocalTeams(updated);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'teams', teamId), {
          status: 'inactive',
          updatedAt: timestamp,
        });
      } catch (err) {
        console.warn('[TeamService] Firestore deactivate error:', err);
      }
    }
  }

  /**
   * Delete team record
   */
  public static async deleteTeam(teamId: string): Promise<void> {
    const teams = this.getLocalTeams();
    const filtered = teams.filter((t) => t.teamId !== teamId);
    this.saveLocalTeams(filtered);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'teams', teamId));
      } catch (err) {
        console.warn('[TeamService] Firestore delete error:', err);
      }
    }
  }

  // ----------------------------------------------------------------
  // Local storage helpers
  // ----------------------------------------------------------------
  private static inMemoryTeams: TeamRecord[] = [];

  private static getLocalTeams(): TeamRecord[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.inMemoryTeams = parsed;
            return parsed;
          }
        }
      }
    } catch {
      // LocalStorage access error fallback
    }
    return this.inMemoryTeams;
  }

  private static saveLocalTeams(teams: TeamRecord[]): void {
    this.inMemoryTeams = teams;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
      }
    } catch {
      // ignore
    }
  }
}
