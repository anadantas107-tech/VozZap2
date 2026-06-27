// ============================================================
// VozZap - Button Component
// ============================================================

import React from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vz-primary disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 min-h-[44px]';

  const variants = {
    primary: 'bg-vz-primary text-white hover:bg-vz-primary/90 shadow-lg shadow-vz-primary/30',
    secondary: 'bg-vz-secondary text-white hover:bg-vz-secondary/90',
    ghost: 'bg-transparent text-vz-primary hover:bg-vz-primary/10',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border-2 border-vz-primary text-vz-primary hover:bg-vz-primary/10',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg',
    icon: 'w-11 h-11 p-0',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {children}
        </span>
      ) : children}
    </button>
  );
};
