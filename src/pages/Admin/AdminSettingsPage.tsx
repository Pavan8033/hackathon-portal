import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Shield,
  Save,
  Lock,
  Unlock,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Users,
  Trash2,
  Upload,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { isFirebaseConfigured } from '../../lib/firebase';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';
import { SettingsService, DEFAULT_SETTINGS } from '../../services/settingsService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useEvent } from '../../context/EventContext';
import { formatSelectionDateTime } from '../../utils/formatters';
import type { PortalSettings } from '../../types';

export const AdminSettingsPage: React.FC = () => {
  const { admin } = useAuth();
  const { showToast } = useToast();
  const { eventConfig, updateEventConfig, deleteSession } = useEvent();

  const [settings, setSettings] = useState<PortalSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  // Close Selection Modal State (Section 38)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Event Creation & Branding fields
  const [eventName, setEventName] = useState(eventConfig.eventName);
  const [clubName, setClubName] = useState(eventConfig.clubName);
  const [clubLogo, setClubLogo] = useState(eventConfig.clubLogo || '');
  const [eventBanner, setEventBanner] = useState(eventConfig.eventBanner || '');
  const [problemSelectionLimit, setProblemSelectionLimit] = useState(eventConfig.problemSelectionLimit || 2);

  // Session Delete modal state
  const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);
  const [deleteSessionConfirmText, setDeleteSessionConfirmText] = useState('');
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  // Support fields
  const [supportEmail, setSupportEmail] = useState(HACKATHON_CONFIG.contactInformation.email);
  const [supportHours, setSupportHours] = useState(HACKATHON_CONFIG.contactInformation.supportHours);

  // Deadline draft field
  const [deadlineInput, setDeadlineInput] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await SettingsService.getSettings();
        setSettings(data);
        if (data.selectionDeadline) {
          // Convert to datetime-local format YYYY-MM-DDTHH:mm
          const d = new Date(data.selectionDeadline);
          if (!isNaN(d.getTime())) {
            const pad = (n: number) => n.toString().padStart(2, '0');
            const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setDeadlineInput(localStr);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    load();
  }, []);

  // Synchronize state when eventConfig updates
  useEffect(() => {
    setEventName(eventConfig.eventName);
    setClubName(eventConfig.clubName);
    setClubLogo(eventConfig.clubLogo || '');
    setEventBanner(eventConfig.eventBanner || '');
    setProblemSelectionLimit(eventConfig.problemSelectionLimit || 2);
    if (eventConfig.contactEmail) setSupportEmail(eventConfig.contactEmail);
    if (eventConfig.supportHours) setSupportHours(eventConfig.supportHours);
  }, [eventConfig]);

  // Image Upload Converters to Data URLs
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setClubLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') return;

      // Ensure full free-style aspect ratio is preserved with high quality
      const img = new Image();
      img.onload = () => {
        const maxDimension = 2048;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const optimizedDataUrl = canvas.toDataURL(mimeType, 0.92);
            setEventBanner(optimizedDataUrl);
            return;
          }
        }
        setEventBanner(result);
      };
      img.onerror = () => {
        setEventBanner(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEventConfig = async () => {
    setIsSaving(true);
    try {
      await updateEventConfig({
        eventName: eventName.trim() || 'Hackathon Portal',
        clubName: clubName.trim() || 'Student Chapter',
        clubLogo: clubLogo.trim(),
        eventBanner: eventBanner.trim(),
        problemSelectionLimit: Math.max(1, Number(problemSelectionLimit) || 2),
        contactEmail: supportEmail.trim(),
        supportHours: supportHours.trim(),
      });

      await SettingsService.updateSettings({
        problemSelectionLimit: Math.max(1, Number(problemSelectionLimit) || 2),
      }, admin?.email || 'admin');

      showToast('Event configuration, branding, and team selection limits updated and saved permanently.', 'success', 'Event Saved');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save event configuration.', 'error', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSessionConfirm = async () => {
    if (deleteSessionConfirmText.trim().toUpperCase() !== 'DELETE SESSION') {
      showToast('Please type "DELETE SESSION" in capital letters to confirm.', 'error', 'Confirmation Required');
      return;
    }
    setIsDeletingSession(true);
    try {
      await deleteSession();
      showToast('Session successfully deleted. All credentials revoked and selections wiped.', 'info', 'Session Reset Complete');
      setIsDeleteSessionModalOpen(false);
      setDeleteSessionConfirmText('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete session.', 'error', 'Error');
    } finally {
      setIsDeletingSession(false);
    }
  };

  // Handle open selection
  const handleOpenSelection = async () => {
    setIsSaving(true);
    try {
      const updated = await SettingsService.toggleSelection(true, admin?.email || 'admin');
      setSettings(updated);
      showToast('Problem selection is now OPEN to all eligible participating teams.', 'success', 'Selection Opened');
    } catch (err: any) {
      showToast(err.message || 'Failed to update selection status.', 'error', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle confirm close selection (Section 38)
  const handleConfirmCloseSelection = async () => {
    setIsSaving(true);
    try {
      const updated = await SettingsService.toggleSelection(false, admin?.email || 'admin');
      setSettings(updated);
      setIsCloseModalOpen(false);
      showToast('Problem selection has been CLOSED. Teams cannot claim problems.', 'warning', 'Selection Closed');
    } catch (err: any) {
      showToast(err.message || 'Failed to close selection.', 'error', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle toggle allowMultipleTeamsPerProblem (Section 8 & 36)
  const handleToggleMultipleTeams = async (allow: boolean) => {
    setIsSaving(true);
    try {
      const updated = await SettingsService.updateSettings(
        { allowMultipleTeamsPerProblem: allow },
        admin?.email || 'admin'
      );
      setSettings(updated);
      showToast(
        allow
          ? 'Multiple teams are now permitted to select the same problem statement.'
          : 'Strict exclusivity enabled: Each problem can only be selected by one team.',
        'info',
        'Policy Updated'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update policy.', 'error', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle save deadline
  const handleSaveDeadline = async () => {
    setIsSaving(true);
    try {
      const iso = deadlineInput ? new Date(deadlineInput).toISOString() : '';
      const updated = await SettingsService.updateSettings(
        { selectionDeadline: iso },
        admin?.email || 'admin'
      );
      setSettings(updated);
      showToast(
        iso
          ? 'Selection deadline saved and active across participant portals.'
          : 'Selection deadline cleared.',
        'success',
        'Deadline Updated'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to save deadline.', 'error', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDeadline = async () => {
    setDeadlineInput('');
    setIsSaving(true);
    try {
      const updated = await SettingsService.updateSettings(
        { selectionDeadline: '' },
        admin?.email || 'admin'
      );
      setSettings(updated);
      showToast('Selection deadline removed.', 'info', 'Deadline Cleared');
    } catch (err: any) {
      showToast(err.message || 'Failed to clear deadline.', 'error', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if deadline is currently expired
  const isDeadlineExpired = Boolean(
    settings.selectionDeadline &&
    new Date(settings.selectionDeadline).getTime() < Date.now()
  );

  return (
    <AdminLayout
      title="PORTAL SETTINGS & SELECTION CONTROL"
      description="System operational parameters, selection gates, allocation policies, and Firebase infrastructure."
    >
      <div className="space-y-8 max-w-5xl">
        {/* ========================================================= */}
        {/* 1. PROBLEM SELECTION CONTROL GATE (Sections 36, 37, 38) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E5E7EB] gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  settings.isSelectionOpen && !isDeadlineExpired
                    ? 'bg-[#EEF5F0] text-[#164A36]'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {settings.isSelectionOpen && !isDeadlineExpired ? (
                  <Unlock className="w-6 h-6" />
                ) : (
                  <Lock className="w-6 h-6" />
                )}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                  Core Operational Control (Sections 36 & 38)
                </span>
                <h3 className="text-xl font-extrabold text-[#111827]">
                  Problem Selection Gate
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {settings.isSelectionOpen && !isDeadlineExpired ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB]">
                  <CheckCircle2 className="w-4 h-4" />
                  SELECTION IS OPEN
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                  <Lock className="w-4 h-4" />
                  SELECTION IS CLOSED
                </span>
              )}
            </div>
          </div>

          <div className="py-6 border-b border-[#E5E7EB] grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <h4 className="text-sm font-bold text-[#111827]">
                Master Selection Switch
              </h4>
              <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                When closed, participants can still browse and review all published problem statements and documentation, but are strictly blocked from locking in any selection.
              </p>
            </div>

            <div className="flex items-center gap-3 sm:justify-end">
              {settings.isSelectionOpen ? (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsCloseModalOpen(true)}
                  disabled={isSaving}
                  className="text-red-700 border-red-300 hover:bg-red-50"
                >
                  <Lock className="w-4 h-4 mr-1.5" />
                  CLOSE SELECTION
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleOpenSelection}
                  disabled={isSaving}
                >
                  <Unlock className="w-4 h-4 mr-1.5" />
                  OPEN SELECTION
                </Button>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. SELECTION DEADLINE CONFIGURATION (Section 36 & 37) */}
          {/* ========================================================= */}
          <div className="py-6 border-b border-[#E5E7EB]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#164A36]" />
                  Selection Deadline (Optional)
                </h4>
                <p className="text-xs text-[#667085] mt-0.5">
                  Automated cutoff point. Past this timestamp, selection is blocked by both frontend and atomic database transaction.
                </p>
              </div>

              {settings.selectionDeadline && (
                <Badge variant={isDeadlineExpired ? 'amber' : 'subtle'} size="sm">
                  {isDeadlineExpired ? 'DEADLINE EXPIRED' : 'DEADLINE ACTIVE'}
                </Badge>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="datetime-local"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                className="px-3.5 py-2 text-xs font-mono font-medium rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36] flex-1"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveDeadline}
                disabled={isSaving}
              >
                Apply Deadline
              </Button>
              {settings.selectionDeadline && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearDeadline}
                  disabled={isSaving}
                >
                  Clear Deadline
                </Button>
              )}
            </div>

            {settings.selectionDeadline && (
              <p className="text-[11px] text-[#667085] mt-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#164A36]" />
                Enforced cutoff: <span className="font-semibold text-[#111827]">{formatSelectionDateTime(settings.selectionDeadline).combined}</span>
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* 3. MULTI-TEAM SELECTION POLICY (Section 8 & 36) */}
          {/* ========================================================= */}
          <div className="pt-6">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#164A36]" />
                Problem Claim Allocation Policy
              </h4>
              <p className="text-xs text-[#667085] mt-0.5">
                Configure whether multiple teams can tackle the same problem statement or if problems are strictly 1-per-team.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleToggleMultipleTeams(true)}
                disabled={isSaving}
                className={`p-4 rounded-xl border text-left transition-all ${
                  settings.allowMultipleTeamsPerProblem
                    ? 'border-[#164A36] bg-[#EEF5F0]/60 ring-2 ring-[#164A36]'
                    : 'border-[#E5E7EB] bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827]">
                    Multiple Teams Per Problem (Default)
                  </span>
                  {settings.allowMultipleTeamsPerProblem && (
                    <CheckCircle2 className="w-4 h-4 text-[#164A36]" />
                  )}
                </div>
                <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                  Recommended for standard hackathons. Multiple cohorts can independently innovate on the same challenge tracks.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleToggleMultipleTeams(false)}
                disabled={isSaving}
                className={`p-4 rounded-xl border text-left transition-all ${
                  !settings.allowMultipleTeamsPerProblem
                    ? 'border-[#164A36] bg-[#EEF5F0]/60 ring-2 ring-[#164A36]'
                    : 'border-[#E5E7EB] bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827]">
                    One Team Per Problem (Exclusive Claim)
                  </span>
                  {!settings.allowMultipleTeamsPerProblem && (
                    <CheckCircle2 className="w-4 h-4 text-[#164A36]" />
                  )}
                </div>
                <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                  First-come-first-served exclusivity. Once a team confirms a challenge, it becomes unavailable to other teams.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Backend & Firebase Health Panel */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6] mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Backend & Firebase Storage Status
                </h3>
                <p className="text-xs text-[#667085]">
                  Centralized Firebase Foundation & Atomic Selection Transactions
                </p>
              </div>
            </div>

            <Badge variant={isFirebaseConfigured ? 'forest' : 'subtle'} size="md">
              {isFirebaseConfigured ? 'LIVE FIREBASE CONNECTED' : 'LOCAL PERSISTENCE MODE'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] space-y-1">
              <span className="font-bold text-[#667085] uppercase tracking-wider block text-[11px]">
                Authentication
              </span>
              <p className="font-semibold text-[#111827]">
                Firebase Auth & Role Partitioning
              </p>
              <p className="text-[#667085]">
                Role-aware segregation (Admin & Participant)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] space-y-1">
              <span className="font-bold text-[#667085] uppercase tracking-wider block text-[11px]">
                Cloud Firestore
              </span>
              <p className="font-semibold text-[#111827]">
                Collections: /teamSelections & /auditLogs
              </p>
              <p className="text-[#667085]">
                Atomic transactions block double-selection race conditions
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] space-y-1">
              <span className="font-bold text-[#667085] uppercase tracking-wider block text-[11px]">
                Firebase Storage
              </span>
              <p className="font-semibold text-[#111827]">
                Bucket: problem-documents/
              </p>
              <p className="text-[#667085]">
                PDF, DOCX, XLSX attachments under 15MB limit
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* EVENT CREATION, BRANDING & SELECTION LIMITS */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#F3F4F6]">
            <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Event Creation, Branding & Problem Limits
              </h3>
              <p className="text-xs text-[#667085]">
                Configure event identity, club host, optional logo & banner, and per-problem selection capacity.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Event Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Event Name *
              </label>
              <input
                type="text"
                placeholder="e.g. HackSprint 2026"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                required
              />
            </div>

            {/* Club Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Organizing Club / Society Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Google Developer Student Club"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                required
              />
            </div>

            {/* Problem Statement Selection Limit */}
            <div className="md:col-span-2 p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#111827]">
                    Problem Statement Selection Limit (Teams per Problem)
                  </label>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Controls how many teams can select each problem statement on a first-come, first-served basis.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={problemSelectionLimit}
                    onChange={(e) => setProblemSelectionLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 text-sm font-bold text-center rounded-xl border border-[#E5E7EB] bg-white text-[#164A36] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                  />
                  <span className="text-xs font-semibold text-[#4B5563]">teams max</span>
                </div>
              </div>
              <p className="text-[11px] text-[#667085] leading-relaxed border-t border-[#E5E7EB]/80 pt-2">
                💡 <strong>First-Come, First-Served Policy:</strong> If limit is <strong>{problemSelectionLimit}</strong>, every problem statement is strictly available for only {problemSelectionLimit} team{problemSelectionLimit > 1 ? 's' : ''}. The first {problemSelectionLimit} team{problemSelectionLimit > 1 ? 's' : ''} who lock in the challenge will secure it. Any subsequent teams will receive a polite, courteous notice that the problem has reached maximum capacity.
              </p>
            </div>

            {/* Club Logo (Optional) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5 flex items-center justify-between">
                <span>Club Logo (Optional)</span>
                {clubLogo && (
                  <button
                    type="button"
                    onClick={() => setClubLogo('')}
                    className="text-[10px] text-rose-600 hover:underline font-normal"
                  >
                    Remove Logo
                  </button>
                )}
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7F5EF] hover:bg-[#EEF5F0] border border-[#E5E7EB] text-xs font-semibold text-[#164A36] transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-[#667085]">or enter URL below</span>
                </div>
                <input
                  type="text"
                  placeholder="https://... or paste image URL / Base64"
                  value={clubLogo}
                  onChange={(e) => setClubLogo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              {clubLogo && (
                <div className="mt-2 p-2 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF] flex items-center gap-3 w-fit">
                  <img
                    src={clubLogo}
                    alt="Club Logo Preview"
                    className="w-12 h-12 object-contain rounded-lg bg-white p-1 border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs font-medium text-[#111827]">Logo Preview</span>
                </div>
              )}
            </div>

            {/* Event Banner (Optional) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5 flex items-center justify-between">
                <span>Event Banner (Optional)</span>
                {eventBanner && (
                  <button
                    type="button"
                    onClick={() => setEventBanner('')}
                    className="text-[10px] text-rose-600 hover:underline font-normal"
                  >
                    Remove Banner
                  </button>
                )}
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7F5EF] hover:bg-[#EEF5F0] border border-[#E5E7EB] text-xs font-semibold text-[#164A36] transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Banner File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-[#667085]">or enter URL below</span>
                </div>
                <input
                  type="text"
                  placeholder="https://... or paste banner image URL / Base64"
                  value={eventBanner}
                  onChange={(e) => setEventBanner(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              {eventBanner && (
                <div className="mt-3 p-3 rounded-2xl border border-[#E5E7EB] bg-[#F7F5EF] flex flex-col gap-1.5 w-full max-w-xl">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#111827]">
                    <span>Banner Preview (Free Style • Full Image)</span>
                    <span className="text-[10px] text-[#667085]">100% visible • Zero cropping</span>
                  </div>
                  <div className="w-full bg-white rounded-xl border border-gray-200 overflow-hidden p-1.5 flex items-center justify-center">
                    <img
                      src={eventBanner}
                      alt="Banner Preview"
                      className="w-full h-auto max-h-72 object-contain rounded-lg mx-auto block"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Help Desk Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Support Help Desk Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              />
            </div>

            {/* Help Desk Operating Hours */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                Help Desk Operating Hours
              </label>
              <input
                type="text"
                value={supportHours}
                onChange={(e) => setSupportHours(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#164A36]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#F3F4F6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#667085]">
              <Shield className="w-4 h-4 text-[#164A36]" />
              <span>Event branding instantly reflects across participant login, portal headers, and banners.</span>
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={isSaving}
              onClick={handleSaveEventConfig}
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save Event Configuration
            </Button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DANGER ZONE: DELETE SESSION & PURGE CREDENTIALS */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-rose-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-rose-100">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-rose-900">
                Danger Zone: Delete Event Session & Revoke All Credentials
              </h3>
              <p className="text-xs text-rose-700">
                Reset hackathon session, wipe participant logins, and reset problem selections.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <span>What happens when you delete the session:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-rose-800">
              <li>All participant teams and their unique login credentials (usernames and passwords) are wiped out.</li>
              <li>Any currently logged-in participant sessions are <strong>immediately terminated and invalidated</strong>.</li>
              <li>All confirmed problem statement selections are cleared, and problem capacity counters reset to zero.</li>
              <li>Only admin access and configured problem statements remain intact in the system.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#667085]">
              Irreversible action. A confirmation prompt will be displayed.
            </span>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setDeleteSessionConfirmText('');
                setIsDeleteSessionModalOpen(true);
              }}
              className="text-rose-700 border-rose-300 hover:bg-rose-50 hover:border-rose-400 font-bold"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              DELETE SESSION / PURGE ALL DATA
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DELETE SESSION CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {isDeleteSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-rose-200 relative">
            <button
              onClick={() => setIsDeleteSessionModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#667085] hover:text-[#111827] hover:bg-[#F7F5EF]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-rose-100">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  IRREVERSIBLE ACTION
                </span>
                <h3 className="text-lg font-extrabold text-[#111827]">
                  DELETE SESSION & REVOKE CREDENTIALS?
                </h3>
              </div>
            </div>

            <p className="mt-4 text-xs text-[#4B5563] leading-relaxed">
              This will immediately purge all team participant records, wipe all unique login credentials, log out all active participant teams, and clear all problem statement selection claims.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-900 mb-1">
                Type <span className="font-mono text-rose-700 font-extrabold">DELETE SESSION</span> to confirm
              </label>
              <input
                type="text"
                placeholder="DELETE SESSION"
                value={deleteSessionConfirmText}
                onChange={(e) => setDeleteSessionConfirmText(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-rose-300 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteSessionModalOpen(false)}
                disabled={isDeletingSession}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteSessionConfirm}
                disabled={isDeletingSession || deleteSessionConfirmText.trim().toUpperCase() !== 'DELETE SESSION'}
                className="bg-rose-700 hover:bg-rose-800 text-white border-transparent font-bold disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {isDeletingSession ? 'Deleting Session...' : 'Confirm Purge & Reset'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CLOSE SELECTION CONFIRMATION MODAL (Section 38) */}
      {/* ========================================================= */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 relative">
            <button
              onClick={() => setIsCloseModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#667085] hover:text-[#111827] hover:bg-[#F7F5EF]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-700">
                  ACTION CONFIRMATION
                </span>
                <h3 className="text-lg font-extrabold text-[#111827]">
                  CLOSE PROBLEM SELECTION?
                </h3>
              </div>
            </div>

            <p className="mt-4 text-xs text-[#4B5563] leading-relaxed">
              Teams will no longer be able to select a problem. Participating teams who have not yet confirmed a challenge statement will be blocked from doing so until an organizer re-opens selection.
            </p>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCloseModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmCloseSelection}
                disabled={isSaving}
                className="bg-red-700 hover:bg-red-800 text-white border-transparent"
              >
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                Confirm Close Selection
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
