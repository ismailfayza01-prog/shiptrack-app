'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const Navigation = () => {
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();
  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/track", label: t("nav.track") },
    { href: "/staff", label: t("nav.staff") },
    { href: "/driver", label: t("nav.driver") },
    { href: "/relay", label: t("nav.relay") },
    { href: "/admin", label: t("nav.admin") },
  ];

  return (
    <header className="border-b border-white/10 bg-[#111827]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-semibold tracking-wide">
            ShipTrack
          </Link>
          <span className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-xs font-semibold uppercase text-emerald-300">
            {t("nav.mvp")}
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-3 text-sm text-white/80">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 transition ${
                pathname === link.href
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#0f172a] p-1 text-xs text-white/70">
            <button
              type="button"
              onClick={() => setLocale("fr")}
              className={`rounded-full px-2 py-1 transition ${
                locale === "fr" ? "bg-emerald-500/20 text-emerald-200" : "text-white/60"
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLocale("ar")}
              className={`rounded-full px-2 py-1 transition ${
                locale === "ar" ? "bg-emerald-500/20 text-emerald-200" : "text-white/60"
              }`}
            >
              AR
            </button>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
          >
            {t("nav.portal")}
          </Link>
          <Link
            href="/staff"
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
          >
            {t("nav.staffAccess")}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
