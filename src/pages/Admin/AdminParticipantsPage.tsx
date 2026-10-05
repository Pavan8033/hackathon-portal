import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  Search,
  Filter,
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  X,
  Eye,
  UserX,
  UserCheck,
  Trash2,
  FileSpreadsheet,
  Download,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TeamService } from '../../services/teamService';
import { FileParserService } from '../../services/fileParserService';
import { useToast } from '../../context/ToastContext';
import type { TeamRecord, ImportValidationSummary } from '../../types';

export const AdminParticipantsPage: React.FC = () => {
  const { showToast } = useToast();
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Import Modal & Preview state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedSummary, setParsedSummary] = useState<ImportValidationSummary | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected Team Details Modal
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null);

  // Reset Credentials Modal
  const [credentialTeam, setCredentialTeam] = useState<TeamRecord | null>(null);
  const [newRegNumber, setNewRegNumber] = useState('');

  // Delete Confirm Dialog
  const [teamToDelete, setTeamToDelete] = useState<TeamRecord | null>(null);

  // Bulk Selection and Multi-action State
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const loadTeams = async () => {
    setIsLoading(true);
    const data = await TeamService.getAllTeams();
    setTeams(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // -------------------------------------------------------------
  // File Upload & Parsing Handler (Parts 4, 5, 6)
  // -------------------------------------------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers onChange every time
    e.target.value = '';

    setUploadedFileName(file.name);
    setIsParsing(true);

    try {
      const existingNames = teams.map((t) => t.teamName);
      const existingIds = teams.map((t) => t.teamId);
      const summary = await FileParserService.parseParticipantFile(file, {
        existingTeamNames: existingNames,
        existingTeamIds: existingIds,
      });
      setParsedSummary(summary);
    } catch (err: any) {
      showToast(err?.message || 'Failed to parse file.', 'error', 'Import Error');
      setParsedSummary(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportValidTeams = async () => {
    if (!parsedSummary || parsedSummary.validTeams.length === 0) return;

    setIsLoading(true);
    try {
      const res = await TeamService.importTeams(parsedSummary.validTeams);
      showToast(
        `Successfully imported ${res.importedCount} teams into hackathon directory.`,
        'success',
        'Import Completed'
      );
      setIsImportModalOpen(false);
      setParsedSummary(null);
      setUploadedFileName('');
      await loadTeams();
    } catch (err: any) {
      showToast(err?.message || 'Failed to import teams.', 'error', 'Import Failed');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Team Actions: Deactivate, Reset, Delete (Part 7)
  // -------------------------------------------------------------
  const handleToggleStatus = async (team: TeamRecord) => {
    const newStatus = team.status === 'active' ? 'inactive' : 'active';
    await TeamService.updateTeamStatus(team.teamId, newStatus);
    showToast(
      `Team "${team.teamName}" is now ${newStatus.toUpperCase()}.`,
      'info',
      'Status Updated'
    );
    await loadTeams();
  };

  const handleResetCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialTeam || !newRegNumber.trim()) return;

    await TeamService.resetTeamCredentials(credentialTeam.teamId, newRegNumber.trim());
    showToast(
      `Credentials for "${credentialTeam.teamName}" updated to ${newRegNumber.trim()}`,
      'success',
      'Password Reset'
    );
    setCredentialTeam(null);
    setNewRegNumber('');
    await loadTeams();
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;
    await TeamService.deleteTeam(teamToDelete.teamId);
    showToast(`Team "${teamToDelete.teamName}" removed.`, 'info', 'Team Removed');
    setTeamToDelete(null);
    await loadTeams();
  };

  // Bulk Selection Helpers & Bulk Actions
  const handleToggleSelectAll = () => {
    if (selectedTeamIds.size === filteredTeams.length && filteredTeams.length > 0) {
      setSelectedTeamIds(new Set());
    } else {
      setSelectedTeamIds(new Set(filteredTeams.map((t) => t.teamId)));
    }
  };

  const handleToggleRow = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedTeamIds.size === 0) return;
    setIsDeletingBulk(true);
    try {
      const idsToDelete = Array.from(selectedTeamIds);
      for (const id of idsToDelete) {
        await TeamService.deleteTeam(id);
      }
      showToast(`Successfully removed ${idsToDelete.length} teams.`, 'success', 'Bulk Delete Completed');
      setSelectedTeamIds(new Set());
      setIsBulkDeleteModalOpen(false);
      await loadTeams();
    } catch (err: any) {
      showToast(err?.message || 'Failed to remove selected teams.', 'error', 'Delete Error');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkToggleStatus = async (newStatus: 'active' | 'inactive') => {
    if (selectedTeamIds.size === 0) return;
    try {
      const ids = Array.from(selectedTeamIds);
      for (const id of ids) {
        await TeamService.updateTeamStatus(id, newStatus);
      }
      showToast(`Updated ${ids.length} teams to ${newStatus.toUpperCase()}.`, 'success', 'Status Updated');
      setSelectedTeamIds(new Set());
      await loadTeams();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update teams status.', 'error', 'Status Error');
    }
  };

  // Export Teams to CSV per Phase 30
  const handleExportTeamsCsv = async () => {
    try {
      const csvContent = await TeamService.exportTeamsToCsv();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `hackathon_teams_export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Team roster successfully exported to CSV.', 'success', 'Export Complete');
    } catch {
      showToast('Failed to export teams roster.', 'error', 'Export Failed');
    }
  };

  // Sample CSV Template Downloader in format: TEAM ID, TEAM NAME, TEAM LEAD, REGISTRATION NUMBER, MEMBERS
  const downloadSampleTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,TEAM ID,TEAM NAME,TEAM LEAD,REGISTRATION NUMBER,MEMBERS,EMAIL,PHONE,COLLEGE\n' +
      'ALPHA-001,Quantum Pioneers,Sarah Jenkins,99240041001,"Sarah Jenkins, Alex Doe, Sam Ray",sarah.j@univ.edu,+91 98765 00001,School of Computing\n' +
      'ALPHA-002,TerraPulse Labs,Rohan Varma,99240041002,"Rohan Varma, Maya Patel, Kabir Das",rohan.v@univ.edu,+91 98765 00002,Dept of Electrical Engg\n' +
      'ALPHA-003,CyberVanguard,Anya Ivanova,99240041003,"Anya Ivanova, Leo Chen",anya.i@univ.edu,+91 98765 00003,Faculty of Cybersecurity\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'hackathon_participants_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // Live Team Calculations
  // -------------------------------------------------------------
  const totalTeams = teams.length;
  const activeTeamsCount = teams.filter((t) => t.status === 'active').length;
  const inactiveTeamsCount = teams.filter((t) => t.status === 'inactive').length;
  const selectedTeamsCount = teams.filter((t) => Boolean(t.selectedProblemId)).length;
  const unselectedTeamsCount = teams.filter((t) => !t.selectedProblemId).length;

  // -------------------------------------------------------------
  // Filtered List
  // -------------------------------------------------------------
  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.teamLeadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.teamLeadRegistrationNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.teamId.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = team.status === 'active';
    if (statusFilter === 'inactive') matchesStatus = team.status === 'inactive';
    if (statusFilter === 'selected') matchesStatus = Boolean(team.selectedProblemId);
    if (statusFilter === 'unselected') matchesStatus = !team.selectedProblemId;

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout
      title="PARTICIPANT TEAMS"
      description="Import, inspect, and manage registered hackathon teams (any custom format or official roster) and their live challenge allocations."
      actionButton={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportTeamsCsv}
            disabled={teams.length === 0}
            className="bg-white"
          >
            EXPORT TEAMS
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => {
              setParsedSummary(null);
              setUploadedFileName('');
              if (fileInputRef.current) fileInputRef.current.value = '';
              setIsImportModalOpen(true);
            }}
          >
            IMPORT PARTICIPANTS
          </Button>
        </div>
      }
    >
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* TOTAL TEAMS */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#667085] tracking-wider uppercase text-[11px]">
              TOTAL TEAMS
            </span>
            <Users className="w-4 h-4 text-[#667085]" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#111827] tracking-tight leading-none font-sans">
              {isLoading ? '...' : totalTeams}
            </span>
            <p className="mt-1.5 text-xs text-[#667085]">
              {activeTeamsCount} active, {inactiveTeamsCount} inactive
            </p>
          </div>
        </div>

        {/* ACTIVE TEAMS */}
        <div className="p-5 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#164A36] tracking-wider uppercase text-[11px]">
              ACTIVE TEAMS
            </span>
            <UserCheck className="w-4 h-4 text-[#164A36]" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#164A36] tracking-tight leading-none font-sans">
              {isLoading ? '...' : activeTeamsCount}
            </span>
            <p className="mt-1.5 text-xs text-[#164A36]/80 font-medium">
              Ready for problem selection
            </p>
          </div>
        </div>

        {/* PROBLEM SELECTED */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#667085] tracking-wider uppercase text-[11px]">
              PROBLEM SELECTED
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-emerald-700 tracking-tight leading-none font-sans">
              {isLoading ? '...' : selectedTeamsCount}
            </span>
            <p className="mt-1.5 text-xs text-[#667085]">
              Confirmed challenge selections
            </p>
          </div>
        </div>

        {/* AWAITING SELECTION */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#667085] tracking-wider uppercase text-[11px]">
              AWAITING SELECTION
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-amber-700 tracking-tight leading-none font-sans">
              {isLoading ? '...' : unselectedTeamsCount}
            </span>
            <p className="mt-1.5 text-xs text-[#667085]">
              Pending problem choice
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search teams by name, lead, reg no, or team ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36] focus:border-[#164A36]"
          />
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {(searchQuery.trim() || statusFilter !== 'all') && (
            <span className="text-xs text-[#667085] font-medium">
              Showing <strong>{filteredTeams.length}</strong> of <strong>{totalTeams}</strong>
            </span>
          )}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#667085] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
            >
              <option value="all">All Teams ({totalTeams})</option>
              <option value="active">Active Only ({activeTeamsCount})</option>
              <option value="inactive">Inactive Only ({inactiveTeamsCount})</option>
              <option value="selected">Problem Selected ({selectedTeamsCount})</option>
              <option value="unselected">Not Selected ({unselectedTeamsCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (when 1 or more teams are selected) */}
      {selectedTeamIds.size > 0 && (
        <div className="p-4 bg-[#EEF5F0] border border-[#D5E6DB] rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs mb-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-[#164A36] bg-white px-3 py-1.5 rounded-lg border border-[#D5E6DB]">
              {selectedTeamIds.size} of {filteredTeams.length} Teams Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedTeamIds(new Set())}
              className="text-[#667085] hover:text-[#111827] font-semibold underline"
            >
              Deselect All
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkToggleStatus('active')}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              Activate Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkToggleStatus('inactive')}
              className="text-amber-700 border-amber-300 hover:bg-amber-50 font-bold"
            >
              <UserX className="w-3.5 h-3.5 mr-1.5" />
              Deactivate Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="text-rose-700 border-rose-300 hover:bg-rose-50 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete Selected ({selectedTeamIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Main Teams Table per Part 7 */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F7F5EF] border-b border-[#E5E7EB] text-[#4B5563] uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select All"
                    checked={selectedTeamIds.size > 0 && selectedTeamIds.size === filteredTeams.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-[#D1D5DB] text-[#164A36] focus:ring-[#164A36] cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3.5">Team</th>
                <th className="px-5 py-3.5">Team Lead</th>
                <th className="px-5 py-3.5">Registration Number</th>
                <th className="px-5 py-3.5">Selected Problem</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#667085]">
                    Loading registered teams...
                  </td>
                </tr>
              ) : filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#667085]">
                    {searchQuery
                      ? 'No teams match your search criteria.'
                      : 'No participant teams have been imported yet. Click "Import Participants" above to add your Excel or CSV list.'}
                  </td>
                </tr>
              ) : (
                filteredTeams.map((t) => {
                  const isSelected = selectedTeamIds.has(t.teamId);
                  return (
                  <tr
                    key={t.teamId}
                    className={`hover:bg-[#F7F5EF]/50 transition-colors ${
                      isSelected ? 'bg-[#EEF5F0]/60' : ''
                    }`}
                  >
                    {/* Row Selection Checkbox */}
                    <td className="px-4 py-4 w-12 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Select ${t.teamId}`}
                        checked={isSelected}
                        onChange={() => handleToggleRow(t.teamId)}
                        className="w-4 h-4 rounded border-[#D1D5DB] text-[#164A36] focus:ring-[#164A36] cursor-pointer"
                      />
                    </td>

                    {/* Team */}
                    <td className="px-5 py-4">
                      <Link
                        to={`/admin/participants/${t.teamId}`}
                        className="font-bold text-[#111827] hover:text-[#164A36] hover:underline flex items-center gap-1.5"
                      >
                        {t.teamName}
                      </Link>
                      <div className="text-[11px] text-[#667085] font-mono mt-0.5">
                        <Link
                          to={`/admin/participants/${t.teamId}`}
                          className="hover:underline text-[#164A36] font-semibold"
                        >
                          {t.teamId}
                        </Link>{' '}
                        • {t.college}
                      </div>
                    </td>

                    {/* Team Lead */}
                    <td className="px-5 py-4 font-medium">{t.teamLeadName}</td>

                    {/* Registration Number */}
                    <td className="px-5 py-4 font-mono text-xs text-[#164A36] font-semibold">
                      {t.teamLeadRegistrationNumber || (t.credentialHash ? '• Hashed & Protected •' : 'N/A')}
                    </td>

                    {/* Selected Problem */}
                    <td className="px-5 py-4">
                      {t.selectedProblemId ? (
                        <div className="text-xs">
                          <span className="font-mono font-bold text-[#164A36]">
                            {t.selectedProblemId}
                          </span>
                          <div className="text-[11px] text-[#667085] truncate max-w-[150px]">
                            {t.selectedProblemTitle}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">None</span>
                      )}
                    </td>

                    {/* Status Badges per Part 7 */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          variant={t.status === 'active' ? 'subtle' : 'amber'}
                          size="sm"
                        >
                          {t.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                        {t.selectedProblemId ? (
                          <span className="text-[10px] font-bold text-[#164A36]">
                            PROBLEM SELECTED
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#9CA3AF]">
                            NOT SELECTED
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTeam(t)}
                          className="p-1.5 rounded-lg text-[#667085] hover:text-[#164A36] hover:bg-[#EEF5F0]"
                          title="View team roster and details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setCredentialTeam(t);
                            setNewRegNumber(t.teamLeadRegistrationNumber || '');
                          }}
                          className="p-1.5 rounded-lg text-[#667085] hover:text-[#164A36] hover:bg-[#EEF5F0]"
                          title="Reset team credentials"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(t)}
                          className={`p-1.5 rounded-lg ${
                            t.status === 'active'
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={t.status === 'active' ? 'Deactivate team' : 'Reactivate team'}
                        >
                          {t.status === 'active' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => setTeamToDelete(t)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete team"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
      {/* IMPORT PARTICIPANTS MODAL WITH PREVIEW (Parts 4, 5, 6) */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#111827]">
                  Import Hackathon Participants
                </h3>
                <p className="text-xs text-[#667085] mt-1">
                  Supported formats: <strong>.xlsx, .xls, .csv, .pdf</strong>. Standard columns: <strong>TEAM ID</strong>, <strong>TEAM NAME</strong>, <strong>TEAM LEAD</strong>, <strong>REGISTRATION NUMBER</strong>, and <strong>MEMBERS</strong>. Stores all participant details and links automatically with team login credentials.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedSummary(null);
                }}
                className="p-1.5 rounded-lg text-[#667085] hover:text-[#111827]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* File Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#CBD5E1] hover:border-[#164A36] rounded-2xl p-8 text-center cursor-pointer bg-[#F7F5EF]/50 hover:bg-[#EEF5F0]/50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] text-[#164A36] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>

                <p className="text-sm font-bold text-[#111827]">
                  {uploadedFileName
                    ? `Selected: ${uploadedFileName}`
                    : 'Click or drag & drop team roster file here'}
                </p>
                <p className="text-xs text-[#667085] mt-1">
                  Excel (.xlsx, .xls) and CSV preferred. Unstructured PDFs are extracted for preview review.
                </p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="bg-white pointer-events-none"
                  >
                    Browse Local File
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSampleTemplate();
                    }}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download Template (.csv)
                  </Button>
                </div>
              </div>

              {isParsing && (
                <div className="p-8 text-center text-sm text-[#667085] flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-[#164A36] border-t-transparent animate-spin" />
                  <span>Parsing and validating team credentials...</span>
                </div>
              )}

              {/* Validation Summary Banner per Part 6 */}
              {parsedSummary && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
                    <div className="flex items-center gap-4 text-xs sm:text-sm">
                      <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> ✓ {parsedSummary.validCount} valid teams
                      </span>

                      {parsedSummary.invalidCount > 0 && (
                        <span className="font-bold text-amber-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> ⚠ {parsedSummary.invalidCount} teams need attention
                        </span>
                      )}

                      {parsedSummary.duplicateCount > 0 && (
                        <span className="font-bold text-rose-700 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" /> ✖ {parsedSummary.duplicateCount} duplicates
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-[#667085] font-mono">
                      {parsedSummary.totalRows} Total Rows Processed
                    </span>
                  </div>

                  {/* Errors List if any per Part 6 */}
                  {parsedSummary.invalidTeams.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 max-h-36 overflow-y-auto">
                      <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Issues Found (Will Not Be Imported):
                      </div>
                      {parsedSummary.invalidTeams.map((inv, idx) => (
                        <div key={idx} className="font-mono">
                          • {inv.errors.join('; ')}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview Table per Part 6 */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-2">
                      Import Preview ({parsedSummary.validTeams.length} Ready to Create)
                    </h4>
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7F5EF] border-b border-[#E5E7EB] text-[#4B5563] font-bold">
                          <tr>
                            <th className="px-3.5 py-2.5">Team ID</th>
                            <th className="px-3.5 py-2.5">Team Name</th>
                            <th className="px-3.5 py-2.5">Team Lead</th>
                            <th className="px-3.5 py-2.5">Registration No.</th>
                            <th className="px-3.5 py-2.5">Members</th>
                            <th className="px-3.5 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {parsedSummary.validTeams.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3.5 py-2 font-mono text-[#667085]">{row.teamId}</td>
                              <td className="px-3.5 py-2 font-bold text-[#111827]">{row.teamName}</td>
                              <td className="px-3.5 py-2">{row.teamLeadName}</td>
                              <td className="px-3.5 py-2 font-mono text-[#164A36]">{row.teamLeadRegistrationNumber}</td>
                              <td className="px-3.5 py-2">{row.members.length} members</td>
                              <td className="px-3.5 py-2">
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  Valid
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions per Part 6 */}
            <div className="p-5 border-t border-[#E5E7EB] bg-[#F7F5EF]/60 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedSummary(null);
                }}
              >
                CANCEL
              </Button>

              <Button
                variant="primary"
                size="md"
                disabled={!parsedSummary || parsedSummary.validCount === 0}
                onClick={handleImportValidTeams}
              >
                IMPORT VALID TEAMS ({parsedSummary?.validCount || 0})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TEAM DETAILS MODAL */}
      {/* ========================================================= */}
      {selectedTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full p-6 sm:p-7 relative">
            <button
              onClick={() => setSelectedTeam(null)}
              className="absolute top-5 right-5 text-[#667085] hover:text-[#111827]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center font-mono font-bold">
                TM
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#111827]">
                  {selectedTeam.teamName}
                </h3>
                <p className="text-xs text-[#667085]">{selectedTeam.teamId}</p>
              </div>
            </div>

            <div className="space-y-4 my-6 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-[#F7F5EF] space-y-1">
                <div className="text-[11px] font-bold text-[#667085] uppercase">
                  Lead & Credentials
                </div>
                <div className="font-semibold text-[#111827]">
                  {selectedTeam.teamLeadName}
                </div>
                <div className="font-mono text-[#164A36]">
                  Registration Number: {selectedTeam.teamLeadRegistrationNumber || (selectedTeam.credentialHash ? '• Hashed & Protected (SHA-256) •' : 'N/A')}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-[#667085] uppercase mb-2">
                  Roster Members ({(selectedTeam.teamMembers || []).length || 1})
                </div>
                {(selectedTeam.teamMembers && selectedTeam.teamMembers.length > 0) ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTeam.teamMembers.map((m, idx) => {
                      const isLead =
                        m.trim().toLowerCase() === (selectedTeam.teamLeadName || '').trim().toLowerCase() ||
                        idx === 0;
                      return (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-lg bg-[#EEF5F0] text-[#164A36] font-semibold text-xs border border-[#D5E6DB] flex items-center gap-1.5"
                        >
                          <span>{m}</span>
                          {isLead && (
                            <span className="text-[9px] bg-[#164A36] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              LEAD
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#F7F5EF] text-[#667085] text-xs font-medium">
                    {selectedTeam.teamLeadName ? `${selectedTeam.teamLeadName} (Lead Representative)` : 'No additional enrolled members recorded.'}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-gray-50 text-xs text-[#667085] space-y-1">
                <div><strong>Email:</strong> {selectedTeam.email || 'Not specified'}</div>
                <div><strong>Phone:</strong> {selectedTeam.phone || 'Not specified'}</div>
                <div><strong>Institution / College:</strong> {selectedTeam.college || 'Not specified'}</div>
                <div><strong>Record Created:</strong> {new Date(selectedTeam.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => setSelectedTeam(null)}
              >
                Close
              </Button>
              <Button
                to={`/admin/participants/${selectedTeam.teamId}`}
                variant="primary"
                size="md"
                className="flex-1"
              >
                Full Dossier <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RESET CREDENTIALS MODAL */}
      {/* ========================================================= */}
      {credentialTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setCredentialTeam(null)}
              className="absolute top-5 right-5 text-[#667085] hover:text-[#111827]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#111827]">
              Reset Team Credentials
            </h3>
            <p className="text-xs text-[#667085] mt-1">
              Update password (Team Lead Registration Number) for <strong>{credentialTeam.teamName}</strong>.
            </p>

            <form onSubmit={handleResetCredentialSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  New Registration Number
                </label>
                <input
                  type="text"
                  required
                  value={newRegNumber}
                  onChange={(e) => setNewRegNumber(e.target.value)}
                  placeholder="e.g. 2023BCSE0999"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E7EB] font-mono focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCredentialTeam(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save New Credential
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(teamToDelete)}
        title="Remove Registered Team?"
        message={`Are you sure you want to permanently remove team "${teamToDelete?.teamName}" from the hackathon database? This cannot be undone.`}
        confirmText="Remove Team"
        isDangerous
        onCancel={() => setTeamToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteModalOpen}
        title={`Remove ${selectedTeamIds.size} Selected Teams?`}
        message={`Are you sure you want to permanently remove all ${selectedTeamIds.size} selected teams from the hackathon directory? All their associated data will be deleted. This action cannot be undone.`}
        confirmText={isDeletingBulk ? 'Deleting...' : `Remove ${selectedTeamIds.size} Teams`}
        isDangerous
        onCancel={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
      />
    </AdminLayout>
  );
};
