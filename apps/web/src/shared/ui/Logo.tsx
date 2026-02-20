/** Логотип: посылка + стрелка роста — e‑commerce, маркетплейсы */
export function Logo({
  className = '',
  showText = true,
  size = 'md',
}: {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconSizes = { sm: 24, md: 28, lg: 36 };
  const iconSize = iconSizes[size];
  const textSizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' };

  return (
    <span
      className={`inline-flex items-center gap-2.5 font-logo font-semibold text-primary ${className}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden
      >
        {/* Посылка — грани */}
        <path
          d="M6 12v12l12 6 12-6V12L18 6 6 12Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
        {/* Центральный шов */}
        <path
          d="M6 12l12 6 12-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary/70"
        />
        {/* Стрелка вверх — рост продаж */}
        <path
          d="M18 10l4 5h-3v5h-2v-5h-3l4-5Z"
          fill="currentColor"
          className="text-primary"
        />
      </svg>
      {showText && (
        <span className={`${textSizes[size]} tracking-tight text-primary`}>
          Seller
        </span>
      )}
    </span>
  );
}
