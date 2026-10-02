import React from 'react';
import { LogIn, Compass, CheckCircle2 } from 'lucide-react';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { StepCard } from '../../components/cards/StepCard';

export const HowItWorksSection: React.FC = () => {
  const stepIcons = [
    <LogIn key="login" className="w-5 h-5" />,
    <Compass key="explore" className="w-5 h-5" />,
    <CheckCircle2 key="choose" className="w-5 h-5" />,
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-[#F7F5EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Workflow"
          title="HOW IT WORKS"
          description="A transparent, streamlined process designed for participating teams to explore and commit to their innovation track."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {HACKATHON_CONFIG.howItWorksSteps.map((step, index) => (
            <StepCard
              key={step.stepNumber}
              stepNumber={step.stepNumber}
              title={step.title}
              description={step.description}
              icon={stepIcons[index % stepIcons.length]}
              isLast={index === HACKATHON_CONFIG.howItWorksSteps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
