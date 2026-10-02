import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  Upload,
  Download,
  Search,
  Filter,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  RotateCcw,
  UserX,
  UserCheck,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TeamService } from '../../services/teamService';
import { FileParserService } from '../../services/fileParserService';
import { useToast } from '../../context/ToastContext';
import type { TeamRecord, ImportCredentialSummary } from '../../types';

export const AdminCredentialsPage: React.FC = () => {
  const { showToast } = useToast();
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Password visibility controls
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [revealedTeamIds, setRevealedTeamIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Import Credentials Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedSummary, setParsedSummary] = useState<ImportCredentialSummary | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single Add Credential Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeamId, setNewTeamId] = useState('');
  const [newRegNumber, setNewRegNumber] = useState('');
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

  // Edit / Reset Credential Modal State
  const [editTeam, setEditTeam] = useState<TeamRecord | null>(null);
  const [editRegNumber, setEditRegNumber] = useState('');

  // Delete Confirm Dialog
  const [teamToDelete, setTeamToDelete] = useState<TeamRecord | null>(null);

  // Bulk Selection and Multi-action State
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const data = await TeamService.getAllTeams();
    setTeams(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const togglePasswordVisibility = (teamId: string) => {
    setRevealedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handleCopy = (text: string, id: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`${label} copied to clipboard!`, 'info', 'Copied');
    setTimeout(() => {
      setCopiedId((cur) => (cur === id ? null : cur));
    }, 2000);
  };

  const handleCopyPair = (team: TeamRecord) => {
    const pass = team.teamLeadRegistrationNumber || team.teamId;
    const text = `Username (Team ID): ${team.teamId}\nPassword (Registration No): ${pass}`;
    navigator.clipboard.writeText(text);
    setCopiedId(`pair-${team.teamId}`);
    showToast(
      `Login credentials for ${team.teamId} copied to clipboard!`,
      'success',
      'Credentials Copied'
    );
    setTimeout(() => {
      setCopiedId((cur) => (cur === `pair-${team.teamId}` ? null : cur));
    }, 2000);
  };

  // -------------------------------------------------------------
  // File Upload & Credentials Parsing
  // -------------------------------------------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setUploadedFileName(file.name);
    setIsParsing(true);

    try {
      const summary = await FileParserService.parseCredentialsFile(file);
      setParsedSummary(summary);
    } catch (err: any) {
      showToast(err?.message || 'Failed to parse credentials file.', 'error', 'Parse Error');
      setParsedSummary(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportCredentialsConfirm = async () => {
    if (!parsedSummary || parsedSummary.validCredentials.length === 0) return;

    setIsLoading(true);
    try {
      const creds = parsedSummary.validCredentials.map((c) => ({
        teamId: c.teamId,
        registrationNumber: c.registrationNumber,
      }));

      const res = await TeamService.importCredentials(creds);
      showToast(
        `Imported ${res.importedCount} new credentials and updated ${res.updatedCount} existing teams.`,
        'success',
        'Credentials Configured'
      );
      setIsImportModalOpen(false);
      setParsedSummary(null);
      setUploadedFileName('');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to import credentials.', 'error', 'Import Failed');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Single Add Credential
  // -------------------------------------------------------------
  const handleAddSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamId.trim() || !newRegNumber.trim()) return;

    setIsSubmittingSingle(true);
    try {
      await TeamService.importCredentials([
        {
          teamId: newTeamId.trim(),
          registrationNumber: newRegNumber.trim(),
        },
      ]);
      showToast(
        `Credentials for Team ID "${newTeamId.trim()}" created successfully.`,
        'success',
        'Credential Created'
      );
      setIsAddModalOpen(false);
      setNewTeamId('');
      setNewRegNumber('');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to add credential.', 'error', 'Error');
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // -------------------------------------------------------------
  // Edit Password / Registration Number
  // -------------------------------------------------------------
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeam || !editRegNumber.trim()) return;

    await TeamService.resetTeamCredentials(editTeam.teamId, editRegNumber.trim());
    showToast(
      `Password (Registration Number) for "${editTeam.teamId}" updated.`,
      'success',
      'Password Updated'
    );
    setEditTeam(null);
    setEditRegNumber('');
    await loadData();
  };

  const handleToggleStatus = async (team: TeamRecord) => {
    const newStatus = team.status === 'active' ? 'inactive' : 'active';
    await TeamService.updateTeamStatus(team.teamId, newStatus);
    showToast(
      `Team ID "${team.teamId}" account is now ${newStatus.toUpperCase()}.`,
      'info',
      'Status Changed'
    );
    await loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;
    await TeamService.deleteTeam(teamToDelete.teamId);
    showToast(
      `Credential record for "${teamToDelete.teamId}" deleted.`,
      'info',
      'Credential Removed'
    );
    setTeamToDelete(null);
    await loadData();
  };

  // Export to CSV
  const handleExportCsv = async () => {
    try {
      const csv = await TeamService.exportCredentialsToCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `hackathon_credentials_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Credentials successfully exported to CSV.', 'success', 'Export Complete');
    } catch {
      showToast('Failed to export credentials.', 'error', 'Export Error');
    }
  };

  // Sample CSV Template Downloader
  const downloadSampleTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,TEAM ID,REGISTRATION NUMBER\n' +
      'ALPHA-001,99240041001\n' +
      'ALPHA-002,99240041002\n' +
      'ALPHA-003,99240041003\n' +
      'ALPHA-004,99240041004\n' +
      'ALPHA-005,99240041005\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'hackathon_credentials_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations
  const totalCredentials = teams.length;
  const linkedProfiles = teams.filter(
    (t) => t.teamName && !t.teamName.startsWith('Team TM-') && !t.teamName.startsWith('Team ALPHA-') && t.teamMembers?.length > 0
  ).length;
  const pendingProfiles = totalCredentials - linkedProfiles;
  const activeCredentials = teams.filter((t) => t.status === 'active').length;

  // Filtered List
  const filteredTeams = teams.filter((t) => {
    const pass = t.teamLeadRegistrationNumber || '';
    const matchesSearch =
      t.teamId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.teamLeadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pass.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    const isLinked = t.teamName && !t.teamName.startsWith('Team TM-') && !t.teamName.startsWith('Team ALPHA-') && t.teamMembers?.length > 0;
    if (filterType === 'active') matchesFilter = t.status === 'active';
    if (filterType === 'inactive') matchesFilter = t.status === 'inactive';
    if (filterType === 'linked') matchesFilter = Boolean(isLinked);
    if (filterType === 'pending') matchesFilter = !isLinked;

    return matchesSearch && matchesFilter;
  });

  // Bulk Selection Helpers & Bulk Delete
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
      showToast(`Successfully deleted ${idsToDelete.length} credentials.`, 'success', 'Bulk Delete Completed');
      setSelectedTeamIds(new Set());
      setIsBulkDeleteModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete selected credentials.', 'error', 'Error');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  return (
    <AdminLayout
      title="TEAM LOGIN CREDENTIALS"
      description="Manage Team ID (Username) and Registration Number (Password) pairs. Supports dedicated credentials upload and automatic profile matching."
      actionButton={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportCsv}
            disabled={teams.length === 0}
            className="bg-white"
          >
            EXPORT CREDENTIALS
          </Button>

          <Button
            variant="secondary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
            className="bg-white"
          >
            ADD CREDENTIAL
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
            IMPORT CREDENTIALS
          </Button>
        </div>
      }
    >
      {/* Informative Rule & Architecture Banner */}
      <div className="mb-6 p-5 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white text-[#164A36] border border-[#D5E6DB] flex items-center justify-center shrink-0 shadow-2xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#164A36]">
                Login Matching Rule Active
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white text-[#164A36] border border-[#D5E6DB]">
                <ShieldCheck className="w-3 h-3" /> Auto-Linked
              </span>
            </div>
            <p className="mt-1 text-xs text-[#374151] leading-relaxed">
              <strong>Username:</strong> <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-[#164A36]">TEAM ID</code> &nbsp;|&nbsp; 
              <strong>Password:</strong> <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-[#164A36]">REGISTRATION NUMBER</code>.
              When participants log in, the portal matches their <strong>TEAM ID</strong> against the participant directory and dynamically displays all team details (Team Name, Team Lead, and all Team Members).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            to="/admin/participants"
            variant="secondary"
            size="sm"
            className="bg-white text-xs font-bold"
            rightIcon={<ExternalLink className="w-3.5 h-3.5 ml-1" />}
          >
            Participants Roster
          </Button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#667085] tracking-wider uppercase text-[11px]">
              TOTAL CREDENTIALS
            </span>
            <KeyRound className="w-4 h-4 text-[#164A36]" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#111827] tracking-tight leading-none font-sans">
              {isLoading ? '...' : totalCredentials}
            </span>
            <p className="mt-1.5 text-xs text-[#667085]">
              {activeCredentials} active team logins
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#164A36] tracking-wider uppercase text-[11px]">
              ROSTERS LINKED
            </span>
            <Users className="w-4 h-4 text-[#164A36]" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#164A36] tracking-tight leading-none font-sans">
              {isLoading ? '...' : linkedProfiles}
            </span>
            <p className="mt-1.5 text-xs text-[#164A36]">
              Full participant details stored
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#667085] tracking-wider uppercase text-[11px]">
              AWAITING ROSTER
            </span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#111827] tracking-tight leading-none font-sans">
              {isLoading ? '...' : pendingProfiles}
            </span>
            <p className="mt-1.5 text-xs text-[#667085]">
              Credentials imported without roster yet
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#667085] tracking-wider uppercase text-[11px]">
              ACTIVE ACCOUNTS
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-emerald-700 tracking-tight leading-none font-sans">
              {isLoading ? '...' : activeCredentials}
            </span>
            <p className="mt-1.5 text-xs text-[#667085]">
              Can log in immediately
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
            placeholder="Search by Team ID (username), Reg No (password), or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36] focus:border-[#164A36]"
          />
        </div>

        {/* Visibility toggle & Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAllPasswords(!showAllPasswords)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-[#E5E7EB] bg-[#F7F5EF] text-[#374151] hover:bg-[#EEF5F0] hover:text-[#164A36] transition-colors"
          >
            {showAllPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showAllPasswords ? 'Mask All Passwords' : 'Reveal All Passwords'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[#667085] shrink-0" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
            >
              <option value="all">All Credentials ({teams.length})</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="linked">Rosters Linked ({linkedProfiles})</option>
              <option value="pending">Awaiting Roster ({pendingProfiles})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (when 1 or more credentials are selected) */}
      {selectedTeamIds.size > 0 && (
        <div className="p-4 bg-[#EEF5F0] border border-[#D5E6DB] rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs mb-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-[#164A36] bg-white px-3 py-1.5 rounded-lg border border-[#D5E6DB]">
              {selectedTeamIds.size} of {filteredTeams.length} Credentials Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedTeamIds(new Set())}
              className="text-[#667085] hover:text-[#111827] font-semibold underline"
            >
              Deselect All
            </button>
          </div>
          <div className="flex items-center gap-2">
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

      {/* Credentials Table */}
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
                <th className="px-5 py-3.5">Team ID (Username)</th>
                <th className="px-5 py-3.5">Registration No. (Password)</th>
                <th className="px-5 py-3.5">Team Name</th>
                <th className="px-5 py-3.5">Team Lead</th>
                <th className="px-5 py-3.5">Members</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[#667085]">
                    Loading team credentials...
                  </td>
                </tr>
              ) : filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[#667085]">
                    {searchQuery
                      ? 'No credentials match your search query.'
                      : 'No credentials imported yet. Click "Import Credentials" above to upload an Excel or CSV file with TEAM ID and REGISTRATION NUMBER.'}
                  </td>
                </tr>
              ) : (
                filteredTeams.map((t) => {
                  const pass = t.teamLeadRegistrationNumber || t.teamId;
                  const isRevealed = showAllPasswords || revealedTeamIds.has(t.teamId);
                  const isLinked = t.teamName && !t.teamName.startsWith('Team TM-') && !t.teamName.startsWith('Team ALPHA-') && t.teamMembers?.length > 0;
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

                      {/* Team ID (Username) */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#164A36] bg-[#EEF5F0] px-2.5 py-1 rounded border border-[#D5E6DB]">
                            {t.teamId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(t.teamId, `id-${t.teamId}`, 'Team ID')}
                            className="p-1 rounded text-[#9CA3AF] hover:text-[#164A36] hover:bg-[#EEF5F0]"
                            title="Copy Team ID"
                          >
                            {copiedId === `id-${t.teamId}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Registration Number (Password) */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold tracking-wider text-[#111827]">
                            {isRevealed ? pass : '••••••••••••'}
                          </span>

                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(t.teamId)}
                            className="p-1 rounded text-[#667085] hover:text-[#111827] hover:bg-gray-100"
                            title={isRevealed ? 'Hide Password' : 'Show Password'}
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(pass, `pass-${t.teamId}`, 'Password')}
                            className="p-1 rounded text-[#9CA3AF] hover:text-[#164A36] hover:bg-[#EEF5F0]"
                            title="Copy Password"
                          >
                            {copiedId === `pass-${t.teamId}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Team Name */}
                      <td className="px-5 py-4">
                        {isLinked ? (
                          <Link
                            to={`/admin/participants/${t.teamId}`}
                            className="font-bold text-[#111827] hover:text-[#164A36] hover:underline"
                          >
                            {t.teamName}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Awaiting Full Roster
                          </span>
                        )}
                      </td>

                      {/* Team Lead */}
                      <td className="px-5 py-4">
                        <span className="text-xs text-[#4B5563]">
                          {t.teamLeadName && t.teamLeadName !== 'Team Lead' ? t.teamLeadName : '—'}
                        </span>
                      </td>

                      {/* Members */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-xs text-[#4B5563] bg-[#F7F5EF] px-2 py-0.5 rounded border border-[#E5E7EB]">
                          <Users className="w-3.5 h-3.5 text-[#164A36]" />
                          {t.teamMembers?.length || 1}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <Badge variant={t.status === 'active' ? 'forest' : 'amber'} size="sm">
                          {t.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick copy credentials pair */}
                          <button
                            type="button"
                            onClick={() => handleCopyPair(t)}
                            className="p-1.5 rounded-lg text-[#164A36] bg-[#EEF5F0] hover:bg-[#D5E6DB]"
                            title="Copy Username & Password pair for distribution"
                          >
                            {copiedId === `pair-${t.teamId}` ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit Registration Number */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditTeam(t);
                              setEditRegNumber(t.teamLeadRegistrationNumber || '');
                            }}
                            className="p-1.5 rounded-lg text-[#667085] hover:text-[#164A36] hover:bg-[#EEF5F0]"
                            title="Change password / registration number"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          {/* Toggle Active/Inactive */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(t)}
                            className={`p-1.5 rounded-lg ${
                              t.status === 'active'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={t.status === 'active' ? 'Deactivate team login' : 'Activate team login'}
                          >
                            {t.status === 'active' ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setTeamToDelete(t)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Delete credential"
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
      {/* IMPORT CREDENTIALS MODAL (TEAM ID & REGISTRATION NUMBER)  */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#111827]">
                  Import Team Login Credentials
                </h3>
                <p className="text-xs text-[#667085] mt-1">
                  Upload an Excel or CSV file containing only <strong>TEAM ID</strong> (Username) and <strong>REGISTRATION NUMBER</strong> (Password).
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
              {/* Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#CBD5E1] hover:border-[#164A36] rounded-2xl p-8 text-center cursor-pointer bg-[#F7F5EF]/50 hover:bg-[#EEF5F0]/50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] text-[#164A36] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>

                <p className="text-sm font-bold text-[#111827]">
                  {uploadedFileName
                    ? `Selected: ${uploadedFileName}`
                    : 'Click or drag & drop credentials file (.xlsx, .xls, .csv)'}
                </p>
                <p className="text-xs text-[#667085] mt-1">
                  File only needs two columns: <strong>TEAM ID</strong> and <strong>REGISTRATION NUMBER</strong>.
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
                  <span>Validating team credentials...</span>
                </div>
              )}

              {/* Validation Summary */}
              {parsedSummary && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
                    <div className="flex items-center gap-4 text-xs sm:text-sm">
                      <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> ✓ {parsedSummary.validCount} valid credentials
                      </span>

                      {parsedSummary.invalidCount > 0 && (
                        <span className="font-bold text-amber-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> ⚠ {parsedSummary.invalidCount} rows need attention
                        </span>
                      )}

                      {parsedSummary.duplicateCount > 0 && (
                        <span className="font-bold text-rose-700 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" /> ✖ {parsedSummary.duplicateCount} duplicates
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-[#667085] font-mono">
                      {parsedSummary.totalRows} Total Rows
                    </span>
                  </div>

                  {/* Issues */}
                  {parsedSummary.invalidCredentials.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 max-h-32 overflow-y-auto">
                      <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Issues Found (Will Not Be Imported):
                      </div>
                      {parsedSummary.invalidCredentials.map((inv, idx) => (
                        <div key={idx} className="font-mono">
                          • {inv.errors.join('; ')}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-2">
                      Credentials Preview ({parsedSummary.validCredentials.length} Ready to Save)
                    </h4>
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7F5EF] border-b border-[#E5E7EB] text-[#4B5563] font-bold">
                          <tr>
                            <th className="px-4 py-2.5">Row</th>
                            <th className="px-4 py-2.5">Team ID (Username)</th>
                            <th className="px-4 py-2.5">Registration Number (Password)</th>
                            <th className="px-4 py-2.5">Validation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {parsedSummary.validCredentials.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-[#9CA3AF] font-mono">{row.rowNumber}</td>
                              <td className="px-4 py-2 font-mono font-bold text-[#164A36]">{row.teamId}</td>
                              <td className="px-4 py-2 font-mono text-[#111827]">{row.registrationNumber}</td>
                              <td className="px-4 py-2">
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

            {/* Modal Actions */}
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
                onClick={handleImportCredentialsConfirm}
              >
                IMPORT CREDENTIALS ({parsedSummary?.validCount || 0})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SINGLE ADD CREDENTIAL MODAL                               */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-[#667085] hover:text-[#111827]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#111827]">
              Add Team Credential
            </h3>
            <p className="text-xs text-[#667085] mt-1">
              Create a new login pair. Use Team ID as Username and Registration Number as Password.
            </p>

            <form onSubmit={handleAddSingleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Team ID (Username)
                </label>
                <input
                  type="text"
                  required
                  value={newTeamId}
                  onChange={(e) => setNewTeamId(e.target.value)}
                  placeholder="e.g. ALPHA-061"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E7EB] font-mono focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Registration Number (Password)
                </label>
                <input
                  type="text"
                  required
                  value={newRegNumber}
                  onChange={(e) => setNewRegNumber(e.target.value)}
                  placeholder="e.g. 21BCE1061"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E7EB] font-mono focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmittingSingle}>
                  {isSubmittingSingle ? 'Saving...' : 'Save Credential'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT CREDENTIAL MODAL                                     */}
      {/* ========================================================= */}
      {editTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setEditTeam(null)}
              className="absolute top-5 right-5 text-[#667085] hover:text-[#111827]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#111827]">
              Change Team Password
            </h3>
            <p className="text-xs text-[#667085] mt-1">
              Update password for <strong>{editTeam.teamId}</strong> ({editTeam.teamName}).
            </p>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  New Registration Number (Password)
                </label>
                <input
                  type="text"
                  required
                  value={editRegNumber}
                  onChange={(e) => setEditRegNumber(e.target.value)}
                  placeholder="e.g. 21BCE1001"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E7EB] font-mono focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditTeam(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(teamToDelete)}
        title="Remove Team Credential?"
        message={`Are you sure you want to permanently delete credentials for "${teamToDelete?.teamId}"? This team will no longer be able to log in.`}
        confirmText="Remove Credential"
        isDangerous
        onCancel={() => setTeamToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteModalOpen}
        title={`Delete ${selectedTeamIds.size} Selected Credentials?`}
        message={`Are you sure you want to permanently delete all ${selectedTeamIds.size} selected credentials? These teams will no longer be able to log in. This action cannot be undone.`}
        confirmText={isDeletingBulk ? 'Deleting...' : `Delete ${selectedTeamIds.size} Credentials`}
        isDangerous
        onCancel={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
      />
    </AdminLayout>
  );
};
