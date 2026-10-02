import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Calendar,
  Archive,
  FileCheck,
  CheckSquare,
  Square,
  Clock,
  Globe,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { ProblemService } from '../../services/problemService';
import { SettingsService } from '../../services/settingsService';
import { AuditService } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatReleaseDate } from '../../utils/formatters';
import type { ProblemRecord } from '../../types';

export const AdminReleaseControlPage: React.FC = () => {
  const { admin } = useAuth();
  const { showToast } = useToast();
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Global Release Form
  const [globalDate, setGlobalDate] = useState('');
  const [globalTime, setGlobalTime] = useState('10:00');
  const [globalStatus, setGlobalStatus] = useState<'NOT_STARTED' | 'LIVE' | 'CLOSED'>('NOT_STARTED');
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  // Schedule Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTargetProblem, setScheduleTargetProblem] = useState<ProblemRecord | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDangerous?: boolean;
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
      const [allProbs, portalSettings] = await Promise.all([
        ProblemService.getAllProblems({ forParticipant: false }),
        SettingsService.getSettings(),
      ]);
      setProblems(allProbs);
      setSettings(portalSettings);
      if (portalSettings) {
        setGlobalDate(portalSettings.globalReleaseDate || '');
        setGlobalTime(portalSettings.globalReleaseTime || '10:00');
        setGlobalStatus(portalSettings.globalReleaseStatus || 'NOT_STARTED');
      }
    } catch (err) {
      console.error('Failed to load release control data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // REAL database counts
  const counts = useMemo(() => {
    return {
      DRAFT: problems.filter((p) => p.status === 'DRAFT').length,
      SCHEDULED: problems.filter((p) => p.status === 'SCHEDULED').length,
      PUBLISHED: problems.filter((p) => p.status === 'PUBLISHED').length,
      ARCHIVED: problems.filter((p) => p.status === 'ARCHIVED').length,
      TOTAL: problems.length,
    };
  }, [problems]);

  // Bulk Selection Helpers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === problems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(problems.map((p) => p.problemId)));
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Single Action: Publish Now with Validation (Step 8 #4)
  const handlePublishNow = (problem: ProblemRecord) => {
    const validation = ProblemService.validateForRelease(problem);
    if (!validation.valid) {
      showToast(
        `Cannot publish: ${validation.errors.join('; ')}`,
        'error',
        'Release Validation Failed'
      );
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Publish Problem Immediately?',
      message: `Problem "${problem.title}" (${problem.problemId}) will become visible to all participating teams right now.`,
      confirmText: 'Publish Now',
      isDangerous: false,
      onConfirm: async () => {
        try {
          await ProblemService.updateProblemStatus(problem.problemId, 'PUBLISHED');
          await AuditService.logAction({
            action: 'PROBLEM_PUBLISHED',
            adminId: admin?.email || 'admin',
            target: problem.problemId,
            details: `Published problem "${problem.title}" immediately.`,
          });
          showToast(`Problem "${problem.problemId}" is now PUBLISHED.`, 'success');
          await loadData();
        } catch (err: any) {
          showToast(err?.message || 'Publishing failed.', 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Single Action: Unpublish to Draft
  const handleUnpublish = (problem: ProblemRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Unpublish to Draft?',
      message: `Moving "${problem.problemId}" back to DRAFT will immediately hide it from all participant portals.`,
      confirmText: 'Unpublish to Draft',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await ProblemService.updateProblemStatus(problem.problemId, 'DRAFT');
          await AuditService.logAction({
            action: 'PROBLEM_UNPUBLISHED',
            adminId: admin?.email || 'admin',
            target: problem.problemId,
            details: `Unpublished problem "${problem.title}" to DRAFT.`,
          });
          showToast(`Problem "${problem.problemId}" moved to DRAFT.`, 'info');
          await loadData();
        } catch (err: any) {
          showToast(err?.message || 'Unpublishing failed.', 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Single Action: Archive
  const handleArchive = (problem: ProblemRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Archive Problem Statement?',
      message: `Archiving "${problem.problemId}" removes it from active challenge consideration for participants.`,
      confirmText: 'Archive Challenge',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await ProblemService.updateProblemStatus(problem.problemId, 'ARCHIVED');
          await AuditService.logAction({
            action: 'PROBLEM_ARCHIVED',
            adminId: admin?.email || 'admin',
            target: problem.problemId,
            details: `Archived problem "${problem.title}".`,
          });
          showToast(`Problem "${problem.problemId}" archived.`, 'info');
          await loadData();
        } catch (err: any) {
          showToast(err?.message || 'Archiving failed.', 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Single Action: Open Schedule Modal
  const openScheduleModal = (problem?: ProblemRecord) => {
    setScheduleTargetProblem(problem || null);
    if (problem && problem.releaseAt) {
      const [d, t] = problem.releaseAt.split('T');
      setScheduleDate(d);
      setScheduleTime(t ? t.substring(0, 5) : '10:00');
    } else {
      setScheduleDate(new Date().toISOString().split('T')[0]);
      setScheduleTime('10:00');
    }
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDate) {
      showToast('Please select a valid release date.', 'error');
      return;
    }

    const releaseTimestamp = `${scheduleDate}T${scheduleTime || '09:00'}:00+05:30`;

    try {
      if (scheduleTargetProblem) {
        // Validation check before scheduling
        const validation = ProblemService.validateForRelease(scheduleTargetProblem);
        if (!validation.valid) {
          showToast(`Cannot schedule: ${validation.errors.join('; ')}`, 'error');
          return;
        }

        await ProblemService.updateProblemStatus(
          scheduleTargetProblem.problemId,
          'SCHEDULED',
          releaseTimestamp
        );
        await AuditService.logAction({
          action: 'PROBLEM_EDITED',
          adminId: admin?.email || 'admin',
          target: scheduleTargetProblem.problemId,
          details: `Scheduled release for ${scheduleDate} at ${scheduleTime}`,
        });
        showToast(`Problem "${scheduleTargetProblem.problemId}" scheduled for ${scheduleDate} ${scheduleTime}.`, 'success');
      } else if (selectedIds.size > 0) {
        // Bulk schedule selected
        const ids = Array.from(selectedIds);
        const res = await ProblemService.bulkUpdateStatus(ids, 'SCHEDULED', releaseTimestamp);
        await AuditService.logAction({
          action: 'BULK_RELEASE',
          adminId: admin?.email || 'admin',
          details: `Bulk scheduled ${res.updatedCount} problems for ${scheduleDate} ${scheduleTime}`,
        });
        showToast(`Scheduled ${res.updatedCount} problem statements.`, 'success');
      }
      setScheduleModalOpen(false);
      setSelectedIds(new Set());
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Scheduling failed.', 'error');
    }
  };

  // Bulk Actions
  const handleBulkPublish = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: `Publish ${ids.length} Selected Problem Statements?`,
      message: `All ${ids.length} selected challenges will be validated and published immediately to participant portals.`,
      confirmText: 'Publish All Selected',
      onConfirm: async () => {
        try {
          const res = await ProblemService.bulkUpdateStatus(ids, 'PUBLISHED');
          await AuditService.logAction({
            action: 'BULK_RELEASE',
            adminId: admin?.email || 'admin',
            details: `Bulk published ${res.updatedCount} problems.`,
          });
          if (res.errors.length > 0) {
            showToast(`Published ${res.updatedCount} items. Errors: ${res.errors.join(', ')}`, 'error');
          } else {
            showToast(`Successfully published ${res.updatedCount} problem statements.`, 'success');
          }
          setSelectedIds(new Set());
          await loadData();
        } catch (err: any) {
          showToast(err?.message || 'Bulk publish failed.', 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleBulkArchive = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: `Archive ${ids.length} Selected Problem Statements?`,
      message: `Selected problem statements will be archived and hidden from participants.`,
      confirmText: 'Archive Selected',
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await ProblemService.bulkUpdateStatus(ids, 'ARCHIVED');
          await AuditService.logAction({
            action: 'BULK_RELEASE',
            adminId: admin?.email || 'admin',
            details: `Bulk archived ${res.updatedCount} problems.`,
          });
          showToast(`Archived ${res.updatedCount} problem statements.`, 'info');
          setSelectedIds(new Set());
          await loadData();
        } catch (err: any) {
          showToast(err?.message || 'Bulk archive failed.', 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Global Release Configuration Handler (Step 8 #9)
  const handleSaveGlobalRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGlobal(true);
    try {
      await SettingsService.updateSettings(
        {
          globalReleaseDate: globalDate || undefined,
          globalReleaseTime: globalTime || undefined,
          globalReleaseStatus: globalStatus,
        },
        admin?.email || 'admin'
      );
      await AuditService.logAction({
        action: 'UPDATE_SETTINGS',
        adminId: admin?.email || 'admin',
        details: `Updated global release event: status=${globalStatus}, date=${globalDate}, time=${globalTime}`,
      });
      showToast('Global release configuration updated successfully.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update global release.', 'error');
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const globalReleaseTimestamp = globalDate ? `${globalDate}T${globalTime || '10:00'}:00` : '';

  return (
    <AdminLayout
      title="RELEASE CONTROL DASHBOARD"
      description="Manage draft, scheduled, published and archived challenge lifecycles with granular release timers."
    >
      {/* 1. REAL DATABASE COUNTS CARDS (Step 8 #6) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {/* DRAFT */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-1 font-bold uppercase tracking-wider">
            <span>DRAFT</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-[#111827]">
            {isLoading ? '...' : counts.DRAFT}
          </div>
          <p className="text-xs text-[#667085] mt-1">Hidden from participants</p>
        </div>

        {/* SCHEDULED */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-1 font-bold uppercase tracking-wider">
            <span>SCHEDULED</span>
            <Clock className="w-3.5 h-3.5 text-[#164A36]" />
          </div>
          <div className="text-3xl font-extrabold text-[#164A36]">
            {isLoading ? '...' : counts.SCHEDULED}
          </div>
          <p className="text-xs text-[#667085] mt-1">Awaiting release time</p>
        </div>

        {/* PUBLISHED */}
        <div className="p-5 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#164A36] mb-1 font-bold uppercase tracking-wider">
            <span>PUBLISHED</span>
            <Send className="w-3.5 h-3.5 text-[#164A36]" />
          </div>
          <div className="text-3xl font-extrabold text-[#164A36]">
            {isLoading ? '...' : counts.PUBLISHED}
          </div>
          <p className="text-xs text-[#164A36] font-medium">Live on participant portals</p>
        </div>

        {/* ARCHIVED */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-1 font-bold uppercase tracking-wider">
            <span>ARCHIVED</span>
            <Archive className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div className="text-3xl font-extrabold text-gray-600">
            {isLoading ? '...' : counts.ARCHIVED}
          </div>
          <p className="text-xs text-[#667085] mt-1">Inactive challenges</p>
        </div>
      </div>

      {/* 2. GLOBAL RELEASE CONFIGURATION & COUNTDOWN PREVIEW (Step 8 #9) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F3F4F6] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Global Problem Release Event
              </h2>
              <p className="text-xs text-[#667085]">
                Configure event-wide unlock schedule and participant banner countdown.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F5EF] text-xs font-semibold border border-[#E5E7EB]">
            <span className="text-[#667085]">Current Status:</span>
            <span className="font-bold text-[#164A36]">{globalStatus}</span>
          </div>
        </div>

        <form onSubmit={handleSaveGlobalRelease} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                Release Date
              </label>
              <input
                type="date"
                value={globalDate}
                onChange={(e) => setGlobalDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                Release Time (IST)
              </label>
              <input
                type="time"
                value={globalTime}
                onChange={(e) => setGlobalTime(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                Release Event Status
              </label>
              <select
                value={globalStatus}
                onChange={(e) => setGlobalStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              >
                <option value="NOT_STARTED">NOT STARTED (Show Countdown)</option>
                <option value="LIVE">LIVE (Release Active)</option>
                <option value="CLOSED">CLOSED (Selection Ended)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#667085]">
              Timezone: <strong className="text-[#111827]">Asia/Kolkata (IST)</strong>
            </span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingGlobal}
            >
              {isSavingGlobal ? 'Saving...' : 'Update Global Release Settings'}
            </Button>
          </div>
        </form>

        {/* Live Countdown Preview if configured */}
        {globalReleaseTimestamp && globalStatus === 'NOT_STARTED' && (
          <div className="mt-5 pt-4 border-t border-[#F3F4F6]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
              Participant Countdown Preview:
            </p>
            <CountdownTimer
              targetDate={globalReleaseTimestamp}
              label="PROBLEM STATEMENTS RELEASE IN"
              onExpire={() => {
                showToast('Global release countdown reached zero.', 'info');
                loadData();
              }}
            />
          </div>
        )}
      </div>

      {/* 3. BULK RELEASE TOOLBAR & MANAGEMENT TABLE (Step 8 #5) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs">
        {/* Bulk Action Header */}
        <div className="p-4 sm:p-5 bg-[#F7F5EF] border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-2 text-xs font-bold text-[#111827] hover:text-[#164A36]"
            >
              {selectedIds.size === problems.length && problems.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#164A36]" />
              ) : (
                <Square className="w-4 h-4 text-[#667085]" />
              )}
              <span>SELECT ALL ({problems.length})</span>
            </button>

            {selectedIds.size > 0 && (
              <span className="text-xs font-mono font-bold text-[#164A36] bg-[#EEF5F0] px-2.5 py-0.5 rounded border border-[#D5E6DB]">
                {selectedIds.size} SELECTED
              </span>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkPublish}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                PUBLISH SELECTED
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => openScheduleModal()}
                leftIcon={<Calendar className="w-3.5 h-3.5" />}
                className="bg-white"
              >
                SCHEDULE SELECTED
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkArchive}
                leftIcon={<Archive className="w-3.5 h-3.5 text-gray-500" />}
                className="bg-white"
              >
                ARCHIVE SELECTED
              </Button>
            </div>
          )}
        </div>

        {/* Problems Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F7F5EF]/60 border-b border-[#E5E7EB] text-[#4B5563] uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3">Problem ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Scheduled Release</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[#667085]">
                    Loading problem release states...
                  </td>
                </tr>
              ) : problems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[#667085]">
                    No problem statements found in the database.
                  </td>
                </tr>
              ) : (
                problems.map((p) => {
                  const isChecked = selectedIds.has(p.problemId);

                  const statusBadges: Record<string, 'forest' | 'subtle' | 'amber' | 'neutral'> = {
                    PUBLISHED: 'forest',
                    DRAFT: 'amber',
                    SCHEDULED: 'subtle',
                    ARCHIVED: 'neutral',
                  };

                  return (
                    <tr
                      key={p.problemId}
                      className={`hover:bg-[#F7F5EF]/40 transition-colors ${
                        isChecked ? 'bg-[#EEF5F0]/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleRow(p.problemId)}
                          className="text-[#667085] hover:text-[#164A36]"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#164A36]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Problem ID */}
                      <td className="px-4 py-3.5 font-mono font-bold text-xs text-[#164A36]">
                        {p.problemId}
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3.5 font-semibold text-[#111827] max-w-xs truncate">
                        {p.title}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 text-xs text-[#4B5563]">
                        {p.category}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge variant={statusBadges[p.status] || 'subtle'} size="sm">
                          {p.status}
                        </Badge>
                      </td>

                      {/* Scheduled Release */}
                      <td className="px-4 py-3.5 text-xs text-[#667085]">
                        {p.releaseAt ? formatReleaseDate(p.releaseAt) : '—'}
                      </td>

                      {/* Document */}
                      <td className="px-4 py-3.5">
                        {p.fileName ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#164A36] font-medium" title={p.fileName}>
                            <FileCheck className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[100px]">{p.fileName}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">None</span>
                        )}
                      </td>

                      {/* Release Controls (Step 8 #2) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status !== 'PUBLISHED' && (
                            <button
                              onClick={() => handlePublishNow(p)}
                              className="px-2 py-1 text-xs font-bold text-[#164A36] hover:bg-[#EEF5F0] rounded-md transition-colors"
                              title="Publish immediately"
                            >
                              Publish
                            </button>
                          )}

                          {p.status === 'PUBLISHED' && (
                            <button
                              onClick={() => handleUnpublish(p)}
                              className="px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                              title="Unpublish back to DRAFT"
                            >
                              Unpublish
                            </button>
                          )}

                          <button
                            onClick={() => openScheduleModal(p)}
                            className="px-2 py-1 text-xs font-bold text-[#4B5563] hover:text-[#111827] hover:bg-gray-100 rounded-md transition-colors"
                            title="Schedule Release"
                          >
                            Schedule
                          </button>

                          {p.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => handleArchive(p)}
                              className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                              title="Archive Challenge"
                            >
                              Archive
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

      {/* Schedule Release Modal (Step 8 #3) */}
      {scheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[#111827]">
              {scheduleTargetProblem
                ? `Schedule Release: ${scheduleTargetProblem.problemId}`
                : `Schedule Release for ${selectedIds.size} Selected Problems`}
            </h3>
            <p className="text-xs text-[#667085] mt-1">
              At the exact release time, problems transition automatically to PUBLISHED and become visible in participant portals.
            </p>

            <form onSubmit={handleSaveSchedule} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Release Date *
                </label>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E7EB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Release Time (IST) *
                </label>
                <input
                  type="time"
                  required
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E7EB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setScheduleModalOpen(false)}
                  className="bg-white"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDangerous={confirmDialog.isDangerous}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
      />
    </AdminLayout>
  );
};
