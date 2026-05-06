import React from 'react';
import { cn } from '../lib/utils';

export const Logo = ({ className, size = 'md' }: { className?: string, size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizes = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-14'
  };
  
  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  }

  const svgClass = sizes[size];
  const textClass = textSizes[size];

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* SVG Icon part resembling 'la' with a growth arrow */}
      <svg className={svgClass} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 80 C 10 70 10 30 35 25 L 45 45 C 30 45 30 65 40 70 Z" fill="#0A192F" />
        <path d="M45 75 C 65 75 80 50 85 45 L 75 40 L 95 35 L 90 55 L 80 50 C 70 70 50 85 40 85 Z" fill="#22C55E" />
        <circle cx="65" cy="25" r="12" fill="#22C55E" />
        <text x="65" y="30" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">$</text>
        
        {/* Bars */}
        <rect x="52" y="60" width="6" height="10" fill="#22C55E" />
        <rect x="60" y="55" width="6" height="15" fill="#22C55E" />
        <rect x="68" y="45" width="6" height="25" fill="#22C55E" />
      </svg>

      <div className={cn("flex items-baseline font-black tracking-tight mt-1", textClass)}>
        <span className="text-[#0a192f]">loge</span>
        <span className="text-green-600">aci</span>
        <span className="text-[#0a192f] text-[0.6em] relative -top-[0.2em] ml-0.5">.com</span>
      </div>
      <div className="flex items-center text-[#0a192f] mt-[2px] w-full">
        <div className="h-[1px] bg-green-600/50 flex-1"></div>
        <span className="text-[0.35em] uppercase tracking-[0.15em] font-medium px-1.5 whitespace-nowrap">Earn more, live better</span>
        <div className="h-[1px] bg-green-600/50 flex-1"></div>
      </div>
    </div>
  );
};

