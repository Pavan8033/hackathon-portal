import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { hashCredential } from '../utils/crypto';
import { ALPHA_TEAMS_ROSTER } from '../data/alphaTeamsRoster';
import type { TeamRecord, ParsedTeamRow, TeamStatus } from '../types';

const TEAMS_STORAGE_KEY = 'hackathon_portal_teams_v2';
const PARTICIPANTS_STORAGE_KEY = 'hackathon_portal_participants_roster_v2';

export class TeamService {
  /**
   * Universal Team ID Normalizer: strips hyphens, spaces, underscores, and lowercases.
   * e.g. "ALPHA-004", "alpha 004", "ALPHA004" -> "alpha004"
   */
  public static normalizeId(id?: string | null): string {
    if (!id) return '';
    const clean = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = clean.match(/^([a-z]+)0*(\d+)$/);
    if (match) {
      return `${match[1]}${match[2]}`;
    }
    return clean;
  }

  /**
   * Identifies whether a team name is just an auto-generated shell (e.g. "Team ALPHA-004")
   * vs a real custom team name from participant roster.
   */
  public static isGenericTeamName(name?: string, teamId?: string): boolean {
    if (!name) return true;
    const trimmed = name.trim();
    const lower = trimmed.toLowerCase();
    if (
      lower === 'team name' ||
      lower === 'team' ||
      lower === 'teamlead' ||
      lower === 'team lead' ||
      lower === 'members' ||
      lower === 'participant institution'
    ) {
      return true;
    }
    if (/^team\s+tm-\d+-\d+$/i.test(trimmed)) return true;
    if (/^team\s+team/i.test(trimmed)) return true;
    if (teamId) {
      const cleanId = this.normalizeId(teamId);
      const cleanName = this.normalizeId(trimmed);
      if (cleanName === `team${cleanId}` || cleanName === cleanId) return true;
    }
    return false;
  }

