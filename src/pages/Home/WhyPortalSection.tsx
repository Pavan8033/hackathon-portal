import React from 'react';
import { FileCheck, ShieldCheck, Target } from 'lucide-react';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { FeatureCard } from '../../components/cards/FeatureCard';

export const WhyPortalSection: React.FC = () => {
  const iconMap: Record<string, React.ReactNode> = {
    'official-statements': <FileCheck className="w-6 h-6" />,
    'team-access': <ShieldCheck className="w-6 h-6" />,
    'one-challenge': <Target className="w-6 h-6" />,
  };

  const tagMap: Record<string, string> = {
    'official-statements': 'Organizers',
    'team-access': 'Security',
    'one-challenge': 'Focus',
  };

  return (
    <section className="py-16 md:py-24 bg-white border-t border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Platform Purpose"
          title="One Portal."
          titleHighlight="Every Challenge."
          description="Built specifically to ensure fair problem discovery, authenticated access, and integrity during team problem selection."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {HACKATHON_CONFIG.whyPortalFeatures.map((feature) => (
            <FeatureCard
              key={feature.id}
              title={feature.title}
              description={feature.description}
              icon={iconMap[feature.id]}
              tag={tagMap[feature.id]}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
