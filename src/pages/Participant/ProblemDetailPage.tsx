import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  FileCheck,
  Download,
  Eye,
  ExternalLink,
  Maximize2,
  Minimize2,
  X,
  XCircle,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  Tag,
  CheckCircle2,
  HelpCircle,
  FileCode,
  Lock,
  Clock,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { ProblemService } from '../../services/problemService';
import { SelectionService } from '../../services/selectionService';
import { SettingsService } from '../../services/settingsService';
import {
  formatReleaseDate,
  getDocumentTypeInfo,
  formatFileSize,
} from '../../utils/formatters';
import type { ProblemRecord, TeamSelection, PortalSettings } from '../../types';

export const ProblemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { team, refreshSession } = useAuth();
  const { eventConfig } = useEvent();

  // State management
  const [problem, setProblem] = useState<ProblemRecord | null>(null);
  const [relatedProblems, setRelatedProblems] = useState<ProblemRecord[]>([]);
  const [teamSelection, setTeamSelection] = useState<TeamSelection | null>(null);
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<'NOT_FOUND' | 'UNAVAILABLE' | 'COMMITTED_TO_OTHER' | null>(null);
  const [committedProblemId, setCommittedProblemId] = useState<string>('');

  // Active Tab state (Section 16)
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'evaluation' | 'resources'>('overview');

  // Modals state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  // PDF modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);

  useEffect(() => {
    const fetchProblemData = async () => {
      if (!id) {
        setErrorStatus('NOT_FOUND');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorStatus(null);
      setPdfLoadError(false);
      setSelectionError(null);

      try {
        // Section 30: Check problem existence vs publication status
        const [availability, portalSettings] = await Promise.all([
          ProblemService.getProblemForParticipant(id),
          SettingsService.getSettings(),
        ]);

        setSettings(portalSettings);

        if (!availability.found || !availability.problem) {
          setErrorStatus('NOT_FOUND');
          setProblem(null);
          setIsLoading(false);
          return;
        }

        const currentProblem = availability.problem;
        setProblem(currentProblem);

        // Fetch team's current selection if logged in
        if (team?.teamId) {
          const currentSel = await SelectionService.getSelectionForTeam(team.teamId);
          setTeamSelection(currentSel);
          const selId = currentSel?.problemId || team?.selectedProblemId;
          // Isolation enforcement: If team already committed to a different problem, restrict viewing unselected problems
          if (selId && currentProblem.problemId && selId.trim().toLowerCase() !== currentProblem.problemId.trim().toLowerCase()) {
            setCommittedProblemId(selId);
            setErrorStatus('COMMITTED_TO_OTHER');
            setIsLoading(false);
            return;
          }
        }

        // Section 29: Load up to 3 related published problems
        const related = await ProblemService.getRelatedProblems(
          currentProblem.problemId,
          currentProblem.category,
          3
        );
        setRelatedProblems(related);
      } catch (err) {
        console.error('[ProblemDetailPage] Error loading problem:', err);
        setErrorStatus('NOT_FOUND');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblemData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id, team?.teamId, team?.selectedProblemId]);

  // Section 16 & 18 & 19 & 20: Compute available sections
  const hasRequirements = useMemo(() => {
    if (!problem) return false;
    return Boolean(
      problem.expectedSolution ||
      (problem.technologies && problem.technologies.length > 0) ||
      problem.constraints ||
      problem.teamSize ||
      problem.additionalNotes
    );
  }, [problem]);

  const hasEvaluation = useMemo(() => {
    if (!problem) return false;
    return Boolean(problem.evaluationCriteria && problem.evaluationCriteria.trim().length > 0);
  }, [problem]);

  const hasDocument = useMemo(() => {
    if (!problem) return false;
    return Boolean(problem.fileName || problem.fileUrl);
  }, [problem]);

  // Document metadata helpers
  const docInfo = useMemo(() => {
    if (!problem) return { type: 'None', label: 'No Document', badgeClass: '', extension: '' };
    return getDocumentTypeInfo(problem.fileName, problem.fileType);
  }, [problem]);

  const isPdf = docInfo.type === 'PDF';
  const isWord = docInfo.type === 'Word';
  const isExcel = docInfo.type === 'Excel';

  // Section 4: Selection Status Determination
  const activeSelectionId = teamSelection?.problemId || team?.selectedProblemId || '';
  const isThisProblemSelected = Boolean(problem && activeSelectionId === problem.problemId);
  const isAnotherProblemSelected = Boolean(activeSelectionId && problem && activeSelectionId !== problem.problemId);
  const isSelectionOpen = settings?.isSelectionOpen ?? true;
  const problemSelectionLimit = eventConfig.problemSelectionLimit || settings?.problemSelectionLimit || 2;
  const currentSelectedCount = problem?.selectedCount || 0;
  const isCapacityReached = Boolean(problem && currentSelectedCount >= problemSelectionLimit && !isThisProblemSelected);

  // Scheduled countdown lock
  const scheduleLock = useMemo(() => {
    return ProblemService.isProblemLockedBySchedule(problem);
  }, [problem]);
  const isScheduledAndLocked = scheduleLock.isLocked;

  // Handle Selection Confirmation (Sections 5 & 6 & 7)
  const handleConfirmSelection = async () => {
    if (!problem || !team) return;

    setIsSubmitting(true);
    setSelectionError(null);

    try {
      const confirmedSelection = await SelectionService.executeSelectionTransaction(
        team,
        problem.problemId,
        team.teamLeadName
      );

      setTeamSelection(confirmedSelection);
      await refreshSession();

      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error('[ProblemDetailPage] Selection error:', err);
      setSelectionError(
        err?.message || 'Something went wrong during problem selection. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Section 31: Loading State Skeleton Loader
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
          {/* Breadcrumb Skeleton */}
          <div className="h-4 bg-gray-200 rounded w-48 mb-6" />

          {/* Header Skeleton */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 sm:p-10 mb-8 space-y-4">
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-24" />
              <div className="h-6 bg-gray-200 rounded w-28" />
              <div className="h-6 bg-gray-200 rounded w-20" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="h-12 bg-white rounded-xl border border-[#E5E7EB]" />
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 space-y-4 h-96" />
            </div>
            <div className="lg:col-span-4">
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 h-80" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Section 30: Error States
  if (errorStatus === 'COMMITTED_TO_OTHER') {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
        <Navbar />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB] flex items-center justify-center mb-5 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#164A36] bg-[#EEF5F0] border border-[#D5E6DB] px-3.5 py-1 rounded-full mb-3 inline-block">
            Access Restricted • Problem Already Selected
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight uppercase">
            CHALLENGE ACCESS RESTRICTED
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#4B5563] max-w-lg leading-relaxed">
            Your team has already committed to problem statement <strong className="text-[#164A36] font-mono">{committedProblemId}</strong>. As per hackathon regulations, participants can only access their selected problem statement.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              to={`/participant/problem/${committedProblemId}`}
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight className="w-4 h-4 ml-1.5" />}
              className="font-bold shadow-xs w-full sm:w-auto"
            >
              VIEW YOUR COMMITTED CHALLENGE
            </Button>
            <Button
              to="/participant"
              variant="outline"
              size="lg"
              className="font-bold w-full sm:w-auto"
            >
              BACK TO DASHBOARD
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (errorStatus === 'NOT_FOUND') {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
        <Navbar />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-5 shadow-xs">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight uppercase">
            PROBLEM NOT FOUND
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#4B5563] max-w-md leading-relaxed">
            The problem statement you're looking for is unavailable. It may have been removed or does not exist.
          </p>
          <div className="mt-8">
            <Button
              to="/participant/problems"
              variant="primary"
              size="lg"
              leftIcon={<ArrowLeft className="w-4 h-4 mr-1.5" />}
              className="font-bold shadow-xs"
            >
              BACK TO PROBLEM STATEMENTS
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (errorStatus === 'UNAVAILABLE' || !problem) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
        <Navbar />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-5 shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight uppercase">
            PROBLEM UNAVAILABLE
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#4B5563] max-w-md leading-relaxed">
            This problem statement is not currently available. Please check back when official release begins.
          </p>
          <div className="mt-8">
            <Button
              to="/participant/problems"
              variant="primary"
              size="lg"
              leftIcon={<ArrowLeft className="w-4 h-4 mr-1.5" />}
              className="font-bold shadow-xs"
            >
              BACK TO PROBLEM STATEMENTS
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Navigation & Breadcrumbs per Section 15 & 28 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/participant/problems"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#164A36] hover:text-[#0E3324] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>← Back to Problem Statements</span>
          </Link>

          {/* Section 28: Clickable Subtle Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#667085]">
            <Link to="/participant" className="hover:text-[#164A36] transition-colors">
              Dashboard
            </Link>
            <span className="text-gray-300">/</span>
            <Link to="/participant/problems" className="hover:text-[#164A36] transition-colors">
              Problem Statements
            </Link>
            <span className="text-gray-300">/</span>
            <span className="font-mono font-bold text-[#111827] bg-[#EEF5F0] px-2 py-0.5 rounded text-[11px] border border-[#D5E6DB]">
              {problem.problemId}
            </span>
          </nav>
        </div>

        {/* Scheduled Challenge Notice & Countdown Banner */}
        {isScheduledAndLocked && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs animate-in fade-in duration-300">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                    PREVIEW MODE
                  </span>
                  <h3 className="text-sm font-extrabold text-amber-950 tracking-wide uppercase">
                    SCHEDULED CHALLENGE • SELECTION WILL UNLOCK SOON
                  </h3>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                  You are viewing the complete official problem statement, evaluation criteria, and requirements. Selection locks automatically until the release countdown concludes.
                </p>
              </div>
            </div>

            {scheduleLock.releaseAt && (
              <div className="shrink-0 w-full md:w-auto">
                <CountdownTimer
                  targetDate={scheduleLock.releaseAt}
                  label="CHALLENGE UNLOCKS IN"
                  className="bg-white/90 border-amber-200 shadow-none"
                  onExpire={() => {
                    setProblem((prev) => (prev ? { ...prev, status: 'PUBLISHED' } : null));
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Section 15: Header Editorial Banner */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#F3F4F6]">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Problem ID */}
              <span className="font-mono text-xs sm:text-sm font-extrabold text-[#164A36] bg-[#EEF5F0] px-3 py-1.5 rounded-lg border border-[#D5E6DB] tracking-wide">
                {problem.problemId}
              </span>

              {/* Category */}
              <Badge variant="subtle" size="md">
                {problem.category}
              </Badge>

              {/* Difficulty */}
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                Difficulty: {problem.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isThisProblemSelected ? (
                <div className="inline-flex items-center gap-1.5 text-xs text-[#164A36] font-bold bg-[#EEF5F0] px-3 py-1.5 rounded-lg border border-[#D5E6DB]">
                  <CheckCircle2 className="w-4 h-4 text-[#164A36]" />
                  <span>SELECTED BY YOUR TEAM</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs text-[#164A36] font-semibold bg-[#EEF5F0] px-2.5 py-1 rounded-md border border-[#D5E6DB]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Official Challenge Release</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            {/* Problem Title in bold editorial styling */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111827] tracking-tight uppercase leading-tight">
              {problem.title}
            </h1>

            {/* Short subtitle / description below */}
            <p className="mt-4 text-sm sm:text-base text-[#4B5563] leading-relaxed max-w-4xl">
              {problem.description}
            </p>

            {/* Tags if available */}
            {problem.tags && problem.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-2">
                <Tag className="w-3.5 h-3.5 text-[#667085] mr-1" />
                {problem.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-medium text-[#4B5563] bg-[#F7F5EF] px-2.5 py-1 rounded-md border border-[#E5E7EB]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 16 & 26 & 36: Two-Column Editorial Layout (Main Column + Right Info Panel) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Column (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Section 16: Navigation Tabs */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-2 shadow-2xs">
              <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none" aria-label="Problem Detail Tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'overview'
                      ? 'bg-[#164A36] text-white shadow-2xs'
                      : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F5EF]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Overview</span>
                </button>

                {hasRequirements && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('requirements')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'requirements'
                        ? 'bg-[#164A36] text-white shadow-2xs'
                        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F5EF]'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Requirements</span>
                  </button>
                )}

                {hasEvaluation && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('evaluation')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'evaluation'
                        ? 'bg-[#164A36] text-white shadow-2xs'
                        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F5EF]'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Evaluation</span>
                  </button>
                )}

                {hasDocument && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('resources')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'resources'
                        ? 'bg-[#164A36] text-white shadow-2xs'
                        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F5EF]'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Resources</span>
                  </button>
                )}
              </nav>
            </div>

            {/* TAB CONTENT PANELS */}

            {/* 1. OVERVIEW (Mandatory per Section 16 & 17) */}
            {activeTab === 'overview' && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-10 shadow-xs space-y-6">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                    Official Scope
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#111827] pb-4 border-b border-[#F3F4F6]">
                    PROBLEM DESCRIPTION
                  </h3>
                </div>

                <div className="prose max-w-none text-[#374151] leading-relaxed text-sm sm:text-base space-y-4">
                  <p className="whitespace-pre-line leading-relaxed">
                    {problem.description}
                  </p>
                </div>

                {/* Scope metadata */}
                <div className="mt-8 pt-6 border-t border-[#F3F4F6] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#667085]">
                  <div className="p-3.5 rounded-xl bg-[#F7F5EF]/60 border border-[#E5E7EB]">
                    <span className="font-bold text-[#111827] block mb-0.5">Author / Committee</span>
                    <span>{problem.createdBy || 'Hackathon Organizing Committee'}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F7F5EF]/60 border border-[#E5E7EB]">
                    <span className="font-bold text-[#111827] block mb-0.5">Release Status</span>
                    <span className="text-[#164A36] font-semibold">Active & Live for Participants</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. REQUIREMENTS (Section 18) */}
            {activeTab === 'requirements' && hasRequirements && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-10 shadow-xs space-y-8">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                    Technical Specifications
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#111827] pb-4 border-b border-[#F3F4F6]">
                    REQUIREMENTS
                  </h3>
                </div>

                {/* EXPECTED SOLUTION */}
                {problem.expectedSolution && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#164A36] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>EXPECTED SOLUTION</span>
                    </h4>
                    <div className="p-4 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB] text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                      {problem.expectedSolution}
                    </div>
                  </div>
                )}

                {/* TECHNOLOGIES / TOOLS */}
                {problem.technologies && problem.technologies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#164A36] flex items-center gap-1.5">
                      <FileCode className="w-4 h-4" />
                      <span>TECHNOLOGIES / TOOLS</span>
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {problem.technologies.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-lg bg-[#EEF5F0] text-xs font-bold text-[#164A36] border border-[#D5E6DB]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* CONSTRAINTS */}
                {problem.constraints && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#164A36] flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>CONSTRAINTS</span>
                    </h4>
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                      {problem.constraints}
                    </div>
                  </div>
                )}

                {/* TEAM SIZE */}
                {problem.teamSize && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#164A36] flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      <span>TEAM SIZE</span>
                    </h4>
                    <div className="p-3.5 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB] text-sm font-semibold text-[#111827]">
                      {problem.teamSize}
                    </div>
                  </div>
                )}

                {/* ADDITIONAL REQUIREMENTS */}
                {problem.additionalNotes && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#164A36] flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" />
                      <span>ADDITIONAL REQUIREMENTS</span>
                    </h4>
                    <div className="p-4 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB] text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                      {problem.additionalNotes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. EVALUATION (Section 19) */}
            {activeTab === 'evaluation' && hasEvaluation && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-10 shadow-xs space-y-6">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                    Scoring & Rubric
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#111827] pb-4 border-b border-[#F3F4F6]">
                    EVALUATION CRITERIA
                  </h3>
                </div>

                <div className="p-5 rounded-xl bg-[#EEF5F0]/60 border border-[#D5E6DB] text-sm text-[#374151] leading-relaxed whitespace-pre-line space-y-3">
                  <p className="font-sans text-sm sm:text-base leading-relaxed">
                    {problem.evaluationCriteria}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#667085]">
                  <ShieldCheck className="w-4 h-4 text-[#164A36] shrink-0 mt-0.5" />
                  <span>
                    Judges will assess solutions against these benchmarks during project demonstration and code verification phases.
                  </span>
                </div>
              </div>
            )}

            {/* 4. RESOURCES & FILE HANDLING (Sections 20, 21, 22, 23, 24) */}
            {activeTab === 'resources' && hasDocument && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-10 shadow-xs space-y-6">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                    Official Attachments
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#111827] pb-4 border-b border-[#F3F4F6]">
                    RESOURCES
                  </h3>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                    OFFICIAL PROBLEM DOCUMENT
                  </h4>

                  <div className="p-6 rounded-2xl bg-[#F7F5EF]/80 border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start sm:items-center gap-4">
                      {/* Document Type Icon */}
                      <div className="w-14 h-14 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center shrink-0 shadow-xs text-[#164A36]">
                        {isPdf ? (
                          <FileText className="w-7 h-7 text-rose-600 stroke-[1.75]" />
                        ) : isWord ? (
                          <FileText className="w-7 h-7 text-blue-600 stroke-[1.75]" />
                        ) : isExcel ? (
                          <FileSpreadsheet className="w-7 h-7 text-emerald-600 stroke-[1.75]" />
                        ) : (
                          <FileCheck className="w-7 h-7 text-[#164A36] stroke-[1.75]" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${docInfo.badgeClass}`}>
                            {isPdf ? 'PDF' : isWord ? 'WORD' : isExcel ? 'EXCEL' : docInfo.extension || 'DOCUMENT'}
                          </span>
                          <span className="text-xs text-[#667085]">
                            {isWord
                              ? 'Official problem statement document'
                              : isExcel
                              ? 'Official problem statement spreadsheet'
                              : 'Official challenge specification'}
                          </span>
                        </div>

                        <h5 className="font-bold text-sm sm:text-base text-[#111827] break-all">
                          {problem.fileName || `${problem.problemId}_Specification.${docInfo.extension.toLowerCase()}`}
                        </h5>

                        <p className="text-xs text-[#667085]">
                          Size: {formatFileSize(problem.fileSize)} • Verified organizer document
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      {isPdf ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsPdfModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-xs font-bold text-[#111827] hover:bg-[#EEF5F0] hover:text-[#164A36] shadow-2xs transition-colors"
                          >
                            <Eye className="w-4 h-4 text-[#164A36]" />
                            <span>VIEW DOCUMENT</span>
                          </button>

                          {problem.fileUrl && (
                            <a
                              href={problem.fileUrl}
                              download={problem.fileName || `${problem.problemId}_Specification.pdf`}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#164A36] text-white text-xs font-bold hover:bg-[#0E3324] shadow-2xs transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span>DOWNLOAD DOCUMENT</span>
                            </a>
                          )}
                        </>
                      ) : isWord ? (
                        <>
                          {problem.fileUrl && (
                            <a
                              href={problem.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-xs font-bold text-[#111827] hover:bg-[#EEF5F0] hover:text-[#164A36] shadow-2xs transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-[#164A36]" />
                              <span>OPEN DOCUMENT</span>
                            </a>
                          )}

                          {problem.fileUrl && (
                            <a
                              href={problem.fileUrl}
                              download={problem.fileName || `${problem.problemId}_Specification.docx`}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#164A36] text-white text-xs font-bold hover:bg-[#0E3324] shadow-2xs transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span>DOWNLOAD DOCUMENT</span>
                            </a>
                          )}
                        </>
                      ) : isExcel ? (
                        <>
                          {problem.fileUrl && (
                            <a
                              href={problem.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-xs font-bold text-[#111827] hover:bg-[#EEF5F0] hover:text-[#164A36] shadow-2xs transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-[#164A36]" />
                              <span>OPEN DOCUMENT</span>
                            </a>
                          )}

                          {problem.fileUrl && (
                            <a
                              href={problem.fileUrl}
                              download={problem.fileName || `${problem.problemId}_Model.xlsx`}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#164A36] text-white text-xs font-bold hover:bg-[#0E3324] shadow-2xs transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span>DOWNLOAD DOCUMENT</span>
                            </a>
                          )}
                        </>
                      ) : (
                        problem.fileUrl && (
                          <a
                            href={problem.fileUrl}
                            download={problem.fileName}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#164A36] text-white text-xs font-bold hover:bg-[#0E3324] shadow-2xs transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            <span>DOWNLOAD DOCUMENT</span>
                          </a>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SELECTION ERROR ALERT BANNER per Section 10 */}
            {selectionError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Selection Notice:</span>
                  <span>{selectionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectionError(null)}
                  className="text-rose-500 hover:text-rose-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Section 4: ONE-PROBLEM SELECTION ACTION CARD */}
            <div className="bg-white rounded-2xl border border-[#D5E6DB] p-6 sm:p-8 shadow-xs relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#164A36]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Official Problem Commitment</span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-extrabold text-[#111827] tracking-tight">
                    {isThisProblemSelected
                      ? 'YOUR TEAM HAS SELECTED THIS CHALLENGE'
                      : isAnotherProblemSelected
                      ? 'YOUR TEAM HAS ALREADY SELECTED A PROBLEM'
                      : !isSelectionOpen
                      ? 'PROBLEM SELECTION IS CLOSED'
                      : isCapacityReached
                      ? 'PROBLEM CAPACITY REACHED'
                      : 'READY TO TAKE ON THIS CHALLENGE?'}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                    {isThisProblemSelected
                      ? 'Your selection is locked and confirmed. You may proceed to prepare your implementation.'
                      : isAnotherProblemSelected
                      ? `Your team has already committed to ${activeSelectionId}. Each team is restricted to one official challenge.`
                      : isCapacityReached
                      ? `This problem statement has reached its maximum capacity of ${problemSelectionLimit} teams. Thank you for your interest! As challenge allocations are conducted on a first-come, first-served basis, this problem is no longer open for selection. We politely encourage your team to explore the other exciting problem statements available in the catalog.`
                      : !isSelectionOpen
                      ? 'The organizers have closed problem statement selection for this hackathon edition.'
                      : `Your team can commit to exactly one official problem statement (available for up to ${problemSelectionLimit} teams). Selection is permanent and cannot be changed.`}
                  </p>
                </div>

                {/* Section 4 Button States */}
                <div className="shrink-0">
                  {isThisProblemSelected ? (
                    /* CASE 2: Exact problem selected */
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#EEF5F0] border border-[#D5E6DB] text-xs sm:text-sm font-bold text-[#164A36] cursor-default shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#164A36]" />
                      <span>✓ SELECTED BY YOUR TEAM</span>
                    </button>
                  ) : isAnotherProblemSelected ? (
                    /* CASE 3: Another problem selected */
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 border border-gray-200 text-xs sm:text-sm font-bold text-gray-500 cursor-not-allowed shadow-2xs"
                    >
                      <Lock className="w-4 h-4 text-gray-400" />
                      <span>YOUR TEAM HAS ALREADY SELECTED A PROBLEM</span>
                    </button>
                  ) : isCapacityReached ? (
                    /* CASE: Capacity Reached Polite Notice & Disabled Button */
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm font-bold text-amber-800 cursor-not-allowed shadow-2xs"
                    >
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>CAPACITY REACHED ({problemSelectionLimit}/{problemSelectionLimit} TEAMS)</span>
                    </button>
                  ) : isScheduledAndLocked ? (
                    /* CASE: Problem is SCHEDULED with active countdown */
                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                      {scheduleLock.releaseAt && (
                        <div className="w-full">
                          <CountdownTimer
                            targetDate={scheduleLock.releaseAt}
                            label="SELECTION OPENS IN"
                            onExpire={() => {
                              setProblem((prev) => (prev ? { ...prev, status: 'PUBLISHED' } : null));
                            }}
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-50 border border-amber-300 text-xs sm:text-sm font-bold text-amber-900 cursor-not-allowed shadow-2xs"
                      >
                        <Clock className="w-4 h-4 text-amber-700 animate-spin" />
                        <span>SELECTION LOCKED (UNLOCKS AFTER COUNTDOWN)</span>
                      </button>
                    </div>
                  ) : !isSelectionOpen ? (
                    /* CASE 4: Selection closed */
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm font-bold text-amber-800 cursor-not-allowed shadow-2xs"
                    >
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>SELECTION CLOSED</span>
                    </button>
                  ) : (
                    /* CASE 1: No problem selected & selection open */
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        setSelectionError(null);
                        setIsConfirmModalOpen(true);
                      }}
                      rightIcon={<ArrowRight className="w-4 h-4 ml-1.5" />}
                      className="font-bold shadow-xs whitespace-nowrap"
                    >
                      SELECT THIS PROBLEM →
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 26 & 36: Right-Side Information Panel */}
          <div className="lg:col-span-4 w-full">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-xs sticky top-24 space-y-6">
              <div className="pb-4 border-b border-[#F3F4F6]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Challenge Details
                </span>
                <h3 className="text-base font-bold text-[#111827] mt-0.5">
                  METADATA SUMMARY
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                {/* PROBLEM ID */}
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span className="font-bold uppercase tracking-wider text-[#667085]">PROBLEM ID</span>
                  <span className="font-mono font-extrabold text-[#164A36] bg-[#EEF5F0] px-2.5 py-1 rounded border border-[#D5E6DB]">
                    {problem.problemId}
                  </span>
                </div>

                {/* CATEGORY */}
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span className="font-bold uppercase tracking-wider text-[#667085]">CATEGORY</span>
                  <span className="font-semibold text-[#111827] text-right">
                    {problem.category}
                  </span>
                </div>

                {/* DIFFICULTY */}
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span className="font-bold uppercase tracking-wider text-[#667085]">DIFFICULTY</span>
                  <span className="font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {problem.difficulty}
                  </span>
                </div>

                {/* DOCUMENT */}
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span className="font-bold uppercase tracking-wider text-[#667085]">DOCUMENT</span>
                  <span className="font-semibold text-[#111827]">
                    {docInfo.type !== 'None' ? docInfo.label : 'Brief Online'}
                  </span>
                </div>

                {/* RELEASED */}
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span className="font-bold uppercase tracking-wider text-[#667085]">RELEASED</span>
                  <span className="font-medium text-[#111827] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#164A36]" />
                    {formatReleaseDate(problem.releaseAt || problem.createdAt)}
                  </span>
                </div>

                {/* STATUS */}
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold uppercase tracking-wider text-[#667085]">STATUS</span>
                  {isCapacityReached ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      CAPACITY FULL ({problemSelectionLimit}/{problemSelectionLimit})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {Math.max(0, problemSelectionLimit - currentSelectedCount)} OF {problemSelectionLimit} SLOTS OPEN
                    </span>
                  )}
                </div>
              </div>

              {/* Selection Status Helper Callout */}
              <div className="p-3.5 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] text-xs space-y-1">
                <span className="font-bold text-[#111827] block">
                  {isThisProblemSelected
                    ? 'Official Team Assignment'
                    : isAnotherProblemSelected
                    ? 'Selection Quota Reached'
                    : 'Selection Active'}
                </span>
                <p className="text-[#667085] leading-relaxed">
                  {isThisProblemSelected
                    ? 'Your team is officially registered for this challenge.'
                    : isAnotherProblemSelected
                    ? `Already locked onto challenge ${activeSelectionId}.`
                    : '1 challenge limit per team applies upon confirmation.'}
                </p>
              </div>

              {/* Document Quick Access if file exists */}
              {problem.fileUrl && (
                <div className="pt-2">
                  {isPdf ? (
                    <button
                      type="button"
                      onClick={() => setIsPdfModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF] hover:bg-[#EEF5F0] text-xs font-bold text-[#164A36] transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview Official Document</span>
                    </button>
                  ) : (
                    <a
                      href={problem.fileUrl}
                      download={problem.fileName}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF] hover:bg-[#EEF5F0] text-xs font-bold text-[#164A36] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Attachment</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 29: MORE CHALLENGES (Related Problems) */}
        {relatedProblems.length > 0 && (
          <div className="mt-16 pt-10 border-t border-[#E5E7EB]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                  Recommended For You
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight uppercase">
                  MORE CHALLENGES
                </h3>
              </div>

              <Link
                to="/participant/problems"
                className="text-xs font-bold text-[#164A36] hover:underline flex items-center gap-1"
              >
                <span>View All Problems</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedProblems.map((rel) => (
                <div
                  key={rel.problemId}
                  className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs hover:border-[#CBD5E1] hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#164A36] bg-[#EEF5F0] px-2.5 py-1 rounded border border-[#D5E6DB]">
                        {rel.problemId}
                      </span>
                      <span className="text-[11px] font-semibold text-[#667085]">
                        {rel.difficulty}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] block">
                      {rel.category}
                    </span>

                    <h4 className="text-sm sm:text-base font-bold text-[#111827] group-hover:text-[#164A36] transition-colors line-clamp-2">
                      {rel.title}
                    </h4>

                    <p className="text-xs text-[#4B5563] line-clamp-2">
                      {rel.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#F3F4F6] flex items-center justify-between">
                    <span className="text-xs text-[#667085]">
                      {rel.fileName ? 'Attachment available' : 'Online brief'}
                    </span>
                    <Link
                      to={`/participant/problem/${rel.problemId}`}
                      className="text-xs font-bold text-[#164A36] hover:text-[#0E3324] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>View Details →</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Section 5: SELECTION CONFIRMATION MODAL */}
      {isConfirmModalOpen && problem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-selection-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E5E7EB] animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F3F4F6]">
              <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] block">
                  Final Team Commitment
                </span>
                <h3 id="confirm-selection-title" className="text-lg font-bold text-[#111827] tracking-tight uppercase">
                  CONFIRM YOUR PROBLEM
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <p className="text-sm text-[#4B5563] leading-relaxed">
                You are about to select this problem statement for your team:
              </p>

              {/* Problem Identification Card */}
              <div className="p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-[#164A36] bg-[#EEF5F0] px-2 py-0.5 rounded border border-[#D5E6DB]">
                    {problem.problemId}
                  </span>
                  <span className="text-xs text-[#667085] font-semibold">
                    {problem.category}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#111827] mt-1">
                  {problem.title}
                </h4>
              </div>

              {/* Warning Notice per Section 5 */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Permanent Commitment:</strong> Once confirmed, your team cannot change its selection. The selection is permanently locked.
                </div>
              </div>

              {selectionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {selectionError}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#F3F4F6] flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => {
                  if (!isSubmitting) setIsConfirmModalOpen(false);
                }}
                disabled={isSubmitting}
              >
                CANCEL
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleConfirmSelection}
                disabled={isSubmitting}
                rightIcon={
                  isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-1" />
                  ) : (
                    <ArrowRight className="w-4 h-4 ml-1" />
                  )
                }
                className="font-bold shadow-xs"
              >
                {isSubmitting ? 'CONFIRMING...' : 'CONFIRM SELECTION'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Section 9: SUCCESS MODAL */}
      {isSuccessModalOpen && problem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E5E7EB] text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 id="success-modal-title" className="text-xl font-bold text-[#111827] tracking-tight uppercase">
              ✓ PROBLEM SELECTED SUCCESSFULLY
            </h3>

            <p className="mt-2 text-xs text-[#667085]">
              Your team has officially selected:
            </p>

            <div className="my-4 p-4 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB] text-left">
              <span className="font-mono text-xs font-bold text-[#164A36] bg-[#EEF5F0] px-2 py-0.5 rounded border border-[#D5E6DB]">
                {problem.problemId}
              </span>
              <h4 className="text-sm font-bold text-[#111827] mt-1.5 leading-snug">
                {problem.title}
              </h4>
              <div className="mt-2 pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[11px]">
                <span className="text-[#667085]">Status</span>
                <span className="font-bold text-[#164A36] flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  SELECTION LOCKED
                </span>
              </div>
            </div>

            <p className="text-sm text-[#4B5563] leading-relaxed mb-6">
              Your team can now begin working on this challenge.
            </p>

            <div className="space-y-2.5">
              <Button
                to="/participant/selected-problem"
                variant="primary"
                size="md"
                fullWidth
                className="font-bold shadow-xs"
              >
                VIEW SELECTED PROBLEM
              </Button>

              <Button
                to="/participant"
                variant="outline"
                size="md"
                fullWidth
                className="bg-white"
              >
                GO TO DASHBOARD
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Section 22: PDF IN-APP VIEWER MODAL */}
      {isPdfModalOpen && problem.fileUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-viewer-title"
        >
          <div
            className={`bg-white rounded-2xl w-full flex flex-col shadow-2xl border border-[#E5E7EB] overflow-hidden transition-all duration-200 ${
              isPdfFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-5xl h-[88vh]'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F7F5EF]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="pdf-viewer-title" className="text-sm font-bold text-[#111827] truncate max-w-md">
                    {problem.fileName || `${problem.problemId}_Specification.pdf`}
                  </h3>
                  <span className="text-[11px] text-[#667085] font-mono">
                    Official Document Preview • {formatFileSize(problem.fileSize)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Open in new window */}
                <a
                  href={problem.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-white transition-colors"
                  title="Open in new tab"
                  aria-label="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* Download */}
                <a
                  href={problem.fileUrl}
                  download={problem.fileName}
                  className="p-2 rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-white transition-colors"
                  title="Download Document"
                  aria-label="Download Document"
                >
                  <Download className="w-4 h-4" />
                </a>

                {/* Fullscreen toggle */}
                <button
                  type="button"
                  onClick={() => setIsPdfFullscreen((prev) => !prev)}
                  className="p-2 rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-white transition-colors hidden sm:block"
                  title={isPdfFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  aria-label={isPdfFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isPdfFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPdfModalOpen(false);
                    setIsPdfFullscreen(false);
                  }}
                  className="p-2 rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-white transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-[#2C3437] relative flex items-center justify-center overflow-hidden">
              {pdfLoadError ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#E5E7EB] max-w-md mx-4 shadow-lg space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-[#111827]">
                    Preview unavailable
                  </h4>
                  <p className="text-xs text-[#667085] leading-relaxed">
                    Your browser could not render the PDF inline. You can open it in a separate tab or download it directly.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <a
                      href={problem.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-lg bg-white border border-[#E5E7EB] text-xs font-bold text-[#111827] hover:bg-[#F7F5EF]"
                    >
                      OPEN DOCUMENT
                    </a>
                    <a
                      href={problem.fileUrl}
                      download={problem.fileName}
                      className="px-3.5 py-2 rounded-lg bg-[#164A36] text-white text-xs font-bold hover:bg-[#0E3324]"
                    >
                      DOWNLOAD DOCUMENT
                    </a>
                  </div>
                </div>
              ) : (
                <iframe
                  src={`${problem.fileUrl}#toolbar=1&navpanes=0`}
                  title={problem.title}
                  className="w-full h-full border-none"
                  onError={() => setPdfLoadError(true)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
