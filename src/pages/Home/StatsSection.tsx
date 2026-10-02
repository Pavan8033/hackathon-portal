import React from 'react';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';
import { StatCard } from '../../components/cards/StatCard';

export const StatsSection: React.FC = () => {
  return (
    <section className="py-8 border-y border-[#E5E7EB] bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {HACKATHON_CONFIG.statistics.map((stat) => (
            <StatCard
              key={stat.id}
              value={stat.value}
              label={stat.label}
              description={stat.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
