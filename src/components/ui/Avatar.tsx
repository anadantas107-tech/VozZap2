// ============================================================
// VozZap - Avatar Component
// ============================================================

import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold cursor-pointer',
        'bg-gradient-to-br from-vz-primary to-vz-secondary text-white',
        sizeMap[size],
        className
      )}
      onClick={onClick}
      aria-label={`Avatar de ${name}`}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
