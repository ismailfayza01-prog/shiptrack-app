"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function RegisterPage() {
  const { t } = useI18n();

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h1 className="text-3xl font-semibold text-white">{t("register.title")}</h1>
        <p className="mt-4 text-white/70">{t("register.subtitle")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/admin"
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
          >
            {t("register.adminConsole")}
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
          >
            {t("register.backToPortals")}
          </Link>
        </div>
      </div>
    </div>
  );
}
