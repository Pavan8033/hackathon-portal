import React from 'react';
import { ShieldCheck, Users, Award } from 'lucide-react';

export const HeroVisual: React.FC = () => {
  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
      {/* Outer frame with subtle organic architectural contour */}
      <div className="relative rounded-2xl bg-white border border-[#E5E7EB] p-3 sm:p-4 shadow-sm">
        {/* Editorial Canvas Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#F3F4F6] text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#164A36]" />
            <span className="font-semibold text-[#164A36] uppercase tracking-wider text-[11px]">
              National Hackathon Portal
            </span>
          </div>
          <span className="text-[#667085] font-mono text-[11px]">PS-CORE-SYS v1.0</span>
        </div>

        {/* Main visual panel */}
        <div className="relative overflow-hidden rounded-xl bg-[#EEF5F0]/60 p-5 sm:p-7 border border-[#E1ECE4]">
          {/* Subtle architectural background pattern */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#164A36 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />

          {/* Floating Pill: Live Release Notice */}
          <div className="relative inline-flex items-center gap-2 bg-white/95 px-3 py-1.5 rounded-full border border-[#D5E6DB] shadow-xs mb-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#164A36] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#164A36]"></span>
            </span>
            <span className="text-xs font-semibold text-[#164A36]">
              Problem Statement Release Portal
            </span>
          </div>

          {/* Simulated Problem Brief Card */}
          <div className="relative bg-white rounded-lg p-5 border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#EEF5F0] text-[#164A36] font-bold">
                Domain: Smart Healthcare & AI
              </span>
              <span className="text-xs text-[#667085] font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#164A36]" /> Verified Release
              </span>
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight">
                Decentralized Patient Data Verification & Real-time Triage
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-[#667085] leading-relaxed">
                Empowering emergency medical responders with secure low-latency cryptographic telemetry and automated diagnostic assistance.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F3F4F6] text-center">
              <div className="p-2 rounded bg-[#F7F5EF] border border-[#E5E7EB]/60">
                <div className="text-[10px] uppercase font-bold text-[#667085]">Category</div>
                <div className="text-xs font-bold text-[#111827] mt-0.5">Software / AI</div>
              </div>
              <div className="p-2 rounded bg-[#F7F5EF] border border-[#E5E7EB]/60">
                <div className="text-[10px] uppercase font-bold text-[#667085]">Teams Cap</div>
                <div className="text-xs font-bold text-[#111827] mt-0.5">1 per Team</div>
              </div>
              <div className="p-2 rounded bg-[#F7F5EF] border border-[#E5E7EB]/60">
                <div className="text-[10px] uppercase font-bold text-[#164A36]">Evaluation</div>
                <div className="text-xs font-bold text-[#164A36] mt-0.5">3 Rounds</div>
              </div>
            </div>
          </div>

          {/* Collaborative Campus Innovation Metrics Bar */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/90 border border-[#E5E7EB]">
              <div className="w-8 h-8 rounded-md bg-[#EEF5F0] text-[#164A36] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#111827]">University Teams</div>
                <div className="text-[11px] text-[#667085]">Single Selection Lock</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/90 border border-[#E5E7EB]">
              <div className="w-8 h-8 rounded-md bg-[#EEF5F0] text-[#164A36] flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#111827]">Official Review</div>
                <div className="text-[11px] text-[#667085]">Academic Jury Panel</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
