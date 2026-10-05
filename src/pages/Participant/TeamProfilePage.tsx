import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { AuthService } from '../../services/authService';
import { TeamService } from '../../services/teamService';
import type { TeamRecord } from '../../types';

export const TeamProfilePage: React.FC = () => {
  const { team } = useAuth();
  const { eventConfig } = useEvent();
  const [teamDetails, setTeamDetails] = useState<TeamRecord | null>(team || null);

  useEffect(() => {
    const loadProfile = async () => {
      if (team?.teamId) {
        const full = await TeamService.getTeamById(team.teamId);
        // Compare login username with imported participant roster team id
        if (full && TeamService.normalizeId(full.teamId) === TeamService.normalizeId(team.teamId)) {
          setTeamDetails(full);
          AuthService.updateCurrentSessionTeam(full);
        }
      }
    };
    loadProfile();
  }, [team?.teamId]);

  // Defensive merge of session team and fetched roster record to ensure rich details are never empty
  const rawDetails = teamDetails || ({} as Partial<TeamRecord>);
  const rawSession = team || ({} as Partial<TeamRecord>);
  const teamId = (rawDetails.teamId || rawSession.teamId || '').trim();

  // Combine and clean all team members
  const memberList = (() => {
    const list1 = (rawDetails.teamMembers || []).filter(
      (m) =>
        m &&
        m.trim().toLowerCase() !== 'team lead' &&
        m.trim().toLowerCase() !== 'leader' &&
        m.trim().toLowerCase() !== 'participant institution' &&
        m.trim().toLowerCase() !== 'members' &&
        m.trim() !== ''
    );
    const list2 = (rawSession.teamMembers || []).filter(
      (m) =>
        m &&
        m.trim().toLowerCase() !== 'team lead' &&
        m.trim().toLowerCase() !== 'leader' &&
        m.trim().toLowerCase() !== 'participant institution' &&
        m.trim().toLowerCase() !== 'members' &&
        m.trim() !== ''
    );
    return list1.length >= list2.length && list1.length > 0 ? list1 : list2.length > 0 ? list2 : list1;
  })();

  const rawTeamName = (rawDetails.teamName || rawSession.teamName || '').trim();
  const isGeneric = TeamService.isGenericTeamName(rawTeamName, teamId);
  const teamName = isGeneric ? (teamId ? `Team ${teamId}` : 'Team') : rawTeamName;

  const rawLead = (rawDetails.teamLeadName || rawSession.teamLeadName || '').trim();
  const isLeadPlaceholder =
    !rawLead ||
    rawLead.toLowerCase() === 'team lead' ||
    rawLead.toLowerCase() === 'leader' ||
    rawLead.toLowerCase() === 'team lead name' ||
    rawLead.toLowerCase() === rawTeamName.toLowerCase() ||
    rawLead.toLowerCase() === teamId.toLowerCase();
  const teamLead = isLeadPlaceholder ? (memberList[0] || '—') : rawLead;

  // Ensure teamLead is included in displayMembers
  const displayMembers = (() => {
    const mems = [...memberList];
    if (teamLead && teamLead !== '—' && !mems.some((m) => m.toLowerCase() === teamLead.toLowerCase())) {
      mems.unshift(teamLead);
    }
    return mems.length > 0 ? mems : teamLead && teamLead !== '—' ? [teamLead] : [];
  })();

  const rawCollege = (rawDetails.college || rawSession.college || '').trim();
  const isCollegePlaceholder =
    !rawCollege || rawCollege.toLowerCase() === 'participant institution';
  const college = isCollegePlaceholder ? '' : rawCollege;

  const currentTeam: TeamRecord = {
    teamId,
    teamName,
    teamLeadName: teamLead === '—' ? '' : teamLead,
    teamLeadRegistrationNumber: rawDetails.teamLeadRegistrationNumber || rawSession.teamLeadRegistrationNumber || '',
    credentialHash: rawDetails.credentialHash || rawSession.credentialHash || '',
    teamMembers: displayMembers,
    college,
    email: rawDetails.email || rawSession.email || '',
    phone: rawDetails.phone || rawSession.phone || '',
    selectedProblemId: rawDetails.selectedProblemId || rawSession.selectedProblemId,
    selectedProblemTitle: rawDetails.selectedProblemTitle || rawSession.selectedProblemTitle,
    selectionDate: rawDetails.selectionDate || rawSession.selectionDate,
    status: (rawDetails.status || rawSession.status || 'active') as any,
    createdAt: rawDetails.createdAt || rawSession.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

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
            <span className="font-semibold text-[#111827]">Team Information</span>
          </div>
        </div>

        {/* Section 13: TEAM INFORMATION Header Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 sm:p-10 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB] flex items-center justify-center font-bold text-xl font-mono shrink-0">
                {teamName ? teamName.slice(0, 2).toUpperCase() : 'TM'}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Official Roster Record
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight uppercase mt-0.5">
                  TEAM INFORMATION
                </h1>
                <p className="text-xs text-[#667085] mt-1">
                  Verified credentials and participant allocation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={currentTeam?.status === 'active' ? 'forest' : 'amber'} size="md">
                {currentTeam?.status === 'active' ? 'ACTIVE & VERIFIED' : 'PENDING'}
              </Badge>
            </div>
          </div>

          {/* Section 13 Fields Grid: Team Name, Team ID, Team Lead, Institution, Email, Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {/* Team Name */}
            <div className="p-4 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Team Name
              </span>
              <span className="text-base font-bold text-[#111827] mt-1 block truncate">
                {teamName}
              </span>
            </div>

            {/* Team ID */}
            <div className="p-4 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Team ID
              </span>
              <span className="font-mono text-base font-bold text-[#164A36] mt-1 block">
                {teamId || '—'}
              </span>
            </div>

            {/* Team Lead */}
            <div className="p-4 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Team Lead
              </span>
              <span className="text-base font-bold text-[#111827] mt-1 block truncate">
                {teamLead}
              </span>
            </div>

            {/* Institution / College */}
            <div className="p-4 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Institution
              </span>
              <span className="text-sm font-semibold text-[#111827] mt-1 block truncate">
                {college || '—'}
              </span>
            </div>

            {/* Email */}
            <div className="p-4 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Official Email
              </span>
              <span className="text-xs font-medium text-[#111827] mt-1.5 block truncate flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#667085] shrink-0" />
                <span>{currentTeam?.email || '—'}</span>
              </span>
            </div>

            {/* Phone */}
            <div className="p-4 rounded-xl bg-[#F7F5EF]/70 border border-[#E5E7EB]">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Contact Phone
              </span>
              <span className="text-xs font-medium text-[#111827] mt-1.5 block flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#667085] shrink-0" />
                <span>{currentTeam?.phone || '—'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Team Members Roster */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-xs mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6] mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                Registered Participants
              </span>
              <h2 className="text-lg font-bold text-[#111827]">
                Team Members ({displayMembers.length})
              </h2>
            </div>
            <Users className="w-5 h-5 text-[#667085]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayMembers.length > 0 ? (
              displayMembers.map((member, index) => {
                const isLead = !isLeadPlaceholder && member.trim().toLowerCase() === teamLead.trim().toLowerCase();
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                      isLead
                        ? 'bg-[#EEF5F0] border-[#D5E6DB]'
                        : 'bg-[#F7F5EF]/60 border-[#E5E7EB]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isLead
                            ? 'bg-[#164A36] text-white'
                            : 'bg-white text-[#4B5563] border border-[#E5E7EB]'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#111827]">
                          {member}
                        </div>
                        <div className="text-[11px] text-[#667085]">
                          {isLead ? 'Team Leader / Primary Contact' : `Team Member ${index + 1}`}
                        </div>
                      </div>
                    </div>

                    {isLead && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#164A36] bg-white px-2 py-0.5 rounded border border-[#D5E6DB]">
                        Lead
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[#667085]">No members registered.</p>
            )}
          </div>
        </div>

        {/* Current Problem Commitment Status Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
              Challenge Status
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#111827]">
              {currentTeam?.selectedProblemId ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#164A36]" />
                  <span>Committed to {currentTeam.selectedProblemId}: {currentTeam.selectedProblemTitle}</span>
                </span>
              ) : (
                'No official problem statement locked yet.'
              )}
            </h3>
            <p className="text-xs text-[#667085]">
              {currentTeam?.selectedProblemId
                ? 'Your selection is locked and confirmed by the hackathon system.'
                : 'Explore released challenges to commit to your team challenge.'}
            </p>
          </div>

          <div className="shrink-0">
            {currentTeam?.selectedProblemId ? (
              <Button
                to="/participant/selected-problem"
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
              >
                View Selected Problem
              </Button>
            ) : (
              <Button
                to="/participant/problems"
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
              >
                Explore Problems
              </Button>
            )}
          </div>
        </div>

        {/* Security & Credentials Notice */}
        <div className="p-6 rounded-2xl bg-[#EEF5F0]/70 border border-[#D5E6DB] flex items-center gap-3.5">
          <KeyRound className="w-5 h-5 text-[#164A36] shrink-0" />
          <div className="text-xs text-[#374151] leading-relaxed">
            <span className="font-bold text-[#111827]">Registration Number Confidentiality:</span>{' '}
            Your registration number serves as your portal password. For security, it is stored as a cryptographic SHA-256 hash and masked on participant interfaces.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
