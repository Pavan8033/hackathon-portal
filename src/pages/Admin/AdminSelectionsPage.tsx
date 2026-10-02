import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  UserCheck,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { TeamService } from '../../services/teamService';
import { ProblemService } from '../../services/problemService';
import { SelectionService } from '../../services/selectionService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useEvent } from '../../context/EventContext';
import { formatSelectionDateTime } from '../../utils/formatters';
import type { TeamRecord, ProblemRecord, TeamSelection } from '../../types';

export const AdminSelectionsPage: React.FC = () => {
  const { admin } = useAuth();
  const { showToast } = useToast();
  const { eventConfig } = useEvent();

  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [selections, setSelections] = useState<TeamSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SELECTED' | 'NOT_SELECTED'>('ALL');
  const [problemFilter, setProblemFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | '7DAYS'>('ALL');

  // Manual Assignment Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assignProblemId, setAssignProblemId] = useState('');
  const [overrideLimit, setOverrideLimit] = useState(false);
  const [assignReason, setAssignReason] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Reset modal state
  const [resetModalTeam, setResetModalTeam] = useState<TeamRecord | null>(null);
  const [resetReason, setResetReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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
      console.error('[AdminSelectionsPage] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Section 31: Real-time updates
    const unsubscribe = SelectionService.subscribeToSelections((latest) => {
      setSelections(latest);
    });

    return () => unsubscribe();
  }, []);

  // Map selections by teamId for fast O(1) lookup
  const selectionMap = useMemo(() => {
    const map = new Map<string, TeamSelection>();
    selections.forEach((s) => map.set(s.teamId, s));
    return map;
  }, [selections]);

  // Categories list
  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(problems.map((p) => p.category)))];
  }, [problems]);

  // Section 20 & 21 & 32: Filtering Logic
  const filteredTeams = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return teams.filter((t) => {
      const sel = selectionMap.get(t.teamId);
      const isSelected = Boolean(sel || t.selectedProblemId);
      const probId = sel?.problemId || t.selectedProblemId || '';
      const probTitle = sel?.problemTitle || t.selectedProblemTitle || '';
      const selTimestamp = sel?.selectedAt || t.selectionDate || '';

      // 1. Status Filter
      if (statusFilter === 'SELECTED' && !isSelected) return false;
      if (statusFilter === 'NOT_SELECTED' && isSelected) return false;

      // 2. Problem Filter
      if (problemFilter !== 'ALL' && probId !== problemFilter) return false;

      // 3. Category Filter
      if (categoryFilter !== 'ALL') {
        const prob = problems.find((p) => p.problemId === probId);
        if (!prob || prob.category !== categoryFilter) return false;
      }

      // 4. Date Filter (Section 32: Today, Yesterday, Last 7 Days, All Time)
      if (dateFilter !== 'ALL' && isSelected && selTimestamp) {
        const selTime = new Date(selTimestamp).getTime();
        const diff = now - selTime;
        if (dateFilter === 'TODAY' && diff > oneDayMs) return false;
        if (dateFilter === 'YESTERDAY' && (diff <= oneDayMs || diff > 2 * oneDayMs)) return false;
        if (dateFilter === '7DAYS' && diff > 7 * oneDayMs) return false;
      }

      // 5. Search Filter (Section 20: Team Name, Team ID, Team Lead, Problem ID, Problem Title)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTeamName = t.teamName.toLowerCase().includes(q);
        const matchTeamId = t.teamId.toLowerCase().includes(q);
        const matchLead = t.teamLeadName.toLowerCase().includes(q);
        const matchProbId = probId.toLowerCase().includes(q);
        const matchProbTitle = probTitle.toLowerCase().includes(q);

        if (!matchTeamName && !matchTeamId && !matchLead && !matchProbId && !matchProbTitle) {
          return false;
        }
      }

      return true;
    });
  }, [teams, selectionMap, problems, statusFilter, problemFilter, categoryFilter, dateFilter, searchQuery]);

  // Section 22: Export to CSV (Admin only)
  const handleExportCsv = async () => {
    try {
      const csvContent = await SelectionService.exportSelectionsToCsv();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `hackathon_selections_export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('[AdminSelectionsPage] Export failed:', err);
      alert('Failed to generate CSV export.');
    }
  };

  // Handle Manual Assignment Modal
  const handleOpenAssignModal = (preselectedTeamId?: string) => {
    setAssignTeamId(preselectedTeamId || (teams.length > 0 ? teams[0].teamId : ''));
    setAssignProblemId(problems.length > 0 ? problems[0].problemId : '');
    setOverrideLimit(false);
    setAssignReason('');
    setAssignError(null);
    setIsAssignModalOpen(true);
  };

  const handleManualAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTeamId || !assignProblemId) {
      setAssignError('Please select both a team and a problem statement.');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    try {
      await SelectionService.manuallyAssignProblem(
        assignTeamId,
        assignProblemId,
        admin?.email || 'admin',
        {
          overrideLimit,
          reason: assignReason.trim() || 'Manual administrative assignment',
        }
      );

      const assignedTeam = teams.find((t) => t.teamId === assignTeamId);
      showToast(
        `Successfully assigned problem "${assignProblemId}" to ${assignedTeam?.teamName || assignTeamId}.`,
        'success',
        'Problem Assigned'
      );
      setIsAssignModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('[AdminSelectionsPage] Manual assign error:', err);
      setAssignError(err?.message || 'Failed to manually assign problem statement.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Section 24 & 25: Handle Reset Execution
  const handleResetSubmit = async () => {
    if (!resetModalTeam) return;

    if (!resetReason.trim()) {
      setResetError('Please specify an operational reason for resetting the selection.');
      return;
    }

    if (confirmText.trim().toUpperCase() !== 'RESET') {
      setResetError('Please type "RESET" in the confirmation box to proceed.');
      return;
    }

    setIsResetting(true);
    setResetError(null);

    try {
      await SelectionService.resetTeamSelection(
        resetModalTeam.teamId,
        admin?.email || 'admin',
        resetReason.trim()
      );

      setResetModalTeam(null);
      setResetReason('');
      setConfirmText('');
      await loadData();
    } catch (err: any) {
      console.error('[AdminSelectionsPage] Reset error:', err);
      setResetError(err?.message || 'Failed to reset team selection.');
    } finally {
      setIsResetting(false);
    }
  };

  const totalSelections = teams.filter((t) => Boolean(selectionMap.get(t.teamId) || t.selectedProblemId)).length;

  return (
    <AdminLayout
      title="Team Problem Selections"
      description="Monitor live challenge commitments, filter allocations, and manage team assignments."
      actionButton={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={() => handleOpenAssignModal()}
            leftIcon={<UserCheck className="w-4 h-4" />}
            className="shadow-2xs"
          >
            MANUALLY ASSIGN PROBLEM
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-4 h-4" />}
            className="bg-white shadow-2xs"
          >
            EXPORT SELECTIONS
          </Button>
        </div>
      }
    >
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
            Confirmed Allocations
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#164A36] mt-1 font-sans">
            {isLoading ? '...' : `${totalSelections} / ${teams.length}`}
          </div>
          <p className="text-xs text-[#667085] mt-1">Teams permanently committed to a challenge</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
            Awaiting Choice
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#111827] mt-1 font-sans">
            {isLoading ? '...' : Math.max(0, teams.length - totalSelections)}
          </div>
          <p className="text-xs text-[#667085] mt-1">Teams currently browsing published tracks</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
            Allocation Ratio
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#164A36] mt-1 font-sans">
            {teams.length > 0 ? `${Math.round((totalSelections / teams.length) * 100)}%` : '0%'}
          </div>
          <p className="text-xs text-[#667085] mt-1">Overall team participation conversion</p>
        </div>
      </div>

      {/* Toolbar: Search & Filters (Sections 20, 21, 32) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Section 20: Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Team Name, ID, Lead, or Problem ID..."
              className="w-full pl-10 pr-10 py-2 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 text-xs sm:text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#667085] hover:text-[#111827]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Section 21 & 32: Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
            >
              <option value="ALL">All Teams</option>
              <option value="SELECTED">Selected Only</option>
              <option value="NOT_SELECTED">Not Selected</option>
            </select>

            {/* Problem Filter */}
            <select
              value={problemFilter}
              onChange={(e) => setProblemFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36] max-w-[150px] truncate"
            >
              <option value="ALL">All Problems</option>
              {problems.map((p) => (
                <option key={p.problemId} value={p.problemId}>
                  {p.problemId}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36] max-w-[150px] truncate"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Categories' : c}
                </option>
              ))}
            </select>

            {/* Section 32: Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="7DAYS">Last 7 Days</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between text-xs text-[#667085] pt-2 border-t border-[#F3F4F6]">
          <span>
            Showing <strong>{filteredTeams.length}</strong> of <strong>{teams.length}</strong> teams
          </span>

          {(searchQuery || statusFilter !== 'ALL' || problemFilter !== 'ALL' || categoryFilter !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setProblemFilter('ALL');
                setCategoryFilter('ALL');
                setDateFilter('ALL');
              }}
              className="text-[#164A36] font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Section 19: TEAM SELECTIONS TABLE */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#111827] tracking-wider uppercase">
            TEAM SELECTIONS
          </h2>
          <span className="text-xs font-mono text-[#667085]">
            Live Roster Allocation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F5EF] border-b border-[#E5E7EB] text-[#667085] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Team ID</th>
                <th className="py-3.5 px-4">Team Name</th>
                <th className="py-3.5 px-4">Team Lead</th>
                <th className="py-3.5 px-4">Problem ID</th>
                <th className="py-3.5 px-4">Selected Problem</th>
                <th className="py-3.5 px-4">Selected At</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#667085]">
                    Loading team selections...
                  </td>
                </tr>
              ) : filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#667085]">
                    No teams have selected a problem yet.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => {
                  const sel = selectionMap.get(team.teamId);
                  const isSelected = Boolean(sel || team.selectedProblemId);
                  const probId = sel?.problemId || team.selectedProblemId || '—';
                  const probTitle = sel?.problemTitle || team.selectedProblemTitle || 'Not selected';
                  const timeFormatted = formatSelectionDateTime(sel?.selectedAt || team.selectionDate);

                  return (
                    <tr key={team.teamId} className="hover:bg-[#F7F5EF]/40 transition-colors">
                      {/* Team ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#164A36]">
                        <Link
                          to={`/admin/participants/${team.teamId}`}
                          className="hover:underline"
                        >
                          {team.teamId}
                        </Link>
                      </td>

                      {/* Team Name */}
                      <td className="py-3.5 px-4 font-bold text-[#111827]">
                        <Link
                          to={`/admin/participants/${team.teamId}`}
                          className="hover:text-[#164A36]"
                        >
                          {team.teamName}
                        </Link>
                      </td>

                      {/* Team Lead */}
                      <td className="py-3.5 px-4 text-[#4B5563]">
                        {team.teamLeadName}
                      </td>

                      {/* Problem ID */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {isSelected ? (
                          <span className="text-[#164A36] bg-[#EEF5F0] px-2 py-0.5 rounded border border-[#D5E6DB]">
                            {probId}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Selected Problem Title */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-[#111827]">
                        {probTitle}
                      </td>

                      {/* Selected At */}
                      <td className="py-3.5 px-4 text-[#667085] whitespace-nowrap">
                        {isSelected ? timeFormatted.combined : '—'}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB]">
                            <CheckCircle2 className="w-3 h-3" />
                            SELECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            <Clock className="w-3 h-3" />
                            NOT SELECTED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/participants/${team.teamId}`}
                            className="p-1.5 text-[#667085] hover:text-[#164A36] rounded-md hover:bg-[#EEF5F0]"
                            title="View Team Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Manual Assignment / Reassignment Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(team.teamId)}
                            className={
                              isSelected
                                ? 'inline-flex items-center gap-1 px-2 py-1 rounded bg-[#EEF5F0] text-[#164A36] hover:bg-[#D5E6DB] font-semibold border border-[#D5E6DB] transition-colors text-xs'
                                : 'inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#164A36] text-white hover:bg-[#0E3324] font-semibold transition-colors text-xs shadow-2xs'
                            }
                            title={isSelected ? 'Reassign problem to this team' : 'Manually assign problem to this team'}
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>{isSelected ? 'Reassign' : 'Assign'}</span>
                          </button>

                          {isSelected && (
                            /* Section 24: Admin Reset Selection Trigger */
                            <button
                              type="button"
                              onClick={() => {
                                setResetModalTeam(team);
                                setResetReason('');
                                setConfirmText('');
                                setResetError(null);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200 transition-colors"
                              title="Reset Team Problem Selection"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MANUAL PROBLEM ASSIGNMENT MODAL */}
      {/* ========================================================= */}
      {isAssignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E5E7EB] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB] flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#111827]">
                    Manually Assign Problem
                  </h3>
                  <p className="text-xs text-[#667085]">
                    Allocate or reassign an official challenge statement to a team.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-[#667085] hover:text-[#111827]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAssignSubmit} className="space-y-4 pt-4">
              {/* Select Target Team */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Target Team
                </label>
                <select
                  value={assignTeamId}
                  onChange={(e) => setAssignTeamId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                  required
                >
                  <option value="" disabled>Select a team...</option>
                  {teams.map((t) => {
                    const sel = selectionMap.get(t.teamId);
                    return (
                      <option key={t.teamId} value={t.teamId}>
                        {t.teamName} ({t.teamId}) {sel ? `[Current: ${sel.problemId}]` : '[Unassigned]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Select Problem Statement */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Problem Statement
                </label>
                <select
                  value={assignProblemId}
                  onChange={(e) => setAssignProblemId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                  required
                >
                  <option value="" disabled>Select a problem statement...</option>
                  {problems.map((p) => {
                    const count = selections.filter((s) => s.problemId === p.problemId).length;
                    const limit = eventConfig.problemSelectionLimit || 2;
                    const isFull = count >= limit;
                    return (
                      <option key={p.problemId} value={p.problemId}>
                        [{p.problemId}] {p.title} ({count}/{limit} slots {isFull ? '• FULL' : 'open'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Problem Capacity Indicator */}
              {assignProblemId && (() => {
                const count = selections.filter((s) => s.problemId === assignProblemId).length;
                const limit = eventConfig.problemSelectionLimit || 2;
                const isFull = count >= limit;
                return (
                  <div className={`p-3 rounded-xl border text-xs ${isFull ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-[#EEF5F0] border-[#D5E6DB] text-[#164A36]'}`}>
                    <div className="font-bold flex items-center justify-between">
                      <span>Problem Allocation Status</span>
                      <span>{count} / {limit} teams assigned</span>
                    </div>
                    {isFull && (
                      <p className="mt-1 text-[11px] text-amber-800">
                        This challenge has reached the default limit of {limit} teams. Check "Admin Limit Override" below to assign anyway.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Override Checkbox */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="overrideLimitCheckbox"
                  checked={overrideLimit}
                  onChange={(e) => setOverrideLimit(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#164A36] focus:ring-[#164A36]"
                />
                <label htmlFor="overrideLimitCheckbox" className="text-xs font-semibold text-[#111827] cursor-pointer">
                  Admin Limit Override (allow assignment beyond limit)
                </label>
              </div>

              {/* Assignment Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Reason / Operational Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special track qualification, team restructuring"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              {assignError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {assignError}
                </div>
              )}

              <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAssignModalOpen(false)}
                  disabled={isAssigning}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isAssigning || !assignTeamId || !assignProblemId}
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section 24 & 25: ADMIN SELECTION RESET CONFIRMATION MODAL */}
      {resetModalTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E5E7EB] animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F3F4F6]">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                  Authoritative Admin Action
                </span>
                <h3 id="reset-modal-title" className="text-lg font-bold text-[#111827] tracking-tight uppercase">
                  RESET TEAM SELECTION?
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-4 text-xs sm:text-sm text-[#4B5563]">
              <p className="leading-relaxed">
                This will remove the current problem selection for <strong>{resetModalTeam.teamName}</strong> ({resetModalTeam.teamId}). The team will be allowed to select a new problem statement.
              </p>

              {/* Reason input per Section 25 */}
              <div className="space-y-1.5 text-left">
                <label className="font-bold text-[#111827] block text-xs uppercase tracking-wider">
                  Audit Reason (Mandatory)
                </label>
                <input
                  type="text"
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="e.g. Team selected wrong problem by mistake."
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Explicit confirmation per Section 24 */}
              <div className="space-y-1.5 text-left">
                <label className="font-bold text-[#111827] block text-xs uppercase tracking-wider">
                  Type <span className="font-mono text-rose-600">RESET</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type RESET"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {resetError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {resetError}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#F3F4F6] flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => {
                  if (!isResetting) setResetModalTeam(null);
                }}
                disabled={isResetting}
              >
                Cancel
              </Button>

              <button
                type="button"
                onClick={handleResetSubmit}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'CONFIRM RESET'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
