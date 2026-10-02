import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Users,
  Compass,
  Clock,
  CheckCircle2,
  Lock,
  AlertCircle,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { TeamService } from '../../services/teamService';
import { ProblemService } from '../../services/problemService';
import { SelectionService } from '../../services/selectionService';
import { SettingsService } from '../../services/settingsService';
import { AnnouncementService } from '../../services/announcementService';
import { formatSelectionDateTime } from '../../utils/formatters';
import type { ProblemRecord, TeamSelection, PortalSettings, AnnouncementRecord, TeamRecord } from '../../types';

export const ParticipantDashboardPage: React.FC = () => {
  const { team } = useAuth();
  const { eventConfig } = useEvent();
  const [teamDetails, setTeamDetails] = useState<TeamRecord | null>(team || null);
  const [publishedProblems, setPublishedProblems] = useState<ProblemRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [scheduledReleaseTime, setScheduledReleaseTime] = useState<string | null>(null);
  const [selection, setSelection] = useState<TeamSelection | null>(null);
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [probs, portalSettings, annList, allProblems] = await Promise.all([
        ProblemService.getAllProblems({ forParticipant: true }),
        SettingsService.getSettings(),
        AnnouncementService.getAllAnnouncements({ forParticipant: true }),
        ProblemService.getAllProblems({ forParticipant: false }),
      ]);
      setPublishedProblems(probs);
      setSettings(portalSettings);
      setAnnouncements(annList.slice(0, 3));

      // Calculate scheduled release timestamp (global or earliest problem)
      if (portalSettings?.globalReleaseDate && portalSettings?.globalReleaseStatus === 'NOT_STARTED') {
        setScheduledReleaseTime(`${portalSettings.globalReleaseDate}T${portalSettings.globalReleaseTime || '10:00'}:00`);
      } else {
        const scheduledProbs = allProblems.filter((p) => p.status === 'SCHEDULED' && p.releaseAt);
        if (scheduledProbs.length > 0) {
          scheduledProbs.sort((a, b) => new Date(a.releaseAt!).getTime() - new Date(b.releaseAt!).getTime());
          setScheduledReleaseTime(scheduledProbs[0].releaseAt!);
        } else {
          setScheduledReleaseTime(null);
        }
      }

      if (team?.teamId) {
        // Fetch and compare logged in Team ID with imported participant details
        const fullTeam = await TeamService.getTeamById(team.teamId);
        if (fullTeam && fullTeam.teamId.trim().toLowerCase() === team.teamId.trim().toLowerCase()) {
          setTeamDetails(fullTeam);
        }
        const currentSel = await SelectionService.getSelectionForTeam(team.teamId);
        setSelection(currentSel);
      }
    } catch (err) {
      console.error('[ParticipantDashboard] Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [team?.teamId, team?.selectedProblemId]);

  const totalPublished = publishedProblems.length;
  const isLive = totalPublished > 0;

  const currentTeam = teamDetails || team;
  const rawTeamName = currentTeam?.teamName?.trim() || '';
  const teamId = currentTeam?.teamId?.trim() || '';
  // Avoid stutter like "Team Team ALPHA-004"
  const teamName = rawTeamName || (teamId ? `Team ${teamId}` : 'Team');

  const rawLead = currentTeam?.teamLeadName?.trim() || '';
  const isLeadPlaceholder =
    !rawLead ||
    rawLead.toLowerCase() === 'team lead' ||
    rawLead.toLowerCase() === rawTeamName.toLowerCase();
  const teamLead = isLeadPlaceholder ? 'Leader (Pending Roster)' : rawLead;

  // Filter out placeholder names like "Team Lead" from member list
  const memberList = (currentTeam?.teamMembers || []).filter(
    (m) => m && m.trim().toLowerCase() !== 'team lead' && m.trim() !== ''
  );
  const displayMembers =
    memberList.length > 0 ? memberList : !isLeadPlaceholder ? [teamLead] : [];
  const memberCount = displayMembers.length > 0 ? displayMembers.length : 1;

  const rawCollege = currentTeam?.college?.trim() || '';
  const isCollegePlaceholder =
    !rawCollege || rawCollege.toLowerCase() === 'participant institution';
  const college = isCollegePlaceholder ? '' : rawCollege;

  const hasSelection = Boolean(selection || currentTeam?.selectedProblemId);
  const selectedProblemId = selection?.problemId || currentTeam?.selectedProblemId || '';
  const selectedProblemTitle = selection?.problemTitle || currentTeam?.selectedProblemTitle || '';
  const selectedTimestamp = selection?.selectedAt || currentTeam?.selectionDate || '';
  const formattedTime = formatSelectionDateTime(selectedTimestamp);

  const isSelectionOpen = settings ? settings.isSelectionOpen : true;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb Navigation */}
        <div className="mb-4 flex items-center gap-2 text-xs text-[#667085]">
          <Link to="/participant" className="hover:text-[#164A36]">Dashboard</Link>
          <span>/</span>
          <span className="text-[#111827] font-semibold">Team Overview</span>
        </div>

        {/* 1. EVENT BANNER (Configured in Settings, placed prominently for participants) */}
        {eventConfig.eventBanner ? (
          <div className="mb-8 rounded-3xl overflow-hidden border border-[#E5E7EB] bg-white shadow-xs relative">
            <div className="h-48 sm:h-64 w-full relative">
              <img
                src={eventConfig.eventBanner}
                alt={eventConfig.eventName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex items-end p-6 sm:p-10">
                <div className="text-white space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    {eventConfig.clubLogo && (
                      <img
                        src={eventConfig.clubLogo}
                        alt="Club Logo"
                        className="w-9 h-9 rounded-xl bg-white/95 p-1 object-contain shadow-xs"
                      />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-white/95 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full border border-white/25">
                      {eventConfig.clubName}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm">
                    {eventConfig.eventName}
                  </h2>
                  {eventConfig.tagline && (
                    <p className="text-xs sm:text-sm text-white/85 max-w-2xl drop-shadow-xs">
                      {eventConfig.tagline}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#164A36] to-[#0E3324] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              {eventConfig.clubLogo ? (
                <img
                  src={eventConfig.clubLogo}
                  alt="Club"
                  className="w-11 h-11 object-contain rounded-xl bg-white p-1.5 border border-white/20 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg border border-white/20 shrink-0">
                  ⚡
                </div>
              )}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200 block">
                  {eventConfig.clubName} Presents
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  {eventConfig.eventName}
                </h2>
              </div>
            </div>
            <span className="text-xs font-bold uppercase px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-white">
              Official Hackathon Portal
            </span>
          </div>
        )}

        {/* 2. SCHEDULED RELEASE COUNTDOWN (Visible and ticking when release is pending) */}
        {scheduledReleaseTime && new Date(scheduledReleaseTime).getTime() > Date.now() && (
          <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-amber-700" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                    RELEASE SCHEDULED
                  </span>
                  <h3 className="text-base font-extrabold text-amber-950 tracking-wide">
                    PROBLEM STATEMENTS SCHEDULED FOR RELEASE
                  </h3>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed max-w-xl">
                  Challenge problem statements are currently in preview mode. You can browse and review all details now. Problem selection unlocks automatically when the countdown completes.
                </p>
                <div className="pt-2">
                  <Link
                    to="/participant/problems"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 px-3.5 py-1.5 rounded-lg border border-amber-300 transition-colors"
                  >
                    <span>Browse Challenges Ahead of Unlock</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              <CountdownTimer
                targetDate={scheduledReleaseTime}
                label="CHALLENGES UNLOCK IN"
                className="bg-white/90 border-amber-200 shadow-none"
                onExpire={() => {
                  loadDashboardData();
                }}
              />
            </div>
          </div>
        )}

        {/* Section 4: Header Welcome Area */}
        <div className="pb-8 border-b border-[#E5E7EB]">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight uppercase leading-tight">
            WELCOME BACK,<br className="hidden sm:inline" />
            <span className="text-[#164A36] sm:ml-2">{teamName.toUpperCase()}</span>
          </h1>

          <p className="mt-3 text-base text-[#4B5563] max-w-2xl leading-relaxed">
            Explore the officially released challenges and find the problem your team wants to solve.
          </p>
        </div>

        {/* Section 39: Participant Selection Status Banner */}
        <div className="my-6">
          {hasSelection ? (
            <div className="px-5 py-3.5 rounded-xl bg-[#EEF5F0] border border-[#D5E6DB] flex items-center justify-between text-xs text-[#164A36] font-bold">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-[#164A36]" />
                <span className="tracking-wide uppercase">YOUR TEAM'S SELECTION IS LOCKED</span>
              </div>
              <span className="text-[11px] font-mono text-[#667085] hidden sm:inline">
                Challenge: {selectedProblemId}
              </span>
            </div>
          ) : isSelectionOpen ? (
            <div className="px-5 py-3.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between text-xs text-[#164A36] font-bold shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="tracking-wide uppercase">PROBLEM SELECTION IS OPEN</span>
              </div>
              <span className="text-[11px] text-[#667085] font-normal hidden sm:inline">
                One problem commitment permitted per team
              </span>
            </div>
          ) : (
            <div className="px-5 py-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800 font-bold">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="tracking-wide uppercase">PROBLEM SELECTION IS CLOSED</span>
              </div>
              <span className="text-[11px] text-amber-700 font-normal hidden sm:inline">
                Selection phase concluded by organizers
              </span>
            </div>
          )}
        </div>

        {/* Section 4: TEAM STATUS Area (Without Registration Numbers) */}
        <div className="mb-8 bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-5 border-b border-[#F3F4F6]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                Participant Status
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#111827] tracking-tight">
                TEAM STATUS
              </h2>
            </div>
            <Badge variant="subtle" size="md">
              Verified Team
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-6">
            {/* Team Name */}
            <div className="p-3.5 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Team Name
              </span>
              <span className="text-sm sm:text-base font-bold text-[#111827] mt-1 block truncate">
                {teamName}
              </span>
            </div>

            {/* Team ID */}
            <div className="p-3.5 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Team ID
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-[#164A36] mt-1 block">
                {teamId}
              </span>
            </div>

            {/* Team Lead */}
            <div className="p-3.5 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Team Lead
              </span>
              <span className="text-sm sm:text-base font-bold text-[#111827] mt-1 block truncate">
                {teamLead}
              </span>
            </div>

            {/* Members */}
            <div className="p-3.5 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Members
              </span>
              <span className="text-sm sm:text-base font-bold text-[#111827] mt-1 block">
                {memberCount} Member{memberCount > 1 ? 's' : ''}
              </span>
            </div>

            {/* Problem Selection status badge */}
            <div className="p-3.5 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Selection
              </span>
              {hasSelection ? (
                <span className="text-xs font-bold text-[#164A36] mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EEF5F0] border border-[#D5E6DB]">
                  <CheckCircle2 className="w-3 h-3 text-[#164A36]" />
                  CONFIRMED
                </span>
              ) : (
                <span className="text-xs font-bold text-[#667085] mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  PENDING
                </span>
              )}
            </div>
          </div>

          {/* Enrolled Team Members Roster */}
          <div className="mt-5 pt-4 border-t border-[#F3F4F6]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                Enrolled Team Members ({displayMembers.length})
              </span>
              {college && (
                <span className="text-xs text-[#667085] font-medium hidden sm:inline">
                  {college}
                </span>
              )}
            </div>
            {displayMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayMembers.map((m, idx) => {
                  const isLead =
                    !isLeadPlaceholder &&
                    m.trim().toLowerCase() === teamLead.trim().toLowerCase();
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
                        isLead
                          ? 'bg-[#EEF5F0] text-[#164A36] border-[#D5E6DB]'
                          : 'bg-[#F7F5EF] text-[#374151] border-[#E5E7EB]'
                      }`}
                    >
                      <span>{m}</span>
                      {isLead && (
                        <span className="text-[9px] font-bold uppercase bg-[#164A36] text-white px-1.5 py-0.5 rounded leading-none">
                          Lead
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#667085] italic">
                Official team member roster will appear here once participants are imported by organizers.
              </p>
            )}
          </div>
        </div>

        {/* Sections 2 & 3: PROBLEM SELECTION CARD (No Selection vs Selected) */}
        <div className="mb-8 bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6] mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                Official Allocation
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#111827] tracking-tight">
                PROBLEM SELECTION
              </h2>
            </div>

            {hasSelection ? (
              <Badge variant="forest" size="md">
                LOCKED
              </Badge>
            ) : (
              <Badge variant="subtle" size="md">
                NOT SELECTED
              </Badge>
            )}
          </div>

          {hasSelection ? (
            /* Section 3: TEAM DASHBOARD — SELECTED Prominent Confirmation Card */
            <div className="p-6 sm:p-8 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white text-[#164A36] border border-[#D5E6DB] flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#164A36] bg-white px-2 py-0.5 rounded border border-[#D5E6DB]">
                        {selectedProblemId}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#164A36]">
                        <Lock className="w-3 h-3" />
                        LOCKED
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#111827] mt-1">
                      {selectedProblemTitle || 'Selected Challenge'}
                    </h3>
                  </div>
                </div>

                <div className="shrink-0">
                  <Button
                    to="/participant/selected-problem"
                    variant="primary"
                    size="md"
                    rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
                    className="font-bold shadow-xs whitespace-nowrap"
                  >
                    VIEW SELECTED PROBLEM →
                  </Button>
                </div>
              </div>

              {/* Display details per Section 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#D5E6DB]">
                <div className="bg-white/80 p-3.5 rounded-xl border border-[#D5E6DB]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] block">
                    Problem ID
                  </span>
                  <span className="font-mono font-bold text-sm text-[#164A36] mt-0.5 block">
                    {selectedProblemId}
                  </span>
                </div>

                <div className="bg-white/80 p-3.5 rounded-xl border border-[#D5E6DB]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] block">
                    Category
                  </span>
                  <span className="font-bold text-sm text-[#111827] mt-0.5 block truncate">
                    {selection?.category || 'Official Track'}
                  </span>
                </div>

                <div className="bg-white/80 p-3.5 rounded-xl border border-[#D5E6DB]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] block">
                    Selected Date
                  </span>
                  <span className="font-medium text-sm text-[#111827] mt-0.5 block">
                    {formattedTime.date}
                  </span>
                </div>

                <div className="bg-white/80 p-3.5 rounded-xl border border-[#D5E6DB]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] block">
                    Selected Time
                  </span>
                  <span className="font-medium text-sm text-[#111827] mt-0.5 block">
                    {formattedTime.time || '10:00 AM'}
                  </span>
                </div>
              </div>

              {/* Message per Section 3 */}
              <div className="flex items-center gap-2 text-xs text-[#164A36] pt-1">
                <ShieldCheck className="w-4 h-4 text-[#164A36] shrink-0" />
                <span>
                  ✓ Your team has selected its official challenge. Your problem selection is final and cannot be changed.
                </span>
              </div>
            </div>
          ) : (
            /* Section 2: TEAM DASHBOARD — NO SELECTION */
            <div className="p-6 sm:p-8 rounded-2xl bg-[#F7F5EF] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#667085]">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  STATUS: NOT SELECTED
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                  Your team has not selected a problem statement yet.
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
                  Browse the officially released challenges, inspect requirements and evaluation criteria, then commit to your team's challenge.
                </p>
              </div>

              <div className="shrink-0">
                <Button
                  to="/participant/problems"
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
                  className="font-bold shadow-xs whitespace-nowrap"
                >
                  EXPLORE PROBLEMS →
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Section 6: PROBLEM RELEASE STATUS Component (Step 8 #7 & #8) */}
        <div className="mb-8">
          {isLoading ? (
            <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] animate-pulse h-32" />
          ) : isLive ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-[#164A36] text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 opacity-5 pointer-events-none">
                <Compass className="w-80 h-80 -mr-16 -mt-10" />
              </div>

              <div className="relative z-10 space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold tracking-wide uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Official Release Active
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
                  PROBLEM STATEMENTS ARE LIVE
                </h2>
                <p className="text-sm text-emerald-100/90 max-w-xl">
                  {totalPublished} official {totalPublished === 1 ? 'challenge is' : 'challenges are'} available.
                </p>
              </div>

              <div className="relative z-10 flex-shrink-0">
                <Button
                  to="/participant/problems"
                  variant="secondary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
                  className="bg-white text-[#164A36] hover:bg-[#F7F5EF] font-bold shadow-xs"
                >
                  EXPLORE CHALLENGES →
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledReleaseTime && (
                <CountdownTimer
                  targetDate={scheduledReleaseTime}
                  label="PROBLEM RELEASE IN"
                  onExpire={() => {
                    loadDashboardData();
                  }}
                />
              )}

              <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold tracking-wide uppercase border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Awaiting Release
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] uppercase">
                    PROBLEM STATEMENTS ARE NOT LIVE
                  </h2>
                  <p className="text-sm text-[#667085]">
                    Official challenges will appear here once released by the organizers.
                  </p>
                </div>

                <Button
                  to="/guidelines"
                  variant="outline"
                  size="md"
                  rightIcon={<BookOpen className="w-4 h-4 ml-1 text-[#667085]" />}
                >
                  Read Guidelines
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Section 5: DASHBOARD QUICK ACTIONS */}
        <div className="my-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-4">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Action Card 1: EXPLORE PROBLEMS */}
            <Link
              to="/participant/problems"
              className="group bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-xs hover:border-[#164A36] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#164A36] transition-colors uppercase">
                  EXPLORE PROBLEMS
                </h3>
                <p className="mt-2 text-sm text-[#667085] leading-relaxed">
                  Browse all officially released challenges.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#164A36]">
                <span>Browse Challenges</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Action Card 2: MY TEAM */}
            <Link
              to="/participant/team"
              className="group bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-xs hover:border-[#164A36] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#164A36] transition-colors uppercase">
                  MY TEAM
                </h3>
                <p className="mt-2 text-sm text-[#667085] leading-relaxed">
                  View your team information.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#164A36]">
                <span>View Team Roster</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Action Card 3: GUIDELINES */}
            <Link
              to="/guidelines"
              className="group bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-xs hover:border-[#164A36] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#164A36] transition-colors uppercase">
                  GUIDELINES
                </h3>
                <p className="mt-2 text-sm text-[#667085] leading-relaxed">
                  Read hackathon rules and submission guidelines.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#164A36]">
                <span>Read Submission Rules</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>

        {/* LATEST ANNOUNCEMENTS Widget (Step 8 #13) */}
        <div className="my-8 bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6] mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEF5F0] text-[#164A36] flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#111827]">
                  LATEST ANNOUNCEMENTS
                </h2>
                <p className="text-xs text-[#667085]">
                  Official broadcasts, schedules and notices from hackathon organizers
                </p>
              </div>
            </div>

            <Link
              to="/participant/announcements"
              className="text-xs font-semibold text-[#164A36] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {announcements.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                NO ANNOUNCEMENTS
              </span>
              <p className="text-xs text-[#667085] mt-1">
                Updates from the organizers will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-4 rounded-xl border text-xs ${
                    ann.priority === 'URGENT'
                      ? 'bg-rose-50/60 border-rose-200'
                      : ann.priority === 'IMPORTANT'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-[#F7F5EF]/60 border-[#E5E7EB]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-[#111827] text-sm">
                      {ann.title}
                    </span>
                    <span className="font-mono text-[11px] text-[#667085] shrink-0">
                      {new Date(ann.publishDate || ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[#4B5563] leading-relaxed line-clamp-2">
                    {ann.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};
