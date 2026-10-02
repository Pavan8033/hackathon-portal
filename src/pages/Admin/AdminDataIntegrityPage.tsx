import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  AlertCircle,
  FileQuestion,
  Users,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TeamService } from '../../services/teamService';
import { ProblemService } from '../../services/problemService';
import { SelectionService } from '../../services/selectionService';
import { AuditService } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { TeamRecord, ProblemRecord, TeamSelection } from '../../types';

interface OrphanSelectionIssue {
  selection: TeamSelection;
  reason: 'MISSING_TEAM' | 'MISSING_PROBLEM';
  details: string;
}

interface DuplicateTeamIssue {
  normalizedName: string;
  teams: TeamRecord[];
}

export const AdminDataIntegrityPage: React.FC = () => {
  const { admin } = useAuth();
  const { showToast } = useToast();
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [selections, setSelections] = useState<TeamSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Resolution modal / confirmation
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [t, p, s] = await Promise.all([
        TeamService.getAllTeams(),
        ProblemService.getAllProblems({ forParticipant: false }),
        SelectionService.getAllSelections(),
      ]);
      setTeams(t);
      setProblems(p);
      setSelections(s);
    } catch (err) {
      console.error('Failed to load integrity audit data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Detect Duplicate Teams (Normalized Name or Duplicate ID)
  const duplicateTeams = useMemo(() => {
    const map = new Map<string, TeamRecord[]>();
    teams.forEach((t) => {
      const norm = (t.teamName || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const group = map.get(norm) || [];
      group.push(t);
      map.set(norm, group);
    });

    const duplicates: DuplicateTeamIssue[] = [];
    map.forEach((group, norm) => {
      if (group.length > 1) {
        duplicates.push({ normalizedName: norm, teams: group });
      }
    });
    return duplicates;
  }, [teams]);

  // 2. Detect Orphaned Selections (Team doesn't exist OR problem doesn't exist)
  const orphanedSelections = useMemo(() => {
    const teamIds = new Set(teams.map((t) => t.teamId));
    const problemIds = new Set(problems.map((p) => p.problemId));

    const orphans: OrphanSelectionIssue[] = [];
    selections.forEach((sel) => {
      const teamExists = teamIds.has(sel.teamId);
      const problemExists = problemIds.has(sel.problemId);

      if (!teamExists) {
        orphans.push({
          selection: sel,
          reason: 'MISSING_TEAM',
          details: `Team record "${sel.teamId}" does not exist in teams directory.`,
        });
      } else if (!problemExists) {
        orphans.push({
          selection: sel,
          reason: 'MISSING_PROBLEM',
          details: `Problem "${sel.problemId}" does not exist in problems database.`,
        });
      }
    });
    return orphans;
  }, [teams, problems, selections]);

  // 3. Detect Missing Documents on Published Problems
  const missingDocumentProblems = useMemo(() => {
    return problems
      .filter((p) => p.status === 'PUBLISHED' && !p.fileName && !p.fileUrl)
      .map((p) => ({ problem: p }));
  }, [problems]);

  const totalIssues =
    duplicateTeams.length + orphanedSelections.length + missingDocumentProblems.length;

  // Resolve Orphaned Selection Action (Step 9 #36)
  const handleResolveOrphan = (orphan: OrphanSelectionIssue) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Orphaned Selection Record?',
      message: `The selection record for team "${orphan.selection.teamName}" (${orphan.selection.teamId}) references an entity that no longer exists (${orphan.details}). Would you like to safely remove this orphaned selection?`,
      confirmText: 'Remove Orphan Selection',
      onConfirm: async () => {
        try {
          await SelectionService.resetTeamSelection(
            orphan.selection.teamId,
            admin?.email || 'admin',
            `Integrity cleanup: ${orphan.details}`
          );
          await AuditService.logAction({
            action: 'DATA_CLEANUP',
            adminId: admin?.email || 'admin',
            target: orphan.selection.teamId,
            details: `Cleaned up orphaned selection for team "${orphan.selection.teamName}"`,
          });
          showToast('Orphaned selection record resolved.', 'success');
          await loadData();
        } catch (err: any) {
          showToast(err?.message || 'Resolution failed.', 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Resolve Duplicate Team
  const handleRemoveDuplicateTeam = (teamToRemove: TeamRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: `Deactivate Duplicate Team "${teamToRemove.teamName}"?`,
      message: `This will mark duplicate team ${teamToRemove.teamId} (${teamToRemove.teamName}) as inactive to prevent conflicting selections.`,
      confirmText: 'Deactivate Duplicate',
      onConfirm: async () => {
        try {
          await TeamService.deactivateTeam(teamToRemove.teamId);
          await AuditService.logAction({
            action: 'DATA_CLEANUP',
            adminId: admin?.email || 'admin',
            target: teamToRemove.teamId,
            details: `Deactivated duplicate team "${teamToRemove.teamName}" (${teamToRemove.teamId})`,
          });
          showToast(`Duplicate team "${teamToRemove.teamId}" deactivated.`, 'success');
          await loadData();
        } catch (err: any) {
          showToast(err?.message || 'Deactivation failed.', 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <AdminLayout
      title="DATABASE INTEGRITY & DATA CLEANUP"
      description="Inspect data consistency, audit orphaned selections, identify team collisions, and maintain spotless production database records."
      actionButton={
        <Button
          variant="secondary"
          size="md"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={loadData}
          className="bg-white"
        >
          Re-scan Database
        </Button>
      }
    >
      {/* Overview Status Banner */}
      <div className="mb-8">
        {isLoading ? (
          <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] animate-pulse h-28" />
        ) : totalIssues === 0 ? (
          <div className="p-6 sm:p-7 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white text-[#164A36] border border-[#D5E6DB] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#164A36]">
                  Database Integrity 100% Verified
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] mt-0.5">
                  No duplicate teams, no orphaned selections, and all published problems have intact specifications.
                </p>
              </div>
            </div>
            <Badge variant="forest" size="md">
              HEALTHY
            </Badge>
          </div>
        ) : (
          <div className="p-6 sm:p-7 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-amber-900">
                  Data Integrity Issues Detected ({totalIssues})
                </h3>
                <p className="text-xs sm:text-sm text-amber-700 mt-0.5">
                  Review discrepancies below and selectively resolve them with confirmation. No data is deleted automatically.
                </p>
              </div>
            </div>
            <Badge variant="amber" size="md">
              ACTION RECOMMENDED
            </Badge>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* SECTION 1: ORPHANED SELECTIONS (Step 9 #36) */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6] mb-5">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Orphaned Problem Selections ({orphanedSelections.length})
                </h3>
                <p className="text-xs text-[#667085]">
                  Selection records where either the team or problem statement record is missing in the database.
                </p>
              </div>
            </div>
          </div>

          {orphanedSelections.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#667085]">
              ✓ No orphaned selections found. Every selection references a valid team and problem statement.
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {orphanedSelections.map((orphan, idx) => (
                <div
                  key={idx}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {orphan.reason}
                      </span>
                      <span className="font-bold text-sm text-[#111827]">
                        Team: {orphan.selection.teamName} ({orphan.selection.teamId})
                      </span>
                    </div>
                    <p className="text-xs text-[#667085] mt-1">
                      Problem: <span className="font-mono text-[#164A36]">{orphan.selection.problemId}</span> — {orphan.details}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleResolveOrphan(orphan)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                      className="bg-white text-rose-700 hover:bg-rose-50 border-rose-200"
                    >
                      Resolve Orphan
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: DUPLICATE TEAMS (Step 9 #19) */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6] mb-5">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#164A36]" />
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Duplicate Team Names ({duplicateTeams.length})
                </h3>
                <p className="text-xs text-[#667085]">
                  Teams sharing identical normalized names (case-insensitive and trimmed whitespace comparison).
                </p>
              </div>
            </div>
          </div>

          {duplicateTeams.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#667085]">
              ✓ All team names in the participant directory are unique.
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateTeams.map((group, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
                  <span className="text-xs font-bold text-[#111827] uppercase tracking-wider block mb-2">
                    Normalized Key: "{group.normalizedName}" ({group.teams.length} instances)
                  </span>

                  <div className="space-y-2">
                    {group.teams.map((tm) => (
                      <div
                        key={tm.teamId}
                        className="bg-white p-3 rounded-lg border border-[#E5E7EB] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#111827]">{tm.teamName}</span>
                          <span className="font-mono text-[#667085] ml-2">ID: {tm.teamId}</span>
                          <span className="text-[#667085] ml-2">Lead: {tm.teamLeadName}</span>
                          <span className={`ml-2 font-semibold ${tm.status === 'active' ? 'text-emerald-700' : 'text-gray-500'}`}>
                            ({tm.status})
                          </span>
                        </div>

                        {tm.status === 'active' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRemoveDuplicateTeam(tm)}
                            className="bg-white text-xs"
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: PUBLISHED PROBLEMS WITHOUT DOCUMENTS */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6] mb-5">
            <div className="flex items-center gap-2.5">
              <FileQuestion className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Published Problems Without Attachments ({missingDocumentProblems.length})
                </h3>
                <p className="text-xs text-[#667085]">
                  Challenges currently visible to participants without an uploaded source file (.pdf, .docx, .xlsx).
                </p>
              </div>
            </div>
          </div>

          {missingDocumentProblems.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#667085]">
              ✓ All published problem statements have official document attachments.
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {missingDocumentProblems.map((issue) => (
                <div
                  key={issue.problem.problemId}
                  className="py-3.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-[#164A36]">
                      {issue.problem.problemId}
                    </span>
                    <span className="font-bold text-[#111827] ml-2">
                      {issue.problem.title}
                    </span>
                    <span className="text-[#667085] ml-2">
                      ({issue.problem.category})
                    </span>
                  </div>

                  <Button
                    to={`/admin/problems/edit/${issue.problem.problemId}`}
                    variant="secondary"
                    size="sm"
                    className="bg-white"
                  >
                    Attach Document
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDangerous
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
      />
    </AdminLayout>
  );
};
