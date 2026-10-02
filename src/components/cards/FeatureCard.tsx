import React from 'react';
import { cn } from '../../utils/cn';

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  tag?: string;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  tag,
  className,
}) => {
  return (
    <div
      className={cn(
        'group relative p-7 sm:p-8 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col justify-between h-full',
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          {icon ? (
            <div className="w-12 h-12 rounded-lg bg-[#EEF5F0] text-[#164A36] flex items-center justify-center transition-colors duration-200 group-hover:bg-[#164A36] group-hover:text-white">
              {icon}
            </div>
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-[#164A36]" />
          )}

          {tag && (
            <span className="text-[11px] font-semibold text-[#164A36] uppercase tracking-wider bg-[#EEF5F0] px-2.5 py-0.5 rounded-full">
              {tag}
            </span>
          )}
        </div>

        <h3 className="text-xl sm:text-[22px] font-bold text-[#111827] tracking-tight leading-snug">
          {title}
        </h3>

        <p className="mt-3 text-sm sm:text-[15px] text-[#667085] leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-[#F3F4F6] flex items-center text-xs font-semibold text-[#164A36] group-hover:translate-x-0.5 transition-transform duration-150">
        <span>Verified System Standard</span>
      </div>
    </div>
  );
};
