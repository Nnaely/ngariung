"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GamepadIcon, HomeIcon, TrophyIcon, UserIcon, UsersIcon } from "./Icons";

const ITEMS = [
  { href: "/", label: "Absen", Icon: HomeIcon },
  { href: "/feed", label: "Feed", Icon: UsersIcon },
  { href: "/main", label: "Main", Icon: GamepadIcon },
  { href: "/leaderboard", label: "Peringkat", Icon: TrophyIcon },
  { href: "/profile", label: "Profil", Icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
    >
      <div className="mx-auto w-[calc(100%-1.75rem)] max-w-[406px] rounded-[26px] border border-line bg-nav p-1.5 shadow-[0_-10px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <ul className="grid grid-cols-5">
          {ITEMS.map(({ href, label, Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 rounded-[20px] py-2 text-[9.5px] font-medium transition ${
                    active
                      ? "bg-white/[0.07] text-fg"
                      : "text-muted hover:text-fg/80"
                  }`}
                >
                  <Icon
                    className={`h-[21px] w-[21px] ${active ? "text-flame" : ""}`}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
