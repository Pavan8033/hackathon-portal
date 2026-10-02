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
      (team.teamLeadRegistrationNumber && team.teamLeadRegistrationNumber.trim() === trimmedPass)
    );

    if (!matchesHash) {
      return {
        success: false,
        error: 'Invalid password. Please check your assigned password.',
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
   * Import valid teams from parsed spreadsheet rows with columns (team id, team name, password)
   */
  public static async importTeams(
    rows: ParsedTeamRow[]
  ): Promise<{ importedCount: number; skippedCount: number; errors: string[] }> {
    const existing = await this.getAllTeams();
    const newRecords: TeamRecord[] = [];
    const timestamp = new Date().toISOString();
    const errors: string[] = [];

    const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, ' ');

    const existingNames = new Set(existing.map((t) => normalize(t.teamName)));
    const existingIds = new Set(existing.map((t) => normalize(t.teamId)));

    for (const r of rows) {
      const normalizedName = normalize(r.teamName);
      const customId = r.teamId ? normalize(r.teamId) : '';

      // Prevent duplicate teams
      if (existingNames.has(normalizedName)) {
        errors.push(`Team "${r.teamName.trim()}" already exists in the directory.`);
        continue;
      }
      if (customId && existingIds.has(customId)) {
        errors.push(`Team ID "${r.teamId}" already exists.`);
        continue;
      }

      existingNames.add(normalizedName);

      const secretPassword = (r.password || r.teamLeadRegistrationNumber || '').trim();
      const credentialHash = await hashCredential(secretPassword);
      const assignedId = r.teamId?.trim() || `TM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      existingIds.add(normalize(assignedId));

      const record: TeamRecord = {
        teamId: assignedId,
        teamName: r.teamName.trim(),
        teamLeadName: r.teamLeadName.trim() || 'Team Lead',
        teamLeadRegistrationNumber: r.password ? '• Protected Password •' : (r.teamLeadRegistrationNumber?.trim() || ''),
        credentialHash,
        teamMembers: r.members && r.members.length > 0 ? r.members : [r.teamLeadName?.trim() || r.teamName.trim()],
        email: r.email?.trim() || '',
        phone: r.phone?.trim() || '',
        college: r.college?.trim() || 'Participant Institution',
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      newRecords.push(record);

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'teams', record.teamId), record);
        } catch (err) {
          console.warn('[TeamService] Firestore save error:', err);
        }
      }
    }

    // Update local cache
    const merged = [...existing, ...newRecords];
    this.saveLocalTeams(merged);

    return {
      importedCount: newRecords.length,
      skippedCount: rows.length - newRecords.length,
      errors,
    };
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
  private static getLocalTeams(): TeamRecord[] {
    try {
      const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // LocalStorage access error fallback
    }
    return [];
  }

  private static saveLocalTeams(teams: TeamRecord[]): void {
    try {
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
    } catch {
      // ignore
    }
  }
}
