import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Search,
  X,
  FileCheck,
  FileText,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  BookOpen,
  Compass,
  Clock,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProblemService } from '../../services/problemService';
import { useEvent } from '../../context/EventContext';
import { getDocumentTypeInfo } from '../../utils/formatters';
import type { ProblemRecord } from '../../types';

export const ProblemStatementsPage: React.FC = () => {
  const { eventConfig } = useEvent();
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedFileType, setSelectedFileType] = useState('All');
  const [sortBy, setSortBy] = useState<'id' | 'title-asc' | 'title-desc' | 'newest' | 'oldest'>('id');

  useEffect(() => {
    const loadPublishedProblems = async () => {
      setIsLoading(true);
      // Strictly participant published challenges only per Section 1 & 25
      const data = await ProblemService.getAllProblems({ forParticipant: true });
      setProblems(data);
      setIsLoading(false);
    };
    loadPublishedProblems();
  }, []);

  // Section 14: Data-driven metadata calculation
  const totalCount = problems.length;
  const uniqueDomains = useMemo(() => {
    return Array.from(new Set(problems.map((p) => p.category)));
  }, [problems]);
  const documentsCount = useMemo(() => {
    return problems.filter((p) => Boolean(p.fileName || p.fileUrl)).length;
  }, [problems]);

  // Section 9: Data-driven categories
  const categories = useMemo(() => {
    return ['All', ...uniqueDomains];
  }, [uniqueDomains]);

  // Section 13: Featured Problem (first published problem or prioritized)
  const featuredProblem = useMemo(() => {
    return problems.length > 0 ? problems[0] : null;
  }, [problems]);

  // Filtering & Sorting Logic
  const filteredProblems = useMemo(() => {
    return problems.filter((prob) => {
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

      // 4. Search Filter (Section 8: Problem ID, Title, Description, Category, Tags)
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
    }).sort((a, b) => {
      // Section 10: Sorting
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      if (sortBy === 'title-desc') return b.title.localeCompare(a.title);
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      // Default: Problem ID
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

  // Helper for document availability label and badge
  const renderDocBadge = (prob: ProblemRecord) => {
    if (!prob.fileName && !prob.fileUrl) {
      return (
        <span className="text-xs text-[#9CA3AF]">
          Online Brief
        </span>
      );
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb Navigation */}
        <div className="mb-4 flex items-center gap-2 text-xs text-[#667085]">
          <Link to="/participant" className="hover:text-[#164A36]">Dashboard</Link>
          <span>/</span>
          <span className="text-[#111827] font-semibold">Problem Statements</span>
        </div>

        {/* Header Section per Section 7 & 14 */}
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

          {/* Useful Dynamic Metadata per Section 14 */}
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

        {/* Section 13: Featured Problem Highlight Banner */}
        {!isLoading && featuredProblem && !hasActiveFilters && (
          <div className="my-8 bg-white rounded-2xl border border-[#D5E6DB] p-6 sm:p-8 shadow-xs relative overflow-hidden group">
            <div className="absolute right-0 top-0 bottom-0 opacity-5 pointer-events-none">
              <Compass className="w-80 h-80 -mr-16 -mt-10 text-[#164A36]" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Side */}
              <div className="max-w-3xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded bg-[#EEF5F0] text-[#164A36] font-mono text-xs font-bold border border-[#D5E6DB]">
                    Featured Challenge • {featuredProblem.problemId}
                  </span>
                  <Badge variant="subtle" size="sm">
                    {featuredProblem.category}
                  </Badge>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight group-hover:text-[#164A36] transition-colors">
                  {featuredProblem.title}
                </h2>

                <p className="text-sm text-[#4B5563] leading-relaxed line-clamp-2">
                  {featuredProblem.description}
                </p>
              </div>

              {/* Right Side */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-[#F3F4F6]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                    Difficulty: {featuredProblem.difficulty}
                  </span>
                  {renderDocBadge(featuredProblem)}
                </div>

                <Button
                  to={`/participant/problem/${featuredProblem.problemId}`}
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
                  className="shadow-xs"
                >
                  EXPLORE PROBLEM →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar (Sections 8, 9, 10) */}
        <div className="my-8 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input per Section 8 */}
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
              {/* Difficulty Dropdown per Section 9 */}
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

              {/* File Type Dropdown per Section 9 */}
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

              {/* Sort Dropdown per Section 10 */}
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

          {/* Category Tabs per Section 9 */}
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

        {/* Loading State Skeleton per Section 31 */}
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
          /* Empty State per Phase 3 */
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-[#164A36]" />}
            title="No problem statements have been released yet."
            description="Official challenges will appear here once released by the organizers."
          />
        ) : filteredProblems.length === 0 ? (
          /* Empty State per Section 32: Filter/Search no results */
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
          /* Problem Cards Grid per Section 11 & 12 (Desktop 3-col, Tablet 2-col, Mobile 1-col) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProblems.map((prob) => {
              const difficultyVariants: Record<string, string> = {
                Beginner: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                Intermediate: 'bg-blue-50 text-blue-800 border-blue-200',
                Advanced: 'bg-purple-50 text-purple-800 border-purple-200',
              };

              const limit = eventConfig.problemSelectionLimit || 2;
              const selectedCount = prob.selectedCount || 0;
              const isFull = selectedCount >= limit;
              const remainingSlots = Math.max(0, limit - selectedCount);
              const isScheduled =
                prob.status === 'SCHEDULED' &&
                (!prob.releaseAt || new Date(prob.releaseAt).getTime() > Date.now());

              return (
                <div
                  key={prob.problemId}
                  className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#CBD5E1] p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Header: Problem ID & Category Badge per Section 11 */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#164A36] bg-[#EEF5F0] px-2.5 py-1 rounded-md border border-[#D5E6DB]">
                        {prob.problemId}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isScheduled && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            SCHEDULED
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            difficultyVariants[prob.difficulty] || 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {prob.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Domain Category & Capacity Slot Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                        {prob.category}
                      </span>
                      {isScheduled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Preview Mode
                        </span>
                      ) : isFull ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Capacity Full ({limit}/{limit})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB] shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {remainingSlots} of {limit} slots left
                        </span>
                      )}
                    </div>

                    {/* Problem Title per Section 11 */}
                    <h3 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight leading-snug group-hover:text-[#164A36] transition-colors line-clamp-2">
                      {prob.title}
                    </h3>

                    {/* Short Description with line-clamping per Section 12 */}
                    <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed line-clamp-3">
                      {prob.description}
                    </p>

                    {/* Tags */}
                    {prob.tags && prob.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {prob.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium text-[#667085] bg-[#F7F5EF] px-2 py-0.5 rounded border border-[#E5E7EB]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Document availability + Action Button per Section 11 */}
                  <div className="mt-6 pt-4 border-t border-[#F3F4F6] flex items-center justify-between gap-3">
                    <div>
                      {renderDocBadge(prob)}
                    </div>

                    <Link
                      to={`/participant/problem/${prob.problemId}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-colors shrink-0 ${
                        isScheduled
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                          : 'bg-[#164A36] text-white hover:bg-[#0E3324]'
                      }`}
                    >
                      <span>{isScheduled ? 'PREVIEW CHALLENGE' : 'VIEW DETAILS'}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
