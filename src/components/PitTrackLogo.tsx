import React from 'react';

interface JSOrfaFacilLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export default function PitTrackLogo({
  size = 'md',
  showSubtitle = true,
  className = '',
}: JSOrfaFacilLogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const subSizes = {
    sm: 'text-[8px]',
    md: 'text-[9px]',
    lg: 'text-[11px]',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Ícone de Chaves Mecânicas Cruzadas em Verde Neon */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shadow-sm flex-shrink-0`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5/6 h-5/6 text-emerald-400"
        >
          {/* Chave 1 (\) */}
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          {/* Chave 2 (/) */}
          <path d="M9.3 6.3a1 1 0 0 1 0 1.4L7.7 9.3a1 1 0 0 1-1.4 0L2.53 5.53a6 6 0 0 0 7.94 7.94l6.91 6.91a2.12 2.12 0 0 0 3-3l-6.91-6.91a6 6 0 0 0-7.94-7.94l3.77 3.76z" />
        </svg>
      </div>

      {/* Tipografia da Marca JS OrçaFácil */}
      <div className="flex flex-col leading-none">
        <div className={`font-black tracking-tight ${textSizes[size]}`}>
          <span className="text-emerald-400">JS </span>
          <span className="text-white">Orça</span>
          <span className="text-emerald-400">Fácil</span>
        </div>
        {showSubtitle && (
          <span
            className={`font-bold tracking-[0.22em] text-[#8b9eb0] uppercase mt-0.5 ${subSizes[size]}`}
          >
            Oficinas & Gestão Ágil
          </span>
        )}
      </div>
    </div>
  );
}
