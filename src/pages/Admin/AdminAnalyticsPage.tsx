import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Percent,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { TeamService } from '../../services/teamService';
import { ProblemService } from '../../services/problemService';
import { SelectionService } from '../../services/selectionService';
import { formatSelectionDateTime } from '../../utils/formatters';
import type { TeamRecord, ProblemRecord, TeamSelection } from '../../types';

type DateFilter = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'ALL_TIME';

export const AdminAnalyticsPage: React.FC = () => {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [selections, setSelections] = useState<TeamSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL_TIME');

  useEffect(() => {
    const loadInitialData = async () => {
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
        console.error('Failed to load analytics data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

    // Real-time listener for selection sync (Section 31)
    const unsub = SelectionService.subscribeToSelections((liveSelections) => {
      setSelections(liveSelections);
    });

    return () => unsub();
  }, []);

  // Filter selections by selected date range (Section 32)
  const filteredSelections = useMemo(() => {
    if (dateFilter === 'ALL_TIME') return selections;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

    return selections.filter((s) => {
      const itemTime = new Date(s.selectedAt).getTime();
      if (dateFilter === 'TODAY') {
        return itemTime >= startOfToday;
      }
      if (dateFilter === 'YESTERDAY') {
        return itemTime >= startOfYesterday && itemTime < startOfToday;
      }
      if (dateFilter === 'LAST_7_DAYS') {
        return itemTime >= startOf7Days;
      }
      return true;
    });
  }, [selections, dateFilter]);

  // Metrics Calculations (Section 29)
  const totalTeams = teams.length;
  const activeTeams = teams.filter((t) => t.status === 'active').length;
  const selectedTeamsCount = selections.length;
  const unselectedTeamsCount = Math.max(0, totalTeams - selectedTeamsCount);
  const selectionRate =
    activeTeams > 0 ? Math.round((selectedTeamsCount / activeTeams) * 100) : 0;

  // Problem Popularity Breakdown (Section 29)
  const popularityData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSelections.forEach((s) => {
      counts[s.problemId] = (counts[s.problemId] || 0) + 1;
    });

    // Match with all published problems so 0-count problems still show
    const list = problems
      .filter((p) => p.status === 'PUBLISHED')
      .map((p) => ({
        problemId: p.problemId,
        title: p.title,
        category: p.category,
        count: counts[p.problemId] || 0,
      }))
      .sort((a, b) => b.count - a.count);

    const maxCount = list.reduce((max, item) => Math.max(max, item.count), 0) || 1;

    return { list, maxCount };
  }, [problems, filteredSelections]);

  // Chronological Selection Timeline (Section 30)
  const sortedTimeline = useMemo(() => {
    return [...filteredSelections].sort(
      (a, b) => new Date(b.selectedAt).getTime() - new Date(a.selectedAt).getTime()
    );
  }, [filteredSelections]);

  return (
    <AdminLayout
      title="PORTAL ANALYTICS & METRICS"
      description="Live problem selection statistics, popularity rankings, and chronological commitment stream."
    >
      {/* Date Filter Toolbar (Section 32) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[#111827]">
            Analytical Time Window
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Filter popularity metrics and selection stream by registration interval
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#F7F5EF] rounded-xl border border-[#E5E7EB] text-xs font-semibold">
          <button
            onClick={() => setDateFilter('TODAY')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              dateFilter === 'TODAY'
                ? 'bg-[#164A36] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateFilter('YESTERDAY')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              dateFilter === 'YESTERDAY'
                ? 'bg-[#164A36] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => setDateFilter('LAST_7_DAYS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              dateFilter === 'LAST_7_DAYS'
                ? 'bg-[#164A36] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateFilter('ALL_TIME')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              dateFilter === 'ALL_TIME'
                ? 'bg-[#164A36] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* 1. TOP METRIC HIGHLIGHTS (Section 29) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Teams */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-2 font-bold uppercase tracking-wider">
            <span>Total Teams</span>
            <Users className="w-4 h-4 text-[#164A36]" />
          </div>
          <div className="text-3xl font-extrabold text-[#111827]">
            {isLoading ? '...' : totalTeams}
          </div>
          <p className="text-xs text-[#667085] mt-1">
            {activeTeams} active in directory
          </p>
        </div>

        {/* Selected Teams */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-2 font-bold uppercase tracking-wider">
            <span>Selected Teams</span>
            <CheckCircle2 className="w-4 h-4 text-[#164A36]" />
          </div>
          <div className="text-3xl font-extrabold text-[#164A36]">
            {isLoading ? '...' : selectedTeamsCount}
          </div>
          <p className="text-xs text-[#667085] mt-1">
            Confirmed & locked selections
          </p>
        </div>

        {/* Unselected Teams */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-2 font-bold uppercase tracking-wider">
            <span>Unselected Teams</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-700">
            {isLoading ? '...' : unselectedTeamsCount}
          </div>
          <p className="text-xs text-[#667085] mt-1">
            Pending problem lock-in
          </p>
        </div>

        {/* Selection Rate */}
        <div className="p-5 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#164A36] mb-2 font-bold uppercase tracking-wider">
            <span>Selection Rate</span>
            <Percent className="w-4 h-4 text-[#164A36]" />
          </div>
          <div className="text-3xl font-extrabold text-[#164A36]">
            {isLoading ? '...' : `${selectionRate}%`}
          </div>
          {/* Clean progress indicator */}
          <div className="w-full h-1.5 rounded-full bg-[#D5E6DB] overflow-hidden mt-2">
            <div
              className="h-full bg-[#164A36] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, selectionRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. POPULARITY RANKING & CHRONOLOGICAL TIMELINE (Sections 29 & 30) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Left Column: Problem Popularity Clean Chart (Section 29) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] mb-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                Challenge Distribution
              </span>
              <h3 className="text-base font-extrabold text-[#111827] mt-0.5">
                Problem Statement Popularity
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#164A36] bg-[#EEF5F0] px-2.5 py-1 rounded border border-[#D5E6DB]">
              {popularityData.list.length} PUBLISHED
            </span>
          </div>

          <div className="space-y-4">
            {popularityData.list.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#667085]">
                No published problem statements available to rank.
              </div>
            ) : (
              popularityData.list.map((item) => {
                const percentageOfMax = Math.round((item.count / popularityData.maxCount) * 100);

                return (
                  <div key={item.problemId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-mono font-bold text-[#164A36] shrink-0">
                          {item.problemId}
                        </span>
                        <span className="font-semibold text-[#111827] truncate">
                          {item.title}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[#111827] shrink-0 ml-2">
                        {item.count} {item.count === 1 ? 'team' : 'teams'}
                      </span>
                    </div>

                    {/* Clean Green Visual Bar Chart (Section 29) */}
                    <div className="w-full h-3 rounded-md bg-[#F7F5EF] overflow-hidden border border-[#E5E7EB]/60">
                      <div
                        className="h-full bg-[#164A36] rounded-md transition-all duration-500"
                        style={{ width: `${Math.max(item.count > 0 ? 6 : 0, percentageOfMax)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chronological Selection Timeline (Section 30) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] mb-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                Real-Time Activity
              </span>
              <h3 className="text-base font-extrabold text-[#111827] mt-0.5">
                Selection Timeline
              </h3>
            </div>
            <Link
              to="/admin/selections"
              className="text-xs font-semibold text-[#164A36] hover:underline flex items-center gap-1"
            >
              All Selections <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[460px] pr-1 space-y-4">
            {sortedTimeline.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#667085]">
                No selection activity recorded for this time window.
              </div>
            ) : (
              sortedTimeline.map((item, idx) => {
                const dt = formatSelectionDateTime(item.selectedAt);
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F7F5EF]/40 hover:bg-[#EEF5F0]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#667085] mb-1">
                      <span className="font-mono font-bold text-[#164A36]">
                        {dt.time}
                      </span>
                      <span>{dt.date}</span>
                    </div>

                    <div className="text-xs font-bold text-[#111827]">
                      <Link
                        to={`/admin/participants/${item.teamId}`}
                        className="hover:text-[#164A36] hover:underline"
                      >
                        {item.teamName}
                      </Link>
                    </div>

                    <div className="text-xs text-[#4B5563] mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#164A36] bg-white px-1.5 py-0.2 rounded border border-[#D5E6DB]">
                        {item.problemId}
                      </span>
                      <span className="truncate">{item.problemTitle}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
