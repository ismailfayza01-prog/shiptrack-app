'use client';

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { dictionary, t } = useI18n();
  const features = dictionary.home.features;
  const zones = dictionary.home.zones;

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0f172a] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.4em] text-emerald-300">
              {t("home.badge")}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-5xl">
              {t("home.title")}
            </h1>
            <p className="mt-6 text-lg text-white/70">
              {t("home.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/track"
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                {t("home.trackCta")}
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-white/50 hover:text-white"
              >
                {t("home.pricingCta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#111827] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-semibold text-white">{t("home.whyTitle")}</h2>
          <p className="mt-3 text-white/60">
            {t("home.whySubtitle")}
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-[#1f2937] p-6 shadow-lg shadow-black/20"
              >
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm text-white/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0f172a] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl border border-white/10 bg-[#1f2937] p-8 shadow-lg shadow-black/30">
            <h2 className="text-2xl font-semibold text-white">{t("home.zonesTitle")}</h2>
            <p className="mt-3 text-white/60">
              {t("home.zonesSubtitle")}
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {zones.map((zone) => (
                <div
                  key={zone}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white/80"
                >
                  <span>{zone}</span>
                  <span className="text-emerald-300">{t("home.zoneActive")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#111827] py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-semibold text-white">{t("home.readyTitle")}</h2>
          <p className="mt-4 text-white/70">
            {t("home.readySubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/staff"
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              {t("home.staffPortal")}
            </Link>
            <Link
              href="/track"
              className="rounded-full border border-amber-400/40 px-6 py-3 text-sm font-semibold text-amber-200 transition hover:border-amber-300 hover:text-amber-100"
            >
              {t("home.trackOrder")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
