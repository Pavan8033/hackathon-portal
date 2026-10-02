import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  Building,
  Lock,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  X,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TeamService } from '../../services/teamService';
import { SelectionService } from '../../services/selectionService';
import { ProblemService } from '../../services/problemService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatSelectionDateTime } from '../../utils/formatters';
import type { TeamRecord, TeamSelection, ProblemRecord } from '../../types';

export const AdminTeamDetailPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const { showToast } = useToast();

  const [team, setTeam] = useState<TeamRecord | null>(null);
  const [selection, setSelection] = useState<TeamSelection | null>(null);
  const [problem, setProblem] = useState<ProblemRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reset Selection Modal State (Sections 24 & 25)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const loadData = async () => {
    if (!teamId) return;
    setIsLoading(true);
    try {
      const teams = await TeamService.getAllTeams();
      const currentTeam = teams.find((t) => t.teamId === teamId);
      setTeam(currentTeam || null);

      if (currentTeam) {
        const teamSelection = await SelectionService.getSelectionForTeam(teamId);
        setSelection(teamSelection);

        if (teamSelection?.problemId) {
          const problemData = await ProblemService.getProblemById(teamSelection.problemId);
          setProblem(problemData);
        } else {
          setProblem(null);
        }
      }
    } catch (err) {
      console.error('Failed to load team details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [teamId]);

  // Handle Selection Reset
  const handleConfirmReset = async () => {
    if (!team || !selection) return;
    if (resetConfirmWord !== 'RESET') {
      showToast('Please type RESET to confirm this dangerous operation.', 'warning', 'Confirmation Required');
      return;
    }
    if (!resetReason.trim()) {
      showToast('A reason is mandatory for auditing purposes.', 'warning', 'Reason Required');
      return;
    }

    setIsResetting(true);
    try {
      await SelectionService.resetTeamSelection(
        team.teamId,
        admin?.email || 'admin',
        resetReason.trim()
      );
      showToast(
        `Selection for ${team.teamName} has been reset successfully.`,
        'success',
        'Selection Reset'
      );
      setIsResetModalOpen(false);
      setResetReason('');
      setResetConfirmWord('');
      await loadData();
    } catch (err: any) {
      showToast(
        err.message || 'Failed to reset team selection.',
        'error',
        'Reset Failed'
      );
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Team Details" description="Loading team roster and problem selection record...">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-[#667085]">
          Loading team profile and selection status...
        </div>
      </AdminLayout>
    );
  }

  if (!team) {
    return (
      <AdminLayout title="Team Not Found" description="No registered team matches this identifier.">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#111827]">Team Not Found</h3>
          <p className="text-sm text-[#667085] mt-1">
            Could not locate any team matching identifier <span className="font-mono font-semibold">{teamId}</span>.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button to="/admin/participants" variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Participants
            </Button>
            <Button to="/admin/selections" variant="primary" size="sm">
              View All Selections
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Team: ${team.teamName}`}
      description={`Directory Record ID: ${team.teamId} • Credential: ${team.teamLeadRegistrationNumber || (team.credentialHash ? 'Secured (SHA-256)' : 'Protected')}`}
      actionButton={
        <div className="flex items-center gap-3">
          <Button to="/admin/participants" variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Participants
          </Button>
          <Button to="/admin/selections" variant="outline" size="sm">
            Selections Table
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl">
        {/* Back link */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#164A36] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to previous list
          </button>
        </div>

        {/* 1. TEAM DETAILS CARD (Section 23) */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#E5E7EB] gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#164A36] bg-[#EEF5F0] px-2.5 py-1 rounded-md border border-[#D5E6DB]">
                  {team.teamId}
                </span>
                <Badge variant={team.status === 'active' ? 'subtle' : 'amber'} size="sm">
                  {team.status === 'active' ? 'ACCOUNT ACTIVE' : 'ACCOUNT INACTIVE'}
                </Badge>
              </div>
              <h2 className="text-2xl font-extrabold text-[#111827] mt-2">
                {team.teamName}
              </h2>
              <p className="text-xs sm:text-sm text-[#667085] mt-1 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#9CA3AF]" />
                {team.college || 'Institution unassigned'}
              </p>
            </div>

            <div className="text-left sm:text-right bg-[#F7F5EF] p-4 rounded-xl border border-[#E5E7EB]/80 min-w-[200px]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Registration Credential
              </span>
              <span className="text-sm font-mono font-bold text-[#164A36] mt-0.5 block">
                {team.teamLeadRegistrationNumber || (team.credentialHash ? 'Encrypted / Hashed' : 'Protected')}
              </span>
              <span className="text-[10px] text-[#9CA3AF] mt-0.5 block">
                {team.credentialHash ? '(SHA-256 Secured Hash)' : '(Used as login password)'}
              </span>
            </div>
          </div>

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-[#E5E7EB]">
            <div>
              <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider block mb-1">
                Team Leader
              </span>
              <span className="text-sm font-bold text-[#111827] block">
                {team.teamLeadName}
              </span>
              <span className="text-xs text-[#667085] block mt-0.5">
                Lead Representative
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider block mb-1">
                Email Address
              </span>
              {team.email ? (
                <a
                  href={`mailto:${team.email}`}
                  className="text-sm font-medium text-[#164A36] hover:underline flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-[#164A36]" />
                  {team.email}
                </a>
              ) : (
                <span className="text-xs text-[#9CA3AF]">Not provided</span>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider block mb-1">
                Phone Number
              </span>
              {team.phone ? (
                <a
                  href={`tel:${team.phone}`}
                  className="text-sm font-medium text-[#111827] flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-[#667085]" />
                  {team.phone}
                </a>
              ) : (
                <span className="text-xs text-[#9CA3AF]">Not provided</span>
              )}
            </div>
          </div>

          {/* Members Roster */}
          <div className="pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#164A36]" />
              Team Members ({team.teamMembers?.length || 1})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {team.teamMembers && team.teamMembers.length > 0 ? (
                team.teamMembers.map((memberName, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#111827]">
                        {memberName}
                        {memberName === team.teamLeadName && (
                          <span className="ml-1.5 text-[10px] bg-[#164A36] text-white px-1.5 py-0.5 rounded font-mono font-normal">
                            LEAD
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40">
                  <div className="text-xs font-bold text-[#111827]">{team.teamLeadName}</div>
                  <div className="text-[11px] text-[#667085]">Team Lead (Sole Member)</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. PROBLEM SELECTION SECTION (Sections 23, 24, 25) */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E5E7EB] gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#667085] block">
                Official Hackathon Challenge
              </span>
              <h2 className="text-xl font-extrabold text-[#111827] mt-1">
                Problem Statement Selection
              </h2>
            </div>

            {selection ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB]">
                  <Lock className="w-3.5 h-3.5" />
                  STATUS: LOCKED
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Reset Selection
                </Button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                NOT SELECTED
              </span>
            )}
          </div>

          {selection ? (
            <div className="mt-6 space-y-6">
              {/* Highlight Banner */}
              <div className="p-5 rounded-2xl bg-[#EEF5F0]/60 border border-[#D5E6DB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#164A36] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 h-5 text-emerald-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#164A36] bg-white px-2 py-0.5 rounded border border-[#D5E6DB]">
                        {selection.problemId}
                      </span>
                      <span className="text-xs font-semibold text-[#667085]">
                        {selection.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-[#111827] mt-1">
                      {selection.problemTitle}
                    </h3>
                    <p className="text-xs text-[#667085] mt-1">
                      Locked at: <span className="font-medium text-[#111827]">{formatSelectionDateTime(selection.selectedAt).combined}</span> by{' '}
                      <span className="font-medium text-[#111827]">{selection.selectedBy || selection.teamLeadName}</span>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    to={`/admin/problems`}
                    variant="outline"
                    size="sm"
                  >
                    View Problem Master
                  </Button>
                </div>
              </div>

              {/* Problem Brief / Description */}
              {problem && (
                <div className="p-5 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                    Problem Overview
                  </h4>
                  <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed line-clamp-4">
                    {problem.description}
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-[#667085]">
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E5E7EB] font-medium">
                      Difficulty: {problem.difficulty || 'Intermediate'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E5E7EB] font-medium">
                      Status: {problem.status}
                    </span>
                    {problem.fileName && (
                      <span className="px-2 py-0.5 rounded bg-white border border-[#E5E7EB] font-medium flex items-center gap-1">
                        Attachment: {problem.fileName}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#111827]">
                No Problem Statement Selected
              </h3>
              <p className="text-xs sm:text-sm text-[#667085] max-w-md mx-auto mt-1">
                {team.teamName} has not confirmed their hackathon problem selection yet. Once they confirm on the participant portal, their selection will automatically lock here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ADMIN SELECTION RESET CONFIRMATION MODAL (Sections 24 & 25) */}
      {/* ========================================================= */}
      {isResetModalOpen && selection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-red-200 relative">
            <button
              onClick={() => {
                if (!isResetting) {
                  setIsResetModalOpen(false);
                  setResetReason('');
                  setResetConfirmWord('');
                }
              }}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#667085] hover:text-[#111827] hover:bg-[#F7F5EF]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-red-700">
                  DANGEROUS OPERATION
                </span>
                <h3 className="text-lg font-extrabold text-[#111827]">
                  Reset Team Selection?
                </h3>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">
              <p className="font-bold">
                This will remove {team.teamName}'s current problem selection ({selection.problemId}).
              </p>
              <p className="mt-1">
                The team will be allowed to log into the portal and select a new problem statement. An audit log record will be permanently generated.
              </p>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">
                  Reason for Reset <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="e.g. Team selected wrong problem by mistake during registration round..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">
                  Type <span className="font-mono text-red-600">RESET</span> to confirm <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={resetConfirmWord}
                  onChange={(e) => setResetConfirmWord(e.target.value)}
                  placeholder="RESET"
                  className="w-full px-3 py-2 font-mono text-xs uppercase rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetReason('');
                  setResetConfirmWord('');
                }}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReset}
                disabled={resetConfirmWord !== 'RESET' || !resetReason.trim() || isResetting}
                className="bg-red-700 hover:bg-red-800 text-white border-transparent"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Confirm Reset Selection
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
