import React from 'react';
import { cn } from '../../utils/cn';

interface StepCardProps {
  stepNumber: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  isLast?: boolean;
  className?: string;
}

export const StepCard: React.FC<StepCardProps> = ({
  stepNumber,
  title,
  description,
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative p-7 sm:p-8 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col justify-between h-full group',
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between mb-8">
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#164A36] tracking-tight bg-[#EEF5F0] w-12 h-12 rounded-lg flex items-center justify-center">
            {stepNumber}
          </span>
          {icon && (
            <span className="text-[#667085] group-hover:text-[#164A36] transition-colors duration-200">
              {icon}
            </span>
          )}
        </div>

        <h3 className="text-xl sm:text-[22px] font-bold text-[#111827] tracking-tight uppercase">
          {title}
        </h3>

        <p className="mt-3 text-sm sm:text-[15px] text-[#667085] leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-8 flex items-center gap-2">
        <div className="h-1 w-8 rounded-full bg-[#164A36]/30 group-hover:bg-[#164A36] group-hover:w-12 transition-all duration-200" />
      </div>
    </div>
  );
};
