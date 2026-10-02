import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Users,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';

export const GuidelinesPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Breadcrumb */}
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
            <span className="font-semibold text-[#111827]">Guidelines</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 sm:p-12 shadow-xs mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF5F0] border border-[#D5E6DB] text-xs font-mono font-bold text-[#164A36] uppercase mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Official Participant Codex
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight uppercase">
            HACKATHON GUIDELINES & RULES
          </h1>

          <p className="mt-3 text-base text-[#4B5563] max-w-2xl leading-relaxed">
            Essential directives, evaluation frameworks, intellectual property integrity, and submission requirements for all participating teams.
          </p>
        </div>

        {/* Guideline Sections */}
        <div className="space-y-6">
          {/* Section 1: Problem Statement Protocol */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F3F4F6]">
              <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Stage 1 Protocol
                </span>
                <h2 className="text-lg font-bold text-[#111827]">
                  1. Problem Statements & Document Access
                </h2>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-[#374151] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#164A36] shrink-0 mt-0.5" />
                <span>
                  <strong>Official Release:</strong> All challenges available on this portal are vetted and published by the Organizing Committee. Only <em>Published</em> problem statements are accessible to participants.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#164A36] shrink-0 mt-0.5" />
                <span>
                  <strong>Specification Documents:</strong> Detailed briefs, datasets, and spreadsheets (PDF, DOCX, XLSX) can be previewed and downloaded directly through the problem detail page.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#164A36] shrink-0 mt-0.5" />
                <span>
                  <strong>One Challenge per Team:</strong> In the upcoming final selection phase, each registered team will lock onto exactly one problem statement to solve and defend.
                </span>
              </li>
            </ul>
          </div>

          {/* Section 2: Team Roster & Eligibility */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F3F4F6]">
              <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Roster Standards
                </span>
                <h2 className="text-lg font-bold text-[#111827]">
                  2. Team Composition & Credentials
                </h2>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-[#374151] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#164A36] shrink-0 mt-0.5" />
                <span>
                  <strong>Team Size:</strong> Teams must consist of 2 to 4 registered members as indicated in your official registration profile.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#164A36] shrink-0 mt-0.5" />
                <span>
                  <strong>Credential Integrity:</strong> Keep your Team Name and Team Lead Registration Number confidential. Sharing credentials outside your roster is strictly prohibited.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#164A36] shrink-0 mt-0.5" />
                <span>
                  <strong>Single Affiliation:</strong> A participant may not belong to more than one team concurrently.
                </span>
              </li>
            </ul>
          </div>

          {/* Section 3: Evaluation Criteria */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F3F4F6]">
              <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Scoring Rubric
                </span>
                <h2 className="text-lg font-bold text-[#111827]">
                  3. Standard Evaluation Rubric
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#F7F5EF]/80 border border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#111827] text-sm">Innovation & Novelty</span>
                  <span className="font-mono text-xs font-bold text-[#164A36] bg-[#EEF5F0] px-2 py-0.5 rounded border border-[#D5E6DB]">
                    30%
                  </span>
                </div>
                <p className="text-xs text-[#667085]">
                  Originality of technical approach, creative problem framing, and differentiation from existing off-the-shelf software.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F5EF]/80 border border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#111827] text-sm">Technical Execution</span>
                  <span className="font-mono text-xs font-bold text-[#164A36] bg-[#EEF5F0] px-2 py-0.5 rounded border border-[#D5E6DB]">
                    30%
                  </span>
                </div>
                <p className="text-xs text-[#667085]">
                  Code quality, architecture robustness, latency benchmarks, edge constraints compliance, and working functional prototype.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F5EF]/80 border border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#111827] text-sm">Impact & Scalability</span>
                  <span className="font-mono text-xs font-bold text-[#164A36] bg-[#EEF5F0] px-2 py-0.5 rounded border border-[#D5E6DB]">
                    25%
                  </span>
                </div>
                <p className="text-xs text-[#667085]">
                  Real-world deployment viability, resource efficiency, target user benefits, and alignment with challenge objectives.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F5EF]/80 border border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#111827] text-sm">Presentation & Defensibility</span>
                  <span className="font-mono text-xs font-bold text-[#164A36] bg-[#EEF5F0] px-2 py-0.5 rounded border border-[#D5E6DB]">
                    15%
                  </span>
                </div>
                <p className="text-xs text-[#667085]">
                  Clarity of live demonstration, documentation quality, and team defense during judge evaluation rounds.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Academic Integrity */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F3F4F6]">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Honor Code
                </span>
                <h2 className="text-lg font-bold text-[#111827]">
                  4. Academic & Code Integrity
                </h2>
              </div>
            </div>

            <p className="text-sm text-[#374151] leading-relaxed">
              All project source code developed during the hackathon must be authored by the registered team. Open source frameworks and libraries are welcomed with proper attribution. Any team discovered plagiarizing existing repositories without substantial innovation will face immediate disqualification.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-[#164A36] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">
              Ready to explore published challenges?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90">
              Browse official problem statements, inspect technical specs, and download attachments.
            </p>
          </div>

          <Button
            to="/participant/problems"
            variant="secondary"
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
            className="bg-white text-[#164A36] hover:bg-[#F7F5EF] font-bold shadow-xs shrink-0"
          >
            EXPLORE PROBLEMS →
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};