  /**
   * Initialize and retrieve all teams
   */
  public static async getAllTeams(): Promise<TeamRecord[]> {
    const list: TeamRecord[] = [];

    // 1. Include base official Alpha teams roster (60 teams)
    list.push(...ALPHA_TEAMS_ROSTER);

    // 2. Fetch from Firestore teams and participants collections
    if (isFirebaseConfigured && db) {
      try {
        const teamsRef = collection(db, 'teams');
        const snapshot = await getDocs(teamsRef);
        if (!snapshot.empty) {
          snapshot.forEach((d) => list.push(d.data() as TeamRecord));
        }

        // Also fetch from participants collection
        try {
          const partRef = collection(db, 'participants');
          const partSnap = await getDocs(partRef);
          if (!partSnap.empty) {
            partSnap.forEach((d) => list.push(d.data() as TeamRecord));
          }
        } catch {
          // ignore participants fetch error
        }
      } catch (err) {
        console.warn('[TeamService] Firestore fetch error, using local fallback:', err);
      }
    }

    // 3. Merge with local storage teams and participants
    const local = this.getLocalTeams();
    const localParticipants = this.getLocalParticipants();
    list.push(...local, ...localParticipants);


    // 3. Deduplicate and merge any multiple records for the same team ID
    const mergedMap = new Map<string, TeamRecord>();
    for (const t of list) {
      const nid = this.normalizeId(t.teamId);
      if (!nid) continue;

      if (!mergedMap.has(nid)) {
        mergedMap.set(nid, t);
      } else {
        const prev = mergedMap.get(nid)!;

        // Clean member lists
        const prevCleanMems = (prev.teamMembers || []).filter(
          (m) => m && m.toLowerCase() !== 'team lead' && m.toLowerCase() !== 'participant institution' && m.toLowerCase() !== 'members'
        );
        const currCleanMems = (t.teamMembers || []).filter(
          (m) => m && m.toLowerCase() !== 'team lead' && m.toLowerCase() !== 'participant institution' && m.toLowerCase() !== 'members'
        );

        // Clean lead names
        const cleanLead = (name?: string) => {
          if (!name) return '';
          const l = name.trim().toLowerCase();
          if (l === 'team lead' || l === 'leader' || l === 'team lead name' || l === 'lead' || l === 'captain') return '';
          return name.trim();
        };

        const prevLead = cleanLead(prev.teamLeadName);
        const currLead = cleanLead(t.teamLeadName);
        const bestLead = currLead || prevLead;

        const bestMembers =
          currCleanMems.length >= prevCleanMems.length && currCleanMems.length > 0
            ? currCleanMems
            : prevCleanMems.length > 0
            ? prevCleanMems
            : bestLead
            ? [bestLead]
            : [];

        // Clean team name: ALWAYS prefer real custom name over generic "Team <id>"
        const tGeneric = this.isGenericTeamName(t.teamName, t.teamId || prev.teamId);
        const prevGeneric = this.isGenericTeamName(prev.teamName, prev.teamId || t.teamId);

        let bestTeamName = '';
        if (!tGeneric && t.teamName) {
          bestTeamName = t.teamName.trim();
        } else if (!prevGeneric && prev.teamName) {
          bestTeamName = prev.teamName.trim();
        } else {
          bestTeamName = (t.teamName || prev.teamName || `Team ${t.teamId || prev.teamId}`).trim();
        }

        const cleanCollege = (c?: string) => {
          if (!c) return '';
          const cl = c.trim().toLowerCase();
          if (cl === 'participant institution' || cl === 'institution' || cl === 'college') return '';
          return c.trim();
        };
        const bestCollege = cleanCollege(t.college) || cleanCollege(prev.college) || '';

        const merged: TeamRecord = {
          teamId: t.teamId || prev.teamId,
          teamName: bestTeamName,
          teamLeadName: bestLead,
          teamLeadRegistrationNumber: t.teamLeadRegistrationNumber || prev.teamLeadRegistrationNumber || '',
          credentialHash: t.credentialHash || prev.credentialHash || '',
          teamMembers: bestMembers,
          college: bestCollege,
          email: t.email || prev.email || '',
          phone: t.phone || prev.phone || '',
          selectedProblemId: t.selectedProblemId || prev.selectedProblemId,
          selectedProblemTitle: t.selectedProblemTitle || prev.selectedProblemTitle,
          selectionDate: t.selectionDate || prev.selectionDate,
          status: 'active',
          createdAt: prev.createdAt || t.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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

    const all = await this.getAllTeams();
    const match = all.find(
      (t) => this.normalizeId(t.teamId) === cleanId || this.normalizeId(t.teamName) === cleanId
    );
    if (match) return match;

    const fallback = ALPHA_TEAMS_ROSTER.find(
      (t) => this.normalizeId(t.teamId) === cleanId || this.normalizeId(t.teamName) === cleanId
    );
    return fallback || null;
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

      // Check if team already exists by normalized teamId or teamName -> MERGE with all participant details!
      const normalizedName = this.normalizeId(r.teamName);
      const existingIndex = existing.findIndex(
        (t) =>
          this.normalizeId(t.teamId) === customId ||
          (normalizedName && this.normalizeId(t.teamName) === normalizedName)
      );

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
          !this.isGenericTeamName(r.teamName, r.teamId)
            ? r.teamName.trim()
            : !this.isGenericTeamName(prev.teamName, prev.teamId)
            ? prev.teamName.trim()
            : (r.teamName || prev.teamName || `Team ${r.teamId}`).trim();

        const realLead =
          r.teamLeadName &&
          r.teamLeadName.toLowerCase() !== 'team lead' &&
          r.teamLeadName.toLowerCase() !== 'leader' &&
          r.teamLeadName.toLowerCase() !== 'team lead name'
            ? r.teamLeadName.trim()
            : prev.teamLeadName && prev.teamLeadName.toLowerCase() !== 'team lead'
            ? prev.teamLeadName
            : r.members?.[0] || '';

        const cleanMembers = (r.members && r.members.length > 0 ? r.members : prev.teamMembers || [])
          .filter((m) => m && m.toLowerCase() !== 'team lead' && m.toLowerCase() !== 'participant institution' && m.toLowerCase() !== 'members');

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
              : prev.college && prev.college.toLowerCase() !== 'participant institution'
              ? prev.college.trim()
              : '',
          status: 'active',
          updatedAt: timestamp,
        };

        existing[existingIndex] = updated;

        if (isFirebaseConfigured && db) {
          try {
            await setDoc(doc(db, 'teams', updated.teamId), updated);
            await setDoc(doc(db, 'participants', customId), updated);
          } catch (err) {
            console.warn('[TeamService] Firestore merge error:', err);
          }
        }

        updatedCount++;
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
        !this.isGenericTeamName(r.teamName, assignedId)
          ? r.teamName.trim()
          : (r.teamName || `Team ${assignedId}`).trim();

      const realLead =
        r.teamLeadName &&
        r.teamLeadName.toLowerCase() !== 'team lead' &&
        r.teamLeadName.toLowerCase() !== 'leader' &&
        r.teamLeadName.toLowerCase() !== 'team lead name'
          ? r.teamLeadName.trim()
          : r.members?.[0] || '';

      const cleanMembers = (r.members || []).filter(
        (m) => m && m.toLowerCase() !== 'team lead' && m.toLowerCase() !== 'participant institution' && m.toLowerCase() !== 'members'
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
        college: r.college?.trim() && r.college.toLowerCase() !== 'participant institution' ? r.college.trim() : '',
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      newRecords.push(record);
      existing.push(record);

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'teams', record.teamId), record);
          await setDoc(doc(db, 'participants', customId), record);
        } catch (err) {
          console.warn('[TeamService] Firestore save error:', err);
        }
      }
    }

    // Update local cache for both teams and participants
    this.saveLocalTeams(existing);
    this.saveLocalParticipants(existing);

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

  private static inMemoryParticipants: TeamRecord[] = [];

  public static getLocalParticipants(): TeamRecord[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.inMemoryParticipants = parsed;
            return parsed;
          }
        }
      }
    } catch {
      // LocalStorage access error fallback
    }
    return this.inMemoryParticipants;
  }

  public static saveLocalParticipants(participants: TeamRecord[]): void {
    this.inMemoryParticipants = participants;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participants));
      }
    } catch {
      // ignore
    }
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
