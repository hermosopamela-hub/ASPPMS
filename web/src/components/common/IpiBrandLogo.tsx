import React from 'react';

export interface IpiBrandLogoProps {
  variant?: 'full' | 'header' | 'mark' | 'login';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  theme?: 'light' | 'dark' | 'on-dark';
}

export const IpiBrandLogo: React.FC<IpiBrandLogoProps> = ({
  variant = 'header',
  size = 'md',
  showTagline = true,
  className = '',
  theme = 'light'
}) => {
  const isDark = theme === 'dark' || theme === 'on-dark';
  const navyColor = isDark ? '#FFFFFF' : '#002F87';
  const greenColor = '#44B330';
  const taglineColor = isDark ? '#93C5FD' : '#002F87';

  if (variant === 'mark') {
    const sizeClasses = {
      sm: 'w-7 h-7',
      md: 'w-9 h-9',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16'
    }[size];

    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${sizeClasses} ${className}`} title="IPI - International Pharmaceuticals, Inc.">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xs" aria-label="IPI Logo Mark">
          {/* Left Green Leaf */}
          <polygon points="20,18 95,80 95,156 20,94" fill={greenColor} />
          {/* Right Green Leaf */}
          <polygon points="105,80 180,18 180,94 105,156" fill={greenColor} />
          {/* Left Navy Base */}
          <path d="M 20,110 L 95,172 V 186 H 36 A 16,16 0 0 1 20,170 Z" fill={navyColor} />
          {/* Right Navy Base */}
          <path d="M 105,172 L 180,110 V 170 A 16,16 0 0 1 164,186 H 105 Z" fill={navyColor} />
        </svg>
      </div>
    );
  }

  if (variant === 'login' || variant === 'full') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        {/* Emblem + IPI Wordmark */}
        <div className="flex items-center gap-3.5">
          {/* Emblem */}
          <div className="w-12 h-12 shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xs" aria-hidden="true">
              <polygon points="20,18 95,80 95,156 20,94" fill={greenColor} />
              <polygon points="105,80 180,18 180,94 105,156" fill={greenColor} />
              <path d="M 20,110 L 95,172 V 186 H 36 A 16,16 0 0 1 20,170 Z" fill={navyColor} />
              <path d="M 105,172 L 180,110 V 170 A 16,16 0 0 1 164,186 H 105 Z" fill={navyColor} />
            </svg>
          </div>

          {/* IPI Wordmark */}
          <div className="flex items-center gap-2">
            <span 
              className="text-4xl font-extrabold tracking-tight select-none font-sans"
              style={{ color: navyColor }}
            >
              IPI
            </span>
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
            <div className="flex flex-col text-left">
              <span 
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: navyColor }}
              >
                International Pharmaceuticals, Inc.
              </span>
              <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Supplier & Price Intelligence Portal
              </span>
            </div>
          </div>
        </div>

        {/* Tagline: Your Wellness. Our Passion. */}
        {showTagline && (
          <div 
            className="mt-2 text-xs font-semibold italic tracking-wide"
            style={{ 
              color: taglineColor,
              fontFamily: "'Times New Roman', Georgia, serif" 
            }}
          >
            Your Wellness. Our Passion.
          </div>
        )}
      </div>
    );
  }

  // variant === 'header'
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 shrink-0 ${className}`}>
      {/* Official IPI Emblem */}
      <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xs" aria-hidden="true">
          <polygon points="20,18 95,80 95,156 20,94" fill={greenColor} />
          <polygon points="105,80 180,18 180,94 105,156" fill={greenColor} />
          <path d="M 20,110 L 95,172 V 186 H 36 A 16,16 0 0 1 20,170 Z" fill={navyColor} />
          <path d="M 105,172 L 180,110 V 170 A 16,16 0 0 1 164,186 H 105 Z" fill={navyColor} />
        </svg>
      </div>

      {/* IPI Wordmark & Login Format Lockup */}
      <div className="flex items-center gap-2">
        <span 
          className="text-2xl sm:text-3xl font-black tracking-tight select-none font-sans leading-none"
          style={{ color: navyColor }}
        >
          IPI
        </span>

        {/* Vertical Brand Separator */}
        <div className="h-7 sm:h-8 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Company Name & Portal Subtitle matching login page */}
        <div className="flex flex-col text-left justify-center">
          <span 
            className="text-[11px] sm:text-xs font-bold tracking-wider uppercase select-none leading-tight whitespace-nowrap"
            style={{ color: navyColor }}
          >
            International Pharmaceuticals, Inc.
          </span>
          <span className={`text-[10px] sm:text-[11px] font-medium select-none leading-tight whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Supplier & Price Intelligence Portal
          </span>
        </div>
      </div>
    </div>
  );
};
