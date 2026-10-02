import React from 'react';
import { Lock, FileText, ArrowRight, ShieldAlert } from 'lucide-react';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const ReleaseBannerSection: React.FC = () => {
  const { releaseBanner } = HACKATHON_CONFIG;

  return (
    <section className="py-16 md:py-24 bg-[#F7F5EF] border-t border-[#E5E7EB]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E5E7EB] p-8 sm:p-12 lg:p-16 shadow-xs">
          {/* Subtle decorative background watermarks */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#EEF5F0] rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#F7F5EF] rounded-full blur-3xl opacity-60 pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-xl">
              {/* Status Badge */}
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="subtle" size="md" icon={<Lock className="w-3.5 h-3.5 text-[#164A36]" />}>
                  Status: {releaseBanner.status}
                </Badge>
                <span className="text-xs text-[#667085] font-mono">
                  {releaseBanner.releaseDateText}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111827] tracking-tight font-sans">
                {releaseBanner.title}
              </h3>

              {/* Description */}
              <p className="mt-3 text-base sm:text-lg text-[#667085] leading-relaxed">
                {releaseBanner.description}
              </p>

              {/* Security & Access note */}
              <div className="mt-6 flex items-center gap-2 text-xs text-[#164A36] font-medium bg-[#EEF5F0] px-3 py-2 rounded-lg border border-[#D5E6DB] w-fit">
                <ShieldAlert className="w-4 h-4 shrink-0 text-[#164A36]" />
                <span>
                  Statements will be unlocked synchronously for all verified teams simultaneously.
                </span>
              </div>
            </div>

            {/* Visual Icon & Actions */}
            <div className="flex flex-col items-start sm:items-center gap-4 shrink-0 w-full sm:w-auto">
              <div className="w-20 h-20 rounded-2xl bg-[#EEF5F0] border border-[#D5E6DB] text-[#164A36] flex items-center justify-center shadow-xs">
                <div className="relative">
                  <FileText className="w-10 h-10 stroke-[1.5]" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#164A36] text-white flex items-center justify-center">
                    <Lock className="w-3 h-3" />
                  </div>
                </div>
              </div>

              <Button
                to="/participant/problems"
                variant="secondary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Preview Challenges Area
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
