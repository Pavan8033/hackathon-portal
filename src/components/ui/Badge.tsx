import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'forest' | 'subtle' | 'neutral' | 'amber' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'subtle',
  size = 'md',
  className,
  icon,
}) => {
  const baseStyles =
    'inline-flex items-center font-medium font-sans rounded-full uppercase tracking-wider select-none';

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
  };

  const variantStyles = {
    forest: 'bg-[#164A36] text-white',
    subtle: 'bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB]',
    neutral: 'bg-white text-[#667085] border border-[#E5E7EB]',
    amber: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
    outline: 'bg-transparent text-[#164A36] border border-[#164A36]',
  };

  return (
    <span
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
