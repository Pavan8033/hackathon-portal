import React from 'react';
import { Link } from 'react-router-dom';
import { HACKATHON_CONFIG } from '../../config/hackathon.config';
import { useEvent } from '../../context/EventContext';
import { cn } from '../../utils/cn';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitle?: string;
  asLink?: boolean;
  to?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className,
  size = 'md',
  showSubtitle = false,
  subtitle = 'Problem Statement Portal',
  asLink = true,
  to = '/',
}) => {
  const { eventConfig } = useEvent();

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base tracking-tight',
    md: 'text-lg tracking-tight',
    lg: 'text-2xl tracking-tight',
  };

  const displayName = eventConfig.eventName || HACKATHON_CONFIG.hackathonName;
  const displaySubtitle = eventConfig.clubName || subtitle;

  const content = (
    <div className={cn('inline-flex items-center gap-2.5 select-none group', className)}>
      {/* Club Logo or Brand Symbol */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-lg bg-[#164A36] text-[#EEF5F0] shadow-sm transition-transform duration-200 group-hover:scale-[1.02] overflow-hidden',
          iconSizes[size]
        )}
      >
        {eventConfig.clubLogo ? (
          <img
            src={eventConfig.clubLogo}
            alt={eventConfig.clubName || 'Club Logo'}
            className="w-full h-full object-contain p-0.5 bg-white"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4/5 h-4/5"
            aria-hidden="true"
          >
            {/* Outer organic leaf/innovation flame contour */}
            <path
              d="M12 3C12 3 18.5 7.5 18.5 13C18.5 16.5899 15.5899 19.5 12 19.5C8.41015 19.5 5.5 16.5899 5.5 13C5.5 8.5 9 5.5 12 3Z"
              fill="currentColor"
              fillOpacity="0.25"
            />
            {/* Inner focus spark flame */}
            <path
              d="M12 6.5C12 6.5 15.5 9.8 15.5 13.5C15.5 15.433 13.933 17 12 17C10.067 17 8.5 15.433 8.5 13.5C8.5 11 10.2 9 12 6.5Z"
              fill="#FFFFFF"
            />
          </svg>
        )}
      </div>

      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'font-bold text-[#111827] font-sans tracking-wide uppercase',
            textSizes[size]
          )}
        >
          {displayName}
        </span>
        {showSubtitle && (
          <span className="text-[11px] font-medium text-[#667085] mt-0.5 tracking-normal">
            {displaySubtitle}
          </span>
        )}
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link
        to={to}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#164A36] focus-visible:ring-offset-2 rounded"
        aria-label={`${HACKATHON_CONFIG.hackathonName} Home`}
      >
        {content}
      </Link>
    );
  }

  return content;
};
