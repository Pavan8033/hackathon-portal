import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  to?: string;
  isExternal?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      to,
      isExternal = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium font-sans transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#164A36] focus-visible:ring-offset-2 select-none active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

    const sizeStyles = {
      sm: 'text-xs px-3.5 py-1.5 rounded-md gap-1.5 h-8',
      md: 'text-sm px-5 py-2.5 rounded-lg gap-2 h-10',
      lg: 'text-base px-6 py-3 rounded-lg gap-2.5 h-12',
    };

    const variantStyles = {
      primary:
        'bg-[#164A36] text-white hover:bg-[#0E3324] shadow-sm hover:shadow active:bg-[#092218]',
      secondary:
        'bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#EEF5F0] hover:text-[#164A36] hover:border-[#CBD5E1]',
      outline:
        'bg-transparent text-[#164A36] border border-[#164A36] hover:bg-[#164A36] hover:text-white',
      ghost:
        'bg-transparent text-[#111827] hover:bg-[#EEF5F0] hover:text-[#164A36]',
    };

    const combinedClassName = cn(
      baseStyles,
      sizeStyles[size],
      variantStyles[variant],
      fullWidth ? 'w-full' : '',
      className
    );

    if (to) {
      if (isExternal) {
        return (
          <a
            href={to}
            target="_blank"
            rel="noopener noreferrer"
            className={combinedClassName}
          >
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </a>
        );
      }

      return (
        <Link to={to} className={combinedClassName}>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={combinedClassName}
        {...props}
      >
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
