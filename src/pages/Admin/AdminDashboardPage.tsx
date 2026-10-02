import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  CheckSquare,
  Clock,
  Plus,
  Upload,
  ShieldCheck,
  Activity,
  TrendingUp,
  KeyRound,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { TeamService } from '../../services/teamService';
import { ProblemService } from '../../services/problemService';
import { SelectionService } from '../../services/selectionService';
import { formatSelectionDateTime } from '../../utils/formatters';
import type { TeamRecord, ProblemRecord, TeamSelection } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [selections, setSelections] = useState<TeamSelection[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [teamData, problemData, selectionData] = await Promise.all([
        TeamService.getAllTeams(),
        ProblemService.getAllProblems({ forParticipant: false }),
        SelectionService.getAllSelections(),
      ]);
      setTeams(teamData);
      setProblems(problemData);
      setSelections(selectionData);
      setActivities(SelectionService.getRecentActivities());
    } catch (err) {
      console.error('[AdminDashboard] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Section 31: Real-time listener
    const unsubscribe = SelectionService.subscribeToSelections((latestSelections) => {
      setSelections(latestSelections);
      setActivities(SelectionService.getRecentActivities());
    });

    return () => unsubscribe();
  }, []);

  // Section 16 & 17: Live Calculations from Firestore / Data
  const totalTeams = teams.length;
  const activeTeams = teams.filter((t) => t.status === 'active').length;
  const totalProblems = problems.length;
  const publishedProblems = problems.filter((p) => p.status === 'PUBLISHED').length;

  // Determine selections using both teamSelections collection and team profile pointers
  const selectedTeamIds = new Set([
    ...selections.map((s) => s.teamId),
    ...teams.filter((t) => Boolean(t.selectedProblemId)).map((t) => t.teamId),
  ]);

  const teamsWithSelection = selectedTeamIds.size;
  const teamsWithoutSelection = Math.max(0, totalTeams - teamsWithSelection);

  // Section 17: Selection Rate Formula
  const selectionRate =
    activeTeams > 0 ? Math.round((teamsWithSelection / activeTeams) * 100) : 0;

  return (
    <AdminLayout
      title="Operations & Selection Dashboard"
      description="Live tracking of official challenge releases, team credentials, and real-time problem selections."
      actionButton={
        <div className="flex items-center gap-2.5">
          <Button
            to="/admin/credentials"
            variant="secondary"
            size="md"
            leftIcon={<KeyRound className="w-4 h-4" />}
            className="bg-white"
          >
            Credentials
          </Button>
          <Button
            to="/admin/participants"
            variant="secondary"
            size="md"
            leftIcon={<Upload className="w-4 h-4" />}
            className="bg-white"
          >
            Import Teams
          </Button>
          <Button
            to="/admin/problems/new"
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Problem
          </Button>
        </div>
      }
    >
      {/* Section 16: Live Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
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
              {activeTeams} active teams
            </p>
          </div>
        </div>

        {/* TOTAL PROBLEMS */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#667085] tracking-wider uppercase text-[11px]">
              TOTAL PROBLEMS
            </span>
            <FileText className="w-4 h-4 text-[#667085]" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#111827] tracking-tight leading-none font-sans">
              {isLoading ? '...' : totalProblems}
            </span>
            <p className="mt-1.5 text-xs text-[#667085]">
              {totalProblems - publishedProblems} drafts
            </p>
          </div>
        </div>

        {/* PUBLISHED PROBLEMS */}
        <div className="p-5 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#164A36] tracking-wider uppercase text-[11px]">
              PUBLISHED PROBLEMS
            </span>
            <ShieldCheck className="w-4 h-4 text-[#164A36]" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#164A36] tracking-tight leading-none font-sans">
              {isLoading ? '...' : publishedProblems}
            </span>
            <p className="mt-1.5 text-xs text-[#164A36]">
              Visible to participants
            </p>
          </div>
        </div>

        {/* TEAMS WITH SELECTION */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#667085] tracking-wider uppercase text-[11px]">
              TEAMS WITH SELECTION
            </span>
            <CheckSquare className="w-4 h-4 text-[#164A36]" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#111827] tracking-tight leading-none font-sans">
              {isLoading ? '...' : teamsWithSelection}
            </span>
            <p className="mt-1.5 text-xs text-[#164A36] font-semibold">
              Confirmed & locked
            </p>
          </div>
        </div>

        {/* TEAMS WITHOUT SELECTION */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#667085] tracking-wider uppercase text-[11px]">
              TEAMS WITHOUT SELECTION
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#111827] tracking-tight leading-none font-sans">
              {isLoading ? '...' : teamsWithoutSelection}
            </span>
            <p className="mt-1.5 text-xs text-[#667085]">
              Awaiting choice
            </p>
          </div>
        </div>

        {/* Section 17: SELECTION RATE */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#667085] tracking-wider uppercase text-[11px]">
              SELECTION RATE
            </span>
            <TrendingUp className="w-4 h-4 text-[#164A36]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-[#164A36] tracking-tight leading-none font-sans">
                {isLoading ? '...' : `${selectionRate}%`}
              </span>
              <span className="text-xs text-[#667085]">
                ({teamsWithSelection}/{activeTeams})
              </span>
            </div>

            {/* Clean Progress Indicator */}
            <div className="w-full bg-[#F3F4F6] rounded-full h-2 mt-2 overflow-hidden border border-[#E5E7EB]">
              <div
                className="bg-[#164A36] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, selectionRate))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Operations Split: Recent Activity (Section 18) + Quick Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Section 18: RECENT ACTIVITY (Chronological events) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EEF5F0] text-[#164A36] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827] text-base uppercase tracking-tight">
                    RECENT ACTIVITY
                  </h3>
                  <p className="text-xs text-[#667085]">
                    Real-time participant selections and system updates
                  </p>
                </div>
              </div>

              <Link
                to="/admin/analytics"
                className="text-xs font-bold text-[#164A36] hover:underline"
              >
                View Timeline →
              </Link>
            </div>

            <div className="divide-y divide-[#F3F4F6] mt-3">
              {activities.length > 0 ? (
                activities.slice(0, 6).map((act) => {
                  const time = formatSelectionDateTime(act.timestamp);
                  return (
                    <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#164A36] mt-1.5 shrink-0" />
                        <div>
                          <div className="font-bold text-[#111827]">
                            {act.title}
                          </div>
                          <div className="text-[#667085] mt-0.5">
                            {act.description}
                          </div>
                        </div>
                      </div>

                      <span className="font-mono text-[11px] text-[#9CA3AF] whitespace-nowrap shrink-0">
                        {time.time || time.date}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-[#667085]">
                  No recent activities recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F3F4F6]">
            <Button to="/admin/selections" variant="secondary" size="md" fullWidth className="bg-white">
              Monitor Team Selections Table →
            </Button>
          </div>
        </div>

        {/* Quick Selections Overview */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6]">
              <div>
                <h3 className="font-bold text-[#111827] text-base uppercase tracking-tight">
                  Problem Allocations
                </h3>
                <p className="text-xs text-[#667085]">
                  Track selection distribution
                </p>
              </div>
              <Link
                to="/admin/problems"
                className="text-xs font-bold text-[#164A36] hover:underline"
              >
                All Problems
              </Link>
            </div>

            <div className="divide-y divide-[#F3F4F6] mt-2">
              {problems.slice(0, 5).map((prob) => {
                const count = selections.filter((s) => s.problemId === prob.problemId).length;
                return (
                  <div key={prob.problemId} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-[#164A36]">{prob.problemId}</span>
                        <span className="text-[11px] text-[#667085] truncate">{prob.category}</span>
                      </div>
                      <div className="font-medium text-[#111827] truncate">
                        {prob.title}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-[#164A36] bg-[#EEF5F0] px-2 py-0.5 rounded border border-[#D5E6DB]">
                        {count} teams
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F3F4F6]">
            <Button to="/admin/problems" variant="secondary" size="md" fullWidth className="bg-white">
              Manage Problem Statements →
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
