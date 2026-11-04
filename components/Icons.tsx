import type { ReactNode } from "react";

type IconProps = { className?: string };

const svg = (children: ReactNode, className?: string) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className ?? "h-6 w-6"}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const FlameIcon = ({ className }: IconProps) =>
  svg(
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
    className,
  );

export const MapPinIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>,
    className,
  );

export const HomeIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="m3 10.5 9-7 9 7V20a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" />
    </>,
    className,
  );

export const UsersIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>,
    className,
  );

export const TrophyIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
    </>,
    className,
  );

export const UserIcon = ({ className }: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
    </>,
    className,
  );

export const ChevronRightIcon = ({ className }: IconProps) =>
  svg(<path d="m9 18 6-6-6-6" />, className);

export const SnowflakeIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M12 2v20M4.2 6.5l15.6 9M19.8 6.5l-15.6 9" />
      <path d="M9 4l3 3 3-3M9 20l3-3 3 3" />
    </>,
    className,
  );

export const ArrowUpIcon = ({ className }: IconProps) =>
  svg(<path d="M12 19V5M5 12l7-7 7 7" />, className);

export const BellIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>,
    className,
  );

export const CheckIcon = ({ className }: IconProps) =>
  svg(<path d="M20 6 9 17l-5-5" />, className);

export const RotateIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>,
    className,
  );

export const SettingsIcon = ({ className }: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
    className,
  );

export const SunIcon = ({ className }: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>,
    className,
  );

export const MoonIcon = ({ className }: IconProps) =>
  svg(
    <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" />,
    className,
  );

export const MonitorIcon = ({ className }: IconProps) =>
  svg(
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>,
    className,
  );

export const LockIcon = ({ className }: IconProps) =>
  svg(
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>,
    className,
  );

export const GamepadIcon = ({ className }: IconProps) =>
  svg(
    <>
      <rect x="2" y="6" width="20" height="12" rx="6" />
      <path d="M8 9v6M5 12h6" />
      <circle cx="16" cy="11" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </>,
    className,
  );
