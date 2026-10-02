import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionTo?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionTo,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl bg-white border border-[#E5E7EB] shadow-xs max-w-xl mx-auto',
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-full bg-[#EEF5F0] text-[#164A36] flex items-center justify-center mb-5 ring-8 ring-[#F7F5EF]">
          {icon}
        </div>
      )}

      <h3 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
        {title}
      </h3>

      <p className="mt-2 text-sm sm:text-base text-[#667085] leading-relaxed max-w-md">
        {description}
      </p>

      {actionText && (
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            to={actionTo}
            onClick={onAction}
          >
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
