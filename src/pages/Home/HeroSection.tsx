import React from 'react';
import { ArrowRight, LogIn } from 'lucide-react';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';
import { useEvent } from '../../context/EventContext';
import { Button } from '../../components/ui/Button';
import { HeroVisual } from './HeroVisual';

export const HeroSection: React.FC = () => {
  const { hero } = HACKATHON_CONFIG;
  const { eventConfig } = useEvent();

  return (
    <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Optional Event Banner Header (Free Style • Full Image Display) */}
        {eventConfig.eventBanner && (
          <div className="mb-8 rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E5E7EB] bg-white shadow-md p-2 sm:p-3">
            <img
              src={eventConfig.eventBanner}
              alt={eventConfig.eventName || 'Event Banner'}
              className="w-full h-auto max-h-[550px] object-contain rounded-xl block mx-auto"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Hero Content */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Small Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF5F0] border border-[#D5E6DB] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#164A36]" />
              <span className="text-[12px] font-bold tracking-widest text-[#164A36] uppercase font-mono">
                {eventConfig.clubName ? `${eventConfig.clubName} PRESENTS` : hero.eyebrow}
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[62px] font-extrabold text-[#111827] tracking-tight leading-[1.08] font-sans">
              <span className="block">{hero.headingPart1}</span>
              <span className="block">{hero.headingPart2}</span>
              <span className="block text-[#164A36] mt-1">
                {eventConfig.eventName || hero.headingHighlight}
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="mt-6 text-base sm:text-lg md:text-xl text-[#667085] leading-relaxed max-w-xl">
              {hero.supportingText}
            </p>

            {/* Action Buttons */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
              <Button
                to="/participant/problems"
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
                className="font-semibold shadow-sm"
              >
                {hero.primaryCtaText}
              </Button>

              <Button
                to="/login"
                variant="secondary"
                size="lg"
                leftIcon={<LogIn className="w-4 h-4" />}
                className="font-semibold bg-white"
              >
                {hero.secondaryCtaText}
              </Button>
            </div>

            {/* Subtle verification footnote */}
            <div className="mt-8 flex items-center gap-4 text-xs text-[#667085]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#164A36]" />
                Official release channel
              </span>
              <span>•</span>
              <span>1 Selection per team</span>
              <span>•</span>
              <span>Direct faculty access</span>
            </div>
          </div>

          {/* Right Column: Hero Visual */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
};
