import React from 'react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  value: string;
  label: string;
  description?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  description,
  className,
}) => {
  return (
    <div
      className={cn(
        'group p-6 sm:p-7 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col',
        className
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#164A36] tracking-tight font-sans leading-none">
          {value}
        </span>
      </div>

      <h3 className="mt-3 text-base sm:text-lg font-bold text-[#111827] tracking-tight">
        {label}
      </h3>

      {description && (
        <p className="mt-1 text-xs sm:text-sm text-[#667085] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};
