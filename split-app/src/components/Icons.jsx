// SF Symbols-flavoured glyphs, drawn on a 24 grid with round caps.
const Svg = ({ children, size = 20, className = '', strokeWidth = 2, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    className={`icon ${className}`} aria-hidden="true" focusable="false" {...rest}>
    {children}
  </svg>
);

export const CheckIcon = (p) => <Svg {...p}><path d="M5 12.5l4.2 4.2L19 7" /></Svg>;
export const ChevronRight = (p) => <Svg {...p}><path d="M9.5 5.5L16 12l-6.5 6.5" /></Svg>;
export const ChevronDown = (p) => <Svg {...p}><path d="M6 9.5l6 6 6-6" /></Svg>;
export const CloseIcon = (p) => <Svg {...p}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></Svg>;
export const PlusIcon = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const MinusIcon = (p) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const ArrowUpRight = (p) => <Svg {...p}><path d="M7.5 16.5l9-9M9 7.5h7.5V15" /></Svg>;
export const CopyIcon = (p) => (
  <Svg {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2.6" /><path d="M15.5 8.5V6.6a2.1 2.1 0 0 0-2.1-2.1H6.6a2.1 2.1 0 0 0-2.1 2.1v6.8c0 1.16.94 2.1 2.1 2.1h1.9" /></Svg>
);
export const PencilIcon = (p) => (
  <Svg {...p}><path d="M4.5 19.5h3.8L19 8.8a2.3 2.3 0 0 0-3.3-3.3L5 16.2v3.3z" /><path d="M14.2 7l2.8 2.8" /></Svg>
);
export const WifiOffIcon = (p) => (
  <Svg {...p}><path d="M3 3l18 18M8.5 16.2a5 5 0 0 1 7 0M5.2 12.8a9.6 9.6 0 0 1 4-2.3M12.8 10.2a9.6 9.6 0 0 1 6 2.6M2 9.3a14 14 0 0 1 3.8-2.4M10 5.6A14 14 0 0 1 22 9.3" /><circle cx="12" cy="19.5" r="0.6" fill="currentColor" /></Svg>
);
export const PhotoIcon = (p) => (
  <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 15.5l-4.6-4.6-8.4 8.6" /></Svg>
);
export const StarIcon = (p) => (
  <Svg {...p} stroke="none"><path fill="currentColor" d="M12 3.6l2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.3 7 19l1-5.6-4.1-3.9 5.6-.7z" /></Svg>
);
export const LockIcon = (p) => (
  <Svg {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.6" /><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" /></Svg>
);
export const QrIcon = (p) => (
  <Svg {...p}><rect x="4" y="4" width="6" height="6" rx="1.4" /><rect x="14" y="4" width="6" height="6" rx="1.4" /><rect x="4" y="14" width="6" height="6" rx="1.4" /><path d="M14 14h2.5v2.5H14zM18.5 18.5H20V20h-1.5zM14 19.5h1M19.5 14v1.5" /></Svg>
);
export const BankIcon = (p) => (
  <Svg {...p}><path d="M3.5 9.5L12 4.5l8.5 5M5.5 10v7M10 10v7M14 10v7M18.5 10v7M3.5 19.5h17" /></Svg>
);
export const RefreshIcon = (p) => (
  <Svg {...p}><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" /></Svg>
);
export const UndoIcon = (p) => (
  <Svg {...p}><path d="M9 14.5L4.5 10 9 5.5" /><path d="M4.5 10h10a5 5 0 0 1 0 10H11" /></Svg>
);
