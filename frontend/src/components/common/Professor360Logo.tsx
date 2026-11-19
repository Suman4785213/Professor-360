import React from 'react';
import logoSrc from '../../assets/professor360_logo.png';

interface Professor360LogoProps {
  /** Size variant or pixel dimension */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Whether to render the 'Professor360' brand text next to the emblem */
  showText?: boolean;
  /** Custom subtitle text below 'Professor360' */
  subtitle?: string;
  /** Additional wrapper CSS classes */
  className?: string;
  /** Image-specific CSS classes */
  imgClassName?: string;
  /** Custom text color (default: slate-900 or white based on dark context) */
  textColor?: string;
  /** Custom subtitle color */
  subtitleColor?: string;
  /** Accessible alt text */
  alt?: string;
}

const sizeMap: Record<string, { img: string; text: string; sub: string }> = {
  xs: { img: 'w-6 h-6', text: 'text-xs', sub: 'text-[9px]' },
  sm: { img: 'w-8 h-8', text: 'text-sm', sub: 'text-[10px]' },
  md: { img: 'w-9 h-9 sm:w-10 sm:h-10', text: 'text-base sm:text-lg', sub: 'text-[10px]' },
  lg: { img: 'w-12 h-12', text: 'text-xl', sub: 'text-xs' },
  xl: { img: 'w-16 h-16', text: 'text-2xl', sub: 'text-sm' },
};

export const Professor360Logo: React.FC<Professor360LogoProps> = ({
  size = 'md',
  showText = false,
  subtitle,
  className = '',
  imgClassName = '',
  textColor = 'text-slate-900',
  subtitleColor = 'text-slate-400',
  alt = 'Professor360 Logo',
}) => {
  const currentSize = typeof size === 'string' ? sizeMap[size] || sizeMap.md : null;
  const customDimensionStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;

  const imageElement = (
    <img
      src={logoSrc}
      alt={alt}
      style={customDimensionStyle}
      className={`object-contain shrink-0 select-none drop-shadow-xs transition-transform duration-200 ${
        currentSize ? currentSize.img : ''
      } ${imgClassName}`}
      loading="eager"
    />
  );

  if (!showText) {
    return imageElement;
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {imageElement}
      <div className="text-left select-none">
        <span
          className={`font-black tracking-tight block leading-none ${
            currentSize ? currentSize.text : 'text-base'
          } ${textColor}`}
        >
          Professor360
        </span>
        {subtitle && (
          <span
            className={`font-medium tracking-wide block mt-0.5 ${
              currentSize ? currentSize.sub : 'text-[10px]'
            } ${subtitleColor}`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default Professor360Logo;
