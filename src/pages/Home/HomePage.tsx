import React from 'react';
import { HeroSection } from './HeroSection';
import { StatsSection } from './StatsSection';
import { HowItWorksSection } from './HowItWorksSection';
import { WhyPortalSection } from './WhyPortalSection';
import { ReleaseBannerSection } from './ReleaseBannerSection';

export const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <WhyPortalSection />
      <ReleaseBannerSection />
    </div>
  );
};
