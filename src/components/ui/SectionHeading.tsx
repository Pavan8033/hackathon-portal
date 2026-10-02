import React from 'react';
import { cn } from '../../utils/cn';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  titleHighlight?: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  titleHighlight,
  description,
  align = 'center',
  className,
}) => {
  return (
    <div
      className={cn(
        'max-w-3xl mb-12 md:mb-16',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className
      )}
    >
      {eyebrow && (
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="text-[12px] font-bold tracking-widest text-[#164A36] uppercase">
            {eyebrow}
          </span>
        </div>
      )}

      <h2 className="text-3xl sm:text-4xl md:text-[40px] font-bold text-[#111827] tracking-tight leading-[1.15]">
        {title}{' '}
        {titleHighlight && (
          <span className="text-[#164A36]">{titleHighlight}</span>
        )}
      </h2>

      {description && (
        <p className="mt-4 text-base sm:text-lg text-[#667085] leading-relaxed max-w-2xl mx-auto">
          {description}
        </p>
      )}
    </div>
  );
};
