import React from 'react';

interface JSOrfaFacilLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  logoUrl?: string | null;
  corPrimaria?: string | null;
  nomeOficina?: string | null;
}

export default function PitTrackLogo({
  size = 'md',
  showSubtitle = true,
  className = '',
  logoUrl = null,
  corPrimaria = '#22c55e',
  nomeOficina = null,
}: JSOrfaFacilLogoProps) {
  const brandColor = corPrimaria || '#22c55e';

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
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
      {/* Ícone / Logotipo Individual da Oficina ou Chaves Mecânicas Cruzadas */}
      <div
        style={{
          backgroundColor: `${brandColor}22`,
          borderColor: `${brandColor}45`,
          color: brandColor,
        }}
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl border shadow-sm flex-shrink-0 overflow-hidden`}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={nomeOficina || 'Logo da Oficina'}
            className="w-full h-full object-contain p-0.5"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: brandColor }}
            className="w-5/6 h-5/6"
          >
            {/* Chave 1 (\) */}
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            {/* Chave 2 (/) */}
            <path d="M9.3 6.3a1 1 0 0 1 0 1.4L7.7 9.3a1 1 0 0 1-1.4 0L2.53 5.53a6 6 0 0 0 7.94 7.94l6.91 6.91a2.12 2.12 0 0 0 3-3l-6.91-6.91a6 6 0 0 0-7.94-7.94l3.77 3.76z" />
          </svg>
        )}
      </div>

      {/* Tipografia da Marca / Oficina */}
      <div className="flex flex-col leading-none min-w-0">
        {nomeOficina ? (
          <>
            <div className={`font-black tracking-tight text-white truncate max-w-[180px] sm:max-w-[230px] ${size === 'sm' ? 'text-sm' : textSizes[size]}`}>
              {nomeOficina.split('-')[0].trim()}
            </div>
            {showSubtitle && (
              <span
                style={{ color: brandColor }}
                className={`font-bold tracking-[0.14em] uppercase mt-0.5 ${subSizes[size]}`}
              >
                JS OrçaFácil • JoeSevero Tech
              </span>
            )}
          </>
        ) : (
          <>
            <div className={`font-black tracking-tight ${textSizes[size]}`}>
              <span style={{ color: brandColor }}>JS </span>
              <span className="text-white">Orça</span>
              <span style={{ color: brandColor }}>Fácil</span>
            </div>
            {showSubtitle && (
              <span
                className={`font-bold tracking-[0.18em] text-[#8b9eb0] uppercase mt-0.5 ${subSizes[size]}`}
              >
                by JoeSevero Tech
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
