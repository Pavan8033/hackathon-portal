import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Search,
  X,
  FileCheck,
  FileText,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  Lock,
  Download,
  ShieldCheck,
  Layers,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProblemService } from '../../services/problemService';
import { SelectionService } from '../../services/selectionService';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import {
  getDocumentTypeInfo,
  formatSelectionDateTime,
  formatFileSize,
} from '../../utils/formatters';
import type { ProblemRecord, TeamSelection } from '../../types';

export const ProblemStatementsPage: React.FC = () => {
  const { team } = useAuth();
  const { eventConfig } = useEvent();

  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection state for isolation enforcement
  const [teamSelection, setTeamSelection] = useState<TeamSelection | null>(null);
  const [selectedProblemDetail, setSelectedProblemDetail] = useState<ProblemRecord | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedFileType, setSelectedFileType] = useState('All');
  const [sortBy, setSortBy] = useState<'id' | 'title-asc' | 'title-desc' | 'newest' | 'oldest'>('id');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (team?.teamId) {
          const sel = await SelectionService.getSelectionForTeam(team.teamId);
          setTeamSelection(sel);
          const selProblemId = sel?.problemId || team?.selectedProblemId;
          if (selProblemId) {
            const pDetail = await ProblemService.getProblemById(selProblemId, { forParticipant: true });
            setSelectedProblemDetail(pDetail);
          }
        }
        const data = await ProblemService.getAllProblems({ forParticipant: true });
        setProblems(data);
      } catch (err) {
        console.error('[ProblemStatementsPage] Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [team?.teamId, team?.selectedProblemId]);

  const hasSelection = Boolean(teamSelection || team?.selectedProblemId);
  const selectedProblemId = teamSelection?.problemId || team?.selectedProblemId || '';
  const committedProblem =
    selectedProblemDetail ||
    problems.find((p) => p.problemId === selectedProblemId) ||
    null;

  // Metadata calculations
  const totalCount = problems.length;
  const uniqueDomains = useMemo(() => {
    return Array.from(new Set(problems.map((p) => p.category)));
  }, [problems]);
  const documentsCount = useMemo(() => {
    return problems.filter((p) => Boolean(p.fileName || p.fileUrl)).length;
  }, [problems]);

  // Categories list
  const categories = useMemo(() => {
    return ['All', ...uniqueDomains];
  }, [uniqueDomains]);

  // Filtering & Sorting Logic for unselected teams
  const filteredProblems = useMemo(() => {
    return problems
      .filter((prob) => {
        // 1. Category Filter
        if (selectedCategory !== 'All' && prob.category !== selectedCategory) {
          return false;
        }

        // 2. Difficulty Filter
        if (selectedDifficulty !== 'All') {
          const probDiff = prob.difficulty.toLowerCase();
          const selDiff = selectedDifficulty.toLowerCase();
          if (selDiff === 'easy' && !probDiff.includes('begin') && !probDiff.includes('easy')) return false;
          if (selDiff === 'medium' && !probDiff.includes('inter') && !probDiff.includes('medium')) return false;
          if (selDiff === 'hard' && !probDiff.includes('adv') && !probDiff.includes('hard')) return false;
        }

        // 3. File Type Filter
        if (selectedFileType !== 'All') {
          const docInfo = getDocumentTypeInfo(prob.fileName, prob.fileType);
          if (docInfo.type.toLowerCase() !== selectedFileType.toLowerCase()) {
            return false;
          }
        }

        // 4. Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchId = prob.problemId.toLowerCase().includes(q);
          const matchTitle = prob.title.toLowerCase().includes(q);
          const matchDesc = prob.description.toLowerCase().includes(q);
          const matchCategory = prob.category.toLowerCase().includes(q);
          const matchTags = prob.tags?.some((t) => t.toLowerCase().includes(q));

          if (!matchId && !matchTitle && !matchDesc && !matchCategory && !matchTags) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
        if (sortBy === 'title-desc') return b.title.localeCompare(a.title);
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return a.problemId.localeCompare(b.problemId, undefined, { numeric: true });
      });
  }, [problems, selectedCategory, selectedDifficulty, selectedFileType, searchQuery, sortBy]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedDifficulty('All');
    setSelectedFileType('All');
    setSortBy('id');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedDifficulty !== 'All' ||
    selectedFileType !== 'All' ||
    sortBy !== 'id';

  // Helper for document availability badge
  const renderDocBadge = (prob: ProblemRecord) => {
    if (!prob.fileName && !prob.fileUrl) {
      return <span className="text-xs text-[#9CA3AF]">Online Brief</span>;
    }
    const docInfo = getDocumentTypeInfo(prob.fileName, prob.fileType);
    let Icon = FileCheck;
    if (docInfo.type === 'PDF') Icon = FileText;
    if (docInfo.type === 'Excel') Icon = FileSpreadsheet;

    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${docInfo.badgeClass}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{docInfo.type} Available</span>
      </span>
    );
  };

  // =========================================================================
  // VIEW A: TEAM HAS COMMITTED TO A PROBLEM STATEMENT
  // Show full description, deliverables, scoring criteria, and HIDE ALL OTHER PROBLEMS.
  // =========================================================================
  if (!isLoading && hasSelection && committedProblem) {
    const selectedTime = teamSelection?.selectedAt || team?.selectionDate;
    const formattedSelectionTime = formatSelectionDateTime(selectedTime);

    return (
      <div className="min-h-screen flex flex-col bg-[#F7F5EF] relative">
        {/* Ambient Hackathon Background Atmosphere if Banner is set */}
        {eventConfig.eventBanner && (
          <div
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none opacity-[0.035] bg-center bg-cover -z-10 blur-2xl scale-105"
            style={{ backgroundImage: `url(${eventConfig.eventBanner})` }}
          />
        )}

        <Navbar />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Breadcrumb Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/participant"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#164A36] hover:text-[#0E3324] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="flex items-center gap-2 text-xs text-[#667085]">
              <Link to="/participant" className="hover:text-[#164A36]">Dashboard</Link>
              <span>/</span>
              <span className="font-semibold text-[#111827]">Committed Challenge</span>
            </div>
          </div>

          {/* Selection Status Banner */}
          <div className="mb-8 p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-[#164A36] to-[#0E3324] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 text-emerald-300">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-mono font-bold uppercase tracking-wider">
                    SELECTION CONFIRMED
                  </span>
                  <span className="text-xs text-white/70">
                    Allocated to Team {team?.teamName || team?.teamId}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Your Team's Committed Challenge
                </h1>
                <p className="text-xs sm:text-sm text-white/80 max-w-xl leading-relaxed">
                  Your team has officially selected this problem statement. As per hackathon rules, you are exclusively committed to this challenge. All other problem statements are concealed.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex md:flex-col items-start md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-white/15 text-xs text-white/75">
              <span>Confirmed On</span>
              <span className="font-semibold text-white mt-0.5 font-mono">{formattedSelectionTime.combined}</span>
            </div>
          </div>

          {/* Full Problem Statement Specification Card */}
          <div className="bg-white rounded-3xl border border-[#D5E6DB] p-6 sm:p-10 shadow-xs mb-8 space-y-8">
            {/* Header: ID, Title, Category, Difficulty */}
            <div className="border-b border-[#F3F4F6] pb-6 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-lg bg-[#EEF5F0] text-[#164A36] font-mono font-extrabold text-sm border border-[#D5E6DB]">
                  {committedProblem.problemId}
                </span>
                <Badge variant="subtle" size="md">
                  {committedProblem.category}
                </Badge>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                  Difficulty: {committedProblem.difficulty}
                </span>
                {renderDocBadge(committedProblem)}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight leading-snug">
                {committedProblem.title}
              </h2>
            </div>

            {/* 1. Full Description */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#164A36] flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Problem Statement Description
              </h3>
              <div className="text-sm sm:text-base text-[#374151] leading-relaxed whitespace-pre-line bg-[#F7F5EF]/50 p-6 rounded-2xl border border-[#E5E7EB]/80">
                {committedProblem.description}
              </div>
            </div>

            {/* 2. Expected Solution / Deliverables (if present) */}
            {committedProblem.expectedSolution && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#164A36] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Expected Solution & Deliverables
                </h3>
                <div className="text-sm text-[#374151] leading-relaxed whitespace-pre-line bg-white p-6 rounded-2xl border border-[#E5E7EB]">
                  {committedProblem.expectedSolution}
                </div>
              </div>
            )}

            {/* 3. Evaluation Criteria & Scoring Rubric (if present) */}
            {committedProblem.evaluationCriteria && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#164A36] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Evaluation Criteria & Scoring Rubric
                </h3>
                <div className="text-sm text-[#374151] leading-relaxed whitespace-pre-line bg-white p-6 rounded-2xl border border-[#E5E7EB]">
                  {committedProblem.evaluationCriteria}
                </div>
              </div>
            )}

            {/* 4. Suggested Technologies & Frameworks (if present) */}
            {committedProblem.technologies && committedProblem.technologies.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#164A36] flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Suggested Technologies & Tools
                </h3>
                <div className="flex flex-wrap gap-2">
                  {committedProblem.technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-[#F7F5EF] text-xs font-bold text-[#164A36] border border-[#E5E7EB]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Constraints & Submission Rules (if present) */}
            {committedProblem.constraints && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#164A36] flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Constraints & Requirements
                </h3>
                <div className="text-sm text-[#374151] leading-relaxed whitespace-pre-line bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80">
                  {committedProblem.constraints}
                </div>
              </div>
            )}

            {/* 6. Tags */}
            {committedProblem.tags && committedProblem.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <Tag className="w-3.5 h-3.5 text-[#667085] mr-1" />
                {committedProblem.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-medium text-[#667085] bg-gray-100 px-2.5 py-0.5 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* 7. Attached Documents / Download Brief */}
            {(committedProblem.fileName || committedProblem.fileUrl) && (
              <div className="p-5 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#164A36] border border-[#D5E6DB] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827]">
                      {committedProblem.fileName || `${committedProblem.problemId}_Specification`}
                    </h4>
                    <span className="text-[11px] text-[#667085]">
                      Official Challenge Document {committedProblem.fileSize ? `• ${formatFileSize(committedProblem.fileSize)}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {committedProblem.fileUrl && (
                    <a
                      href={committedProblem.fileUrl}
                      download={committedProblem.fileName}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#164A36] text-white text-xs font-bold hover:bg-[#0E3324] shadow-2xs transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Document</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Actions */}
            <div className="pt-6 border-t border-[#F3F4F6] flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                to="/participant"
                className="text-xs font-bold text-[#667085] hover:text-[#111827] flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Team Dashboard</span>
              </Link>

              <Button
                to={`/participant/problem/${committedProblem.problemId}`}
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
                className="shadow-xs font-bold"
              >
                OPEN INTERACTIVE CHALLENGE VIEW
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // =========================================================================
  // VIEW B: TEAM HAS NOT COMMITTED YET
  // Show standard challenge catalog WITHOUT any separate "Featured Challenge" banner.
  // =========================================================================
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF] relative">
      {/* Ambient Hackathon Background Atmosphere if Banner is set */}
      {eventConfig.eventBanner && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none opacity-[0.035] bg-center bg-cover -z-10 blur-2xl scale-105"
          style={{ backgroundImage: `url(${eventConfig.eventBanner})` }}
        />
      )}

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb Navigation */}
        <div className="mb-4 flex items-center gap-2 text-xs text-[#667085]">
          <Link to="/participant" className="hover:text-[#164A36]">Dashboard</Link>
          <span>/</span>
          <span className="text-[#111827] font-semibold">Problem Statements</span>
        </div>

        {/* Header Section */}
        <div className="pb-8 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF5F0] border border-[#D5E6DB] text-xs font-mono font-bold text-[#164A36] uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-[#164A36]" />
              Official Hackathon Challenges
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight uppercase">
              PROBLEM STATEMENTS
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#4B5563] max-w-2xl leading-relaxed">
              Explore the official challenges and discover the problem your team wants to solve.
            </p>
          </div>

          {/* Dynamic Metadata */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs text-center min-w-[100px]">
              <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">
                Total Available
              </span>
              <span className="text-lg font-extrabold text-[#164A36] font-sans">
                {isLoading ? '...' : `${totalCount} Problems`}
              </span>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">
                Domains
              </span>
              <span className="text-lg font-extrabold text-[#111827] font-sans">
                {isLoading ? '...' : `${uniqueDomains.length} Tracks`}
              </span>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">
                Documents
              </span>
              <span className="text-lg font-extrabold text-[#111827] font-sans">
                {isLoading ? '...' : `${documentsCount} Attached`}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="my-8 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search problem statements..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#164A36] focus:border-[#164A36] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#667085] hover:text-[#111827] rounded-full hover:bg-gray-100"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Selectors (Difficulty, File Type, Sort) */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Difficulty Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-[#667085]">
                <Filter className="w-3.5 h-3.5 text-[#667085] hidden sm:inline" />
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                  aria-label="Filter by difficulty"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy / Beginner</option>
                  <option value="Medium">Medium / Intermediate</option>
                  <option value="Hard">Hard / Advanced</option>
                </select>
              </div>

              {/* File Type Dropdown */}
              <div>
                <select
                  value={selectedFileType}
                  onChange={(e) => setSelectedFileType(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                  aria-label="Filter by file type"
                >
                  <option value="All">All File Types</option>
                  <option value="PDF">PDF Documents</option>
                  <option value="Word">Word Documents</option>
                  <option value="Excel">Excel Sheets</option>
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#667085] hidden sm:inline" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                  aria-label="Sort problem statements"
                >
                  <option value="id">Sort by: Problem ID</option>
                  <option value="title-asc">Sort by: Title A-Z</option>
                  <option value="title-desc">Sort by: Title Z-A</option>
                  <option value="newest">Sort by: Newest</option>
                  <option value="oldest">Sort by: Oldest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'bg-[#164A36] text-white shadow-2xs'
                        : 'bg-[#F7F5EF] text-[#4B5563] hover:text-[#111827] hover:bg-[#EEF5F0]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-[#164A36] hover:underline whitespace-nowrap shrink-0"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="mb-6 flex items-center justify-between text-xs text-[#667085]">
          <span>
            Showing <strong>{filteredProblems.length}</strong> of <strong>{totalCount}</strong> published challenges
          </span>
          {hasActiveFilters && (
            <span className="font-mono text-[#164A36]">
              Filtered Results Active
            </span>
          )}
        </div>

        {/* Loading State Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E5E7EB] p-6 h-72 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div className="h-5 bg-gray-200 rounded w-20" />
                    <div className="h-5 bg-gray-200 rounded w-16" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-4/5" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-8 bg-gray-200 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : problems.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-[#164A36]" />}
            title="No problem statements have been released yet."
            description="Official challenges will appear here once released by the organizers."
          />
        ) : filteredProblems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-[#F7F5EF] text-[#164A36] flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">
              {selectedCategory !== 'All' ? 'NO PROBLEMS IN THIS CATEGORY' : 'NO MATCHING PROBLEMS'}
            </h3>
            <p className="text-sm text-[#667085] mt-1 max-w-md mx-auto">
              {selectedCategory !== 'All'
                ? `No published challenges found under the "${selectedCategory}" category.`
                : 'Try a different search term or remove some filters to explore other tracks.'}
            </p>
            <div className="mt-6">
              <Button
                variant="secondary"
                size="md"
                onClick={clearAllFilters}
                className="bg-white"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        ) : (
          /* Problem Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProblems.map((prob) => {
              const difficultyVariants: Record<string, string> = {
                Beginner: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                Intermediate: 'bg-blue-50 text-blue-800 border-blue-200',
                Advanced: 'bg-rose-50 text-rose-800 border-rose-200',
              };
              const diffBadgeClass = difficultyVariants[prob.difficulty] || 'bg-gray-100 text-gray-800 border-gray-200';

              return (
                <div
                  key={prob.problemId}
                  className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs hover:shadow-md hover:border-[#164A36]/40 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3.5">
                    {/* Top Meta: ID + Category */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB]">
                        {prob.problemId}
                      </span>
                      <Badge variant="subtle" size="sm">
                        {prob.category}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-extrabold text-[#111827] group-hover:text-[#164A36] transition-colors line-clamp-2 leading-snug">
                      <Link to={`/participant/problem/${prob.problemId}`}>
                        {prob.title}
                      </Link>
                    </h3>

                    {/* Description preview */}
                    <p className="text-xs text-[#4B5563] line-clamp-3 leading-relaxed">
                      {prob.description}
                    </p>

                    {/* Tags preview */}
                    {prob.tags && prob.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {prob.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] text-[#667085] bg-gray-50 px-2 py-0.5 rounded border border-gray-100"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 mt-4 border-t border-[#F3F4F6] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${diffBadgeClass}`}>
                        {prob.difficulty}
                      </span>
                      {renderDocBadge(prob)}
                    </div>

                    <Link
                      to={`/participant/problem/${prob.problemId}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#164A36] hover:text-[#0E3324] group-hover:translate-x-0.5 transition-all"
                    >
                      <span>VIEW BRIEF</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
