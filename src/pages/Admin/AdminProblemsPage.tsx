import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  FileCheck,
  Eye,
  Edit,
  Globe,
  Trash2,
  Users,
  X,
  FileText,
  ExternalLink,
  ChevronRight,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ProblemService } from '../../services/problemService';
import { SelectionService } from '../../services/selectionService';
import { FileParserService } from '../../services/fileParserService';
import { useToast } from '../../context/ToastContext';
import { formatSelectionDateTime, formatReleaseDate } from '../../utils/formatters';
import type { ProblemRecord, ProblemStatus, TeamSelection, ImportProblemSummary } from '../../types';

export const AdminProblemsPage: React.FC = () => {
  const { showToast } = useToast();
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [selections, setSelections] = useState<TeamSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Bulk Import Modal & Parsing state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedSummary, setParsedSummary] = useState<ImportProblemSummary | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Problem Detail & Participants Modal (Sections 27 & 28)
  const [inspectProblem, setInspectProblem] = useState<ProblemRecord | null>(null);

  // Confirmation dialogs
  const [problemToDelete, setProblemToDelete] = useState<ProblemRecord | null>(null);
  const [problemToTogglePublish, setProblemToTogglePublish] = useState<ProblemRecord | null>(null);

  // Bulk Selection and Multi-action State
  const [selectedProblemIds, setSelectedProblemIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [problemData, selectionData] = await Promise.all([
        ProblemService.getAllProblems({ forParticipant: false }),
        SelectionService.getAllSelections(),
      ]);
      setProblems(problemData);
      setSelections(selectionData);
    } catch (err) {
      console.error('Failed to load problems data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time selections for live counter synchronization (Section 31)
    const unsub = SelectionService.subscribeToSelections((liveSelections) => {
      setSelections(liveSelections);
    });

    return () => unsub();
  }, []);

  // Map of selections per problem ID (Section 26 & 35)
  const selectionMap = useMemo(() => {
    const map = new Map<string, TeamSelection[]>();
    selections.forEach((sel) => {
      const existing = map.get(sel.problemId) || [];
      existing.push(sel);
      map.set(sel.problemId, existing);
    });
    return map;
  }, [selections]);

  const handleTogglePublishConfirm = async () => {
    if (!problemToTogglePublish) return;
    const newStatus: ProblemStatus =
      problemToTogglePublish.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';

    await ProblemService.updateProblemStatus(problemToTogglePublish.problemId, newStatus);
    showToast(
      `Problem "${problemToTogglePublish.problemId}" is now ${newStatus}.`,
      'success',
      'Status Changed'
    );
    setProblemToTogglePublish(null);
    await loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!problemToDelete) return;
    await ProblemService.deleteProblem(problemToDelete.problemId);
    showToast(
      `Problem "${problemToDelete.problemId}" deleted permanently.`,
      'info',
      'Problem Deleted'
    );
    setProblemToDelete(null);
    await loadData();
  };

  // Bulk Selection Helpers & Bulk Actions
  const handleToggleSelectAll = () => {
    if (selectedProblemIds.size === filteredProblems.length && filteredProblems.length > 0) {
      setSelectedProblemIds(new Set());
    } else {
      setSelectedProblemIds(new Set(filteredProblems.map((p) => p.problemId)));
    }
  };

  const handleToggleRow = (problemId: string) => {
    setSelectedProblemIds((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) next.delete(problemId);
      else next.add(problemId);
      return next;
    });
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedProblemIds.size === 0) return;
    setIsDeletingBulk(true);
    try {
      const idsToDelete = Array.from(selectedProblemIds);
      for (const id of idsToDelete) {
        await ProblemService.deleteProblem(id);
      }
      showToast(`Successfully deleted ${idsToDelete.length} problems.`, 'success', 'Bulk Delete Completed');
      setSelectedProblemIds(new Set());
      setIsBulkDeleteModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete selected problems.', 'error', 'Delete Error');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: ProblemStatus) => {
    if (selectedProblemIds.size === 0) return;
    try {
      const ids = Array.from(selectedProblemIds);
      for (const id of ids) {
        await ProblemService.updateProblemStatus(id, newStatus);
      }
      showToast(`Updated ${ids.length} problems to ${newStatus}.`, 'success', 'Status Updated');
      setSelectedProblemIds(new Set());
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update problem statuses.', 'error', 'Status Error');
    }
  };

  const filteredProblems = problems.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.problemId.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = p.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Handle File Change for Bulk Problem Upload (CSV, Excel, PDF)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers onChange every time
    e.target.value = '';

    setUploadedFileName(file.name);
    setIsParsing(true);

    try {
      const existingIds = problems.map((p) => p.problemId);
      const summary = await FileParserService.parseProblemFile(file, {
        existingProblemIds: existingIds,
      });
      setParsedSummary(summary);
    } catch (err: any) {
      showToast(err?.message || 'Failed to parse problem file.', 'error', 'Import Error');
      setParsedSummary(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportValidProblems = async () => {
    if (!parsedSummary || parsedSummary.validProblems.length === 0) return;

    setIsLoading(true);
    try {
      const res = await ProblemService.importProblems(parsedSummary.validProblems);
      showToast(
        `Successfully imported ${res.importedCount} problem statements as DRAFT. Publish them under Release Control when ready.`,
        'success',
        'Import Completed'
      );
      setIsImportModalOpen(false);
      setParsedSummary(null);
      setUploadedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to import problem statements.', 'error', 'Import Failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Sample CSV Template Downloader for Problems
  const downloadSampleProblemTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Problem ID,Title,Category,Difficulty,Description,Expected Solution,Tech Stack,Constraints\n' +
      'PRB-01,AI Autonomous Code Review Assistant,Artificial Intelligence,Medium,Develop an AI system that inspects pull requests for security vulnerabilities and architectural smells.,Functional CI/CD bot with AST parsing and automated PR feedback.,Python TypeScript OpenAI API Docker,Review under 60 seconds per PR\n' +
      'PRB-02,Decentralized Verification Protocol,Blockchain & Web3,Hard,Create a zero-knowledge credential verification framework for academic certificates.,Smart contract registry with cryptographic proof generation and web verifier.,Solidity Next.js Ethers.js Circom,Gas optimization required\n' +
      'PRB-03,EcoRoute Dynamic EV Navigation,IoT & CleanTech,Easy,Build an intelligent routing application that predicts optimal electric vehicle charging stops.,Responsive web app calculating optimal battery utilization curves.,React Leaflet Node.js OpenStreetMap,Real-time updates without heavy polling\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'hackathon_problems_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Problems to CSV per Phase 30
  const handleExportProblemsCsv = async () => {
    try {
      const csvContent = await ProblemService.exportProblemsToCsv();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `hackathon_problems_export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Problem statements exported to CSV.', 'success', 'Export Complete');
    } catch {
      showToast('Failed to export problem statements.', 'error', 'Export Failed');
    }
  };

  return (
    <AdminLayout
      title="PROBLEM STATEMENTS"
      description="Create, upload, organize and release official hackathon challenges."
      actionButton={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Upload className="w-4 h-4 text-[#164A36]" />}
            onClick={() => {
              setIsImportModalOpen(true);
              setParsedSummary(null);
              setUploadedFileName('');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="bg-white border-[#D5E6DB] text-[#164A36] hover:bg-[#EEF5F0]"
          >
            IMPORT PROBLEMS (PDF / CSV / EXCEL)
          </Button>
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportProblemsCsv}
            disabled={problems.length === 0}
            className="bg-white"
          >
            EXPORT PROBLEMS
          </Button>
          <Button
            to="/admin/problems/new"
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            ADD PROBLEM STATEMENT
          </Button>
        </div>
      }
    >
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search problems by ID, title, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36] focus:border-[#164A36]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#667085] shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
          >
            <option value="all">All Statuses ({problems.length})</option>
            <option value="PUBLISHED">Published (Live to Teams)</option>
            <option value="DRAFT">Drafts (Hidden)</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar (when 1 or more problems are selected) */}
      {selectedProblemIds.size > 0 && (
        <div className="p-4 bg-[#EEF5F0] border border-[#D5E6DB] rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs mb-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-[#164A36] bg-white px-3 py-1.5 rounded-lg border border-[#D5E6DB]">
              {selectedProblemIds.size} of {filteredProblems.length} Problems Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedProblemIds(new Set())}
              className="text-[#667085] hover:text-[#111827] font-semibold underline"
            >
              Deselect All
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatusChange('PUBLISHED')}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
            >
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Publish Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatusChange('DRAFT')}
              className="text-amber-700 border-amber-300 hover:bg-amber-50 font-bold"
            >
              Move to Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="text-rose-700 border-rose-300 hover:bg-rose-50 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete Selected ({selectedProblemIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Main Problems Table (Sections 26 & 27) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F7F5EF] border-b border-[#E5E7EB] text-[#4B5563] uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select All"
                    checked={selectedProblemIds.size > 0 && selectedProblemIds.size === filteredProblems.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-[#D1D5DB] text-[#164A36] focus:ring-[#164A36] cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3.5">Problem ID</th>
                <th className="px-5 py-3.5">Title</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">File</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Release Date</th>
                <th className="px-5 py-3.5">Teams Selected</th>
                <th className="px-5 py-3.5">Updated</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-[#667085]">
                    Loading problem statements...
                  </td>
                </tr>
              ) : filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-[#667085]">
                    {searchQuery
                      ? 'No problems match your search.'
                      : 'No problem statements created yet. Click "Add Problem Statement" above to create one.'}
                  </td>
                </tr>
              ) : (
                filteredProblems.map((p) => {
                  const statusVariants: Record<string, 'forest' | 'subtle' | 'amber' | 'neutral'> = {
                    PUBLISHED: 'forest',
                    DRAFT: 'amber',
                    SCHEDULED: 'subtle',
                    ARCHIVED: 'neutral',
                  };

                  const problemSelections = selectionMap.get(p.problemId) || [];
                  const selectionCount = problemSelections.length;
                  const isSelected = selectedProblemIds.has(p.problemId);

                  return (
                    <tr
                      key={p.problemId}
                      className={`hover:bg-[#F7F5EF]/50 transition-colors ${
                        isSelected ? 'bg-[#EEF5F0]/60' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-4 py-4 w-12 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${p.problemId}`}
                          checked={isSelected}
                          onChange={() => handleToggleRow(p.problemId)}
                          className="w-4 h-4 rounded border-[#D1D5DB] text-[#164A36] focus:ring-[#164A36] cursor-pointer"
                        />
                      </td>

                      {/* Problem ID */}
                      <td className="px-5 py-4 font-mono font-bold text-xs text-[#164A36]">
                        <button
                          onClick={() => setInspectProblem(p)}
                          className="hover:underline text-left font-bold"
                          title="View Admin Problem Details"
                        >
                          {p.problemId}
                        </button>
                      </td>

                      {/* Title */}
                      <td className="px-5 py-4 font-bold text-[#111827] max-w-xs">
                        <button
                          onClick={() => setInspectProblem(p)}
                          className="hover:text-[#164A36] text-left line-clamp-2"
                        >
                          {p.title}
                        </button>
                      </td>

                      {/* Description */}
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-xs text-[#4B5563] line-clamp-2 leading-relaxed" title={p.description}>
                          {p.description || 'No description provided.'}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className="text-xs text-[#4B5563] font-medium bg-[#F7F5EF] px-2.5 py-1 rounded border border-[#E5E7EB]">
                          {p.category}
                        </span>
                      </td>

                      {/* File */}
                      <td className="px-5 py-4">
                        {p.fileName ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#164A36] font-medium" title={p.fileName}>
                            <FileCheck className="w-4 h-4 shrink-0 text-[#164A36]" />
                            <span className="truncate max-w-[120px]">{p.fileName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">None</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        <Badge variant={statusVariants[p.status] || 'subtle'} size="sm">
                          {p.status}
                        </Badge>
                      </td>

                      {/* Release Date */}
                      <td className="px-5 py-4 text-xs text-[#667085]">
                        {p.releaseAt ? formatReleaseDate(p.releaseAt) : 'Immediate'}
                      </td>

                      {/* Teams Selected (Section 26) */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setInspectProblem(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            selectionCount > 0
                              ? 'bg-[#EEF5F0] text-[#164A36] hover:bg-[#D5E6DB] border border-[#D5E6DB]'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title="Click to view teams that selected this problem"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Selected by {selectionCount} {selectionCount === 1 ? 'team' : 'teams'}</span>
                        </button>
                      </td>

                      {/* Updated */}
                      <td className="px-5 py-4 text-xs text-[#667085]">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectProblem(p)}
                            className="p-1.5 rounded-lg text-[#667085] hover:text-[#164A36] hover:bg-[#EEF5F0]"
                            title="Inspect Details & Teams (Admin)"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <Link
                            to={`/participant/problem/${p.problemId}`}
                            className="p-1.5 rounded-lg text-[#667085] hover:text-[#164A36] hover:bg-[#EEF5F0]"
                            title="Preview Participant View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            to={`/admin/problems/edit/${p.problemId}`}
                            className="p-1.5 rounded-lg text-[#667085] hover:text-[#164A36] hover:bg-[#EEF5F0]"
                            title="Edit Problem"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {/* Toggle Publish / Draft */}
                          <button
                            onClick={() => setProblemToTogglePublish(p)}
                            className={`p-1.5 rounded-lg ${
                              p.status === 'PUBLISHED'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={p.status === 'PUBLISHED' ? 'Unpublish to Draft' : 'Publish Challenge'}
                          >
                            <Globe className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setProblemToDelete(p)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Delete Problem"
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
      {/* PROBLEM DETAIL & SELECTED TEAMS MODAL (Sections 27 & 28) */}
      {/* ========================================================= */}
      {inspectProblem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-2xl w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setInspectProblem(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#667085] hover:text-[#111827] hover:bg-[#F7F5EF]"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-[#164A36] bg-[#EEF5F0] px-2.5 py-1 rounded border border-[#D5E6DB]">
                {inspectProblem.problemId}
              </span>
              <Badge variant={inspectProblem.status === 'PUBLISHED' ? 'forest' : 'amber'} size="sm">
                {inspectProblem.status}
              </Badge>
            </div>
            <h3 className="text-xl font-extrabold text-[#111827] mt-2">
              {inspectProblem.title}
            </h3>

            {/* Problem Information Grid (Section 27) */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Category
                </span>
                <span className="text-xs font-semibold text-[#111827] mt-0.5 block">
                  {inspectProblem.category}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Difficulty
                </span>
                <span className="text-xs font-semibold text-[#111827] mt-0.5 block">
                  {inspectProblem.difficulty || 'Intermediate'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Release Date
                </span>
                <span className="text-xs font-semibold text-[#111827] mt-0.5 block">
                  {inspectProblem.releaseAt ? formatReleaseDate(inspectProblem.releaseAt) : 'Immediate'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Document
                </span>
                <span className="text-xs font-semibold text-[#164A36] mt-0.5 block truncate">
                  {inspectProblem.fileName || 'No attachment'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-1.5">
                Description
              </h4>
              <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed line-clamp-5">
                {inspectProblem.description}
              </p>
            </div>

            {/* SELECTION STATISTICS (Section 27 & 28) */}
            <div className="mt-6 pt-5 border-t border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#164A36]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#111827]">
                    Teams Selected ({selectionMap.get(inspectProblem.problemId)?.length || 0})
                  </h4>
                </div>
                <Link
                  to="/admin/selections"
                  className="text-xs font-semibold text-[#164A36] hover:underline flex items-center gap-1"
                >
                  View Selections Table <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Selected Teams List (Section 28) */}
              {(() => {
                const teamsList = selectionMap.get(inspectProblem.problemId) || [];
                if (teamsList.length === 0) {
                  return (
                    <div className="p-5 rounded-xl border border-dashed border-[#E5E7EB] text-center text-xs text-[#667085]">
                      No teams have selected this problem statement yet.
                    </div>
                  );
                }

                return (
                  <div className="border border-[#E5E7EB] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F5EF] border-b border-[#E5E7EB] text-[#4B5563] font-bold">
                        <tr>
                          <th className="px-3.5 py-2">Team Name</th>
                          <th className="px-3.5 py-2">Team Lead</th>
                          <th className="px-3.5 py-2">Selected At</th>
                          <th className="px-3.5 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {teamsList.map((ts) => {
                          const dt = formatSelectionDateTime(ts.selectedAt);
                          return (
                            <tr key={ts.teamId} className="hover:bg-gray-50">
                              <td className="px-3.5 py-2.5 font-bold text-[#111827]">
                                <Link
                                  to={`/admin/participants/${ts.teamId}`}
                                  className="hover:text-[#164A36] hover:underline"
                                >
                                  {ts.teamName}
                                </Link>
                                <span className="block font-mono text-[10px] text-[#667085]">
                                  {ts.teamId}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-[#4B5563]">
                                {ts.teamLeadName}
                              </td>
                              <td className="px-3.5 py-2.5 text-[#667085] whitespace-nowrap">
                                {dt.date} {dt.time}
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <Link
                                  to={`/admin/participants/${ts.teamId}`}
                                  className="inline-flex items-center text-[11px] font-semibold text-[#164A36] hover:underline"
                                >
                                  View Dossier <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInspectProblem(null)}
              >
                Close
              </Button>
              <Button
                to={`/admin/problems/edit/${inspectProblem.problemId}`}
                variant="primary"
                size="sm"
              >
                Edit Problem
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BULK IMPORT PROBLEMS MODAL (CSV, EXCEL, PDF) */}
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
                  Bulk Import Problem Statements
                </h3>
                <p className="text-xs text-[#667085] mt-1">
                  Upload a direct <strong>PDF, CSV file, or Excel sheet (.xlsx, .xls)</strong>. The system will automatically extract, recognize, and catalog all challenges.
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
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] text-[#164A36] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>

                <p className="text-sm font-bold text-[#111827]">
                  {uploadedFileName
                    ? `Selected: ${uploadedFileName}`
                    : 'Click or drag & drop challenge file here'}
                </p>
                <p className="text-xs text-[#667085] mt-1">
                  Upload CSV, Excel (.xlsx, .xls), or PDF documents containing problem statements.
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
                      downloadSampleProblemTemplate();
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
                  <span>Extracting, parsing, and validating problem statements...</span>
                </div>
              )}

              {/* Validation Summary Banner */}
              {parsedSummary && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
                    <div className="flex items-center gap-4 text-xs sm:text-sm">
                      <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> ✓ {parsedSummary.validCount} valid problems
                      </span>

                      {parsedSummary.invalidCount > 0 && (
                        <span className="font-bold text-amber-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> ⚠ {parsedSummary.invalidCount} issues found
                        </span>
                      )}

                      {parsedSummary.duplicateCount > 0 && (
                        <span className="font-bold text-rose-700 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" /> ✖ {parsedSummary.duplicateCount} duplicates
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-[#667085] font-mono">
                      {parsedSummary.totalRows} Total Items Processed
                    </span>
                  </div>

                  {/* Errors List if any */}
                  {parsedSummary.invalidProblems.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 max-h-36 overflow-y-auto">
                      <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Issues Found (Will Not Be Imported):
                      </div>
                      {parsedSummary.invalidProblems.map((inv, idx) => (
                        <div key={idx} className="font-mono text-[11px]">
                          • Row {inv.rowNumber} [{inv.problemId || 'No ID'}]: {inv.errors && inv.errors.length > 0 ? inv.errors.join(', ') : 'Missing required challenge fields'}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview Table of Valid Problems */}
                  {parsedSummary.validProblems.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                        Problem Statements Preview ({parsedSummary.validProblems.length})
                      </h4>

                      <div className="border border-[#E5E7EB] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#F7F5EF] text-[#4B5563] font-bold border-b border-[#E5E7EB]">
                            <tr>
                              <th className="px-3.5 py-2.5">Problem ID</th>
                              <th className="px-3.5 py-2.5">Title</th>
                              <th className="px-3.5 py-2.5">Category</th>
                              <th className="px-3.5 py-2.5">Difficulty</th>
                              <th className="px-3.5 py-2.5">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {parsedSummary.validProblems.map((prob, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3.5 py-2 font-mono font-bold text-[#164A36]">
                                  {prob.problemId}
                                </td>
                                <td className="px-3.5 py-2 font-semibold text-[#111827]">
                                  {prob.title}
                                </td>
                                <td className="px-3.5 py-2 text-[#4B5563]">
                                  {prob.category || 'General'}
                                </td>
                                <td className="px-3.5 py-2">
                                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold">
                                    {prob.difficulty || 'Medium'}
                                  </span>
                                </td>
                                <td className="px-3.5 py-2 text-[#667085] truncate max-w-xs">
                                  {prob.description}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#E5E7EB] flex items-center justify-between bg-gray-50">
              <span className="text-xs text-[#667085]">
                {parsedSummary && parsedSummary.validProblems.length > 0
                  ? `Ready to import ${parsedSummary.validProblems.length} problem statement(s).`
                  : 'Please upload a CSV, Excel, or PDF document.'}
              </span>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setParsedSummary(null);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleImportValidProblems}
                  disabled={!parsedSummary || parsedSummary.validProblems.length === 0 || isLoading}
                >
                  {isLoading ? 'Importing...' : `Import ${parsedSummary?.validCount || 0} Problems`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs per Part 18 */}
      <ConfirmDialog
        isOpen={Boolean(problemToTogglePublish)}
        title={
          problemToTogglePublish?.status === 'PUBLISHED'
            ? 'Unpublish Problem Statement?'
            : 'Publish Problem Statement?'
        }
        message={
          problemToTogglePublish?.status === 'PUBLISHED'
            ? `Moving "${problemToTogglePublish?.problemId}" back to DRAFT will immediately hide it from participant portals.`
            : `Publishing "${problemToTogglePublish?.problemId}" will make it immediately visible to all participating teams.`
        }
        confirmText={
          problemToTogglePublish?.status === 'PUBLISHED' ? 'Unpublish' : 'Publish Live'
        }
        isDangerous={problemToTogglePublish?.status === 'PUBLISHED'}
        onCancel={() => setProblemToTogglePublish(null)}
        onConfirm={handleTogglePublishConfirm}
      />

      <ConfirmDialog
        isOpen={Boolean(problemToDelete)}
        title="Permanently Delete Problem Statement?"
        message={`Are you sure you want to delete "${problemToDelete?.title}" (${problemToDelete?.problemId})? This action cannot be reversed.`}
        confirmText="Delete Problem"
        isDangerous
        onCancel={() => setProblemToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteModalOpen}
        title={`Delete ${selectedProblemIds.size} Selected Problems?`}
        message={`Are you sure you want to permanently delete all ${selectedProblemIds.size} selected problem statements? Any team selections associated with these problems will also be impacted. This action cannot be undone.`}
        confirmText={isDeletingBulk ? 'Deleting...' : `Delete ${selectedProblemIds.size} Problems`}
        isDangerous
        onCancel={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
      />
    </AdminLayout>
  );
};
