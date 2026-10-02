import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string; // ISO 8601 string or Date parseable
  label?: string;
  onExpire?: () => void;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  label = 'PROBLEM RELEASE IN',
  onExpire,
  className = '',
}) => {
  const calculateTimeRemaining = (): TimeRemaining => {
    const target = new Date(targetDate).getTime();
    const now = Date.now();
    const difference = target - now;

    if (isNaN(target) || difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
  };

  const [remaining, setRemaining] = useState<TimeRemaining>(calculateTimeRemaining());

  useEffect(() => {
    const timer = setInterval(() => {
      const updated = calculateTimeRemaining();
      setRemaining(updated);

      if (updated.isExpired) {
        clearInterval(timer);
        if (onExpire) {
          onExpire();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (remaining.isExpired) {
    return null;
  }

  const formatUnit = (val: number) => String(val).padStart(2, '0');

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[#164A36] animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#164A36]">
          {label}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
        {/* Days */}
        <div className="p-2 sm:p-3 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
          <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#111827] block">
            {formatUnit(remaining.days)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
            Days
          </span>
        </div>

        {/* Hours */}
        <div className="p-2 sm:p-3 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
          <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#111827] block">
            {formatUnit(remaining.hours)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
            Hours
          </span>
        </div>

        {/* Minutes */}
        <div className="p-2 sm:p-3 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
          <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#111827] block">
            {formatUnit(remaining.minutes)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
            Minutes
          </span>
        </div>

        {/* Seconds */}
        <div className="p-2 sm:p-3 rounded-xl bg-[#F7F5EF] border border-[#E5E7EB]">
          <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#164A36] block">
            {formatUnit(remaining.seconds)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
            Seconds
          </span>
        </div>
      </div>
    </div>
  );
};
