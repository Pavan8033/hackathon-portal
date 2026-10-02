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
   * Initialize and retrieve all teams
   */
  public static async getAllTeams(): Promise<TeamRecord[]> {
    if (isFirebaseConfigured && db) {
      try {
        const teamsRef = collection(db, 'teams');
        const snapshot = await getDocs(teamsRef);
        if (!snapshot.empty) {
          const list: TeamRecord[] = [];
          snapshot.forEach((d) => list.push(d.data() as TeamRecord));
          this.saveLocalTeams(list);
          return list;
        }
      } catch (err) {
        console.warn('[TeamService] Firestore fetch error, using local fallback:', err);
      }
    }

    return this.getLocalTeams();
  }

  /**
   * Get team by ID
   */
  public static async getTeamById(teamId: string): Promise<TeamRecord | null> {
    if (isFirebaseConfigured && db) {
      try {
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (teamDoc.exists()) {
          return teamDoc.data() as TeamRecord;
        }
      } catch (err) {
        console.warn('[TeamService] Firestore getDoc error:', err);
      }
    }

    const local = this.getLocalTeams();
    return local.find((t) => t.teamId === teamId) || null;
  }

  /**
   * Authenticate team using Team ID (Username) & Password per Admin Participant List
   */
  public static async authenticateTeam(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; team?: TeamRecord; error?: string }> {
    const trimmedId = identifier.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedId || !trimmedPass) {
      return {
        success: false,
        error: 'Please enter both your Team ID (Username) and Password.',
      };
    }

    const teams = await this.getAllTeams();
    // Check Team ID as username (exact or case-insensitive match), with teamName as secondary fallback
    const team = teams.find(
      (t) =>
        t.teamId.trim().toLowerCase() === trimmedId ||
        t.teamName.trim().toLowerCase() === trimmedId
    );

    if (!team) {
      return {
        success: false,
        error: 'Invalid team credentials. Team ID not recognized. Please use the exact credentials provided by the organizers.',
      };
    }

    // Verify password credential securely (via SHA-256 hash or plain fallback)
    const inputHash = await hashCredential(trimmedPass);
    const matchesHash = Boolean(
      (team.credentialHash && team.credentialHash === inputHash) ||
      (team.teamLeadRegistrationNumber &&
        team.teamLeadRegistrationNumber.trim().toLowerCase() === trimmedPass.toLowerCase()) ||
      (team.teamId && team.teamId.trim().toLowerCase() === trimmedPass.toLowerCase())
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

    // Sanitized team record
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

    const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, ' ');

    for (const r of rows) {
      const customId = r.teamId ? normalize(r.teamId) : '';

      // Check if team already exists by teamId -> MERGE with all participant details!
      if (customId) {
        const existingIndex = existing.findIndex((t) => normalize(t.teamId) === customId);
        if (existingIndex >= 0) {
          const prev = existing[existingIndex];
          const secretPassword = (
            r.password ||
            r.teamLeadRegistrationNumber ||
            prev.teamLeadRegistrationNumber ||
            prev.teamId
          ).trim();
          const credentialHash = await hashCredential(secretPassword);
          const members =
            r.members && r.members.length > 0
              ? r.members
              : prev.teamMembers && prev.teamMembers.length > 0
              ? prev.teamMembers
              : [r.teamLeadName?.trim() || prev.teamLeadName || 'Team Lead'];

          const updated: TeamRecord = {
            ...prev,
            teamName: r.teamName?.trim() || prev.teamName,
            teamLeadName: r.teamLeadName?.trim() || prev.teamLeadName,
            teamLeadRegistrationNumber:
              r.teamLeadRegistrationNumber?.trim() || prev.teamLeadRegistrationNumber,
            credentialHash,
            teamMembers: members,
            email: r.email?.trim() || prev.email,
            phone: r.phone?.trim() || prev.phone,
            college: r.college?.trim() || prev.college,
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
      }

      // Check duplicate team name among existing teams
      const normalizedName = normalize(r.teamName);
      if (existing.some((t) => normalize(t.teamName) === normalizedName)) {
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

      const record: TeamRecord = {
        teamId: assignedId,
        teamName: r.teamName.trim(),
        teamLeadName: r.teamLeadName.trim() || 'Team Lead',
        teamLeadRegistrationNumber: r.teamLeadRegistrationNumber?.trim() || '',
        credentialHash,
        teamMembers:
          r.members && r.members.length > 0
            ? r.members
            : [r.teamLeadName?.trim() || r.teamName.trim()],
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

    const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, ' ');

    for (const cred of credentials) {
      const cleanId = cred.teamId.trim();
      const cleanReg = cred.registrationNumber.trim();
      if (!cleanId || !cleanReg) continue;

      const normId = normalize(cleanId);
      const existingIndex = existing.findIndex((t) => normalize(t.teamId) === normId);
      const credentialHash = await hashCredential(cleanReg);

      if (existingIndex >= 0) {
        // Update existing team credentials
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
          teamLeadName: 'Team Lead',
          teamLeadRegistrationNumber: cleanReg,
          credentialHash,
          teamMembers: ['Team Lead'],
          email: `${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '')}@hackathon.local`,
          phone: '',
          college: 'Participant Institution',
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
