"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const portals = [
    {
      title: t("login.staffTitle"),
      description: t("login.staffDesc"),
      href: "/staff",
    },
    {
      title: t("login.adminTitle"),
      description: t("login.adminDesc"),
      href: "/admin",
    },
    {
      title: t("login.driverTitle"),
      description: t("login.driverDesc"),
      href: "/driver",
    },
    {
      title: t("login.relayTitle"),
      description: t("login.relayDesc"),
      href: "/relay",
    },
  ];

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-6">
        <h1 className="text-3xl font-semibold text-white">{t("login.title")}</h1>
        <p className="mt-3 text-white/70">{t("login.subtitle")}</p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {portals.map((portal) => (
            <div
              key={portal.href}
              className="rounded-2xl border border-white/10 bg-[#1f2937] p-6 shadow-lg shadow-black/20"
            >
              <h2 className="text-xl font-semibold text-white">{portal.title}</h2>
              <p className="mt-3 text-sm text-white/70">{portal.description}</p>
              <Link
                href={portal.href}
                className="mt-6 inline-flex rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                {t("login.enter")}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
