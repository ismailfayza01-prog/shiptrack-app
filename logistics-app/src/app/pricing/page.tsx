"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  HOME_DELIVERY_FEE,
  MINIMUM_WEIGHT_KG,
  PRICING_TIERS,
} from "@/lib/constants";
import { calculatePrice } from "@/lib/pricing";
import { useI18n } from "@/lib/i18n";
import type { PricingTier, ServiceLevel } from "@/lib/types";

const tierKeys = Object.keys(PRICING_TIERS) as PricingTier[];

export default function PricingPage() {
  const { t } = useI18n();
  const [weightKg, setWeightKg] = useState(20);
  const [tier, setTier] = useState<PricingTier>("B2C");
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("STANDARD");
  const [homeDelivery, setHomeDelivery] = useState(false);

  const pricing = useMemo(() => {
    return calculatePrice({
      weightKg,
      pricingTier: tier,
      hasHomeDelivery: homeDelivery,
      serviceLevel,
    });
  }, [weightKg, tier, homeDelivery, serviceLevel]);

  return (
    <div>
      <section className="border-b border-white/10 bg-[#1f2937] py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-3xl font-semibold text-white">{t("pricing.title")}</h1>
          <p className="mt-3 max-w-2xl text-white/70">{t("pricing.subtitle")}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-[#0f172a] p-6 text-white shadow-lg">
            <h2 className="text-lg font-semibold">{t("pricing.noteTitle")}</h2>
            <p className="mt-2 text-sm text-white/70">
              {t("pricing.noteBody", { minWeight: MINIMUM_WEIGHT_KG })}
            </p>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-4">
            {tierKeys.map((tierKey) => {
              const tierConfig = PRICING_TIERS[tierKey];
              return (
                <div
                  key={tierKey}
                  className="rounded-2xl border border-white/10 bg-[#1f2937] p-6 shadow-lg shadow-black/30"
                >
                  <h3 className="text-lg font-semibold text-white">{tierConfig.label}</h3>
                  <p className="mt-4 text-3xl font-semibold text-emerald-300">
                    MAD {tierConfig.ratePerKg.toFixed(2)}
                    <span className="text-sm font-normal text-white/60">/kg</span>
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    {t("pricing.tierMinimum", {
                      minWeight: MINIMUM_WEIGHT_KG,
                      audience:
                        tierKey === "B2C"
                          ? t("pricing.audienceIndividual")
                          : t("pricing.audienceBusiness"),
                    })}
                  </p>
                  <Link
                    href="/staff"
                    className="mt-6 inline-flex rounded-full border border-emerald-500/40 px-4 py-2 text-sm text-emerald-200 transition hover:border-emerald-400 hover:text-emerald-100"
                  >
                    {t("pricing.getStarted")}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#0f172a] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-semibold text-white">{t("pricing.calculatorTitle")}</h2>
          <p className="mt-2 text-white/70">{t("pricing.calculatorSubtitle")}</p>

          <div className="mt-8 grid gap-8 rounded-3xl border border-white/10 bg-[#1f2937] p-8 shadow-lg md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-5">
              <div>
                <label className="text-sm text-white/70">{t("pricing.weightLabel")}</label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={weightKg}
                  onChange={(event) => setWeightKg(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white shadow-inner focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-white/70">{t("pricing.pricingTierLabel")}</label>
                <select
                  value={tier}
                  onChange={(event) => setTier(event.target.value as PricingTier)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white focus:border-emerald-400 focus:outline-none"
                >
                  {tierKeys.map((key) => (
                    <option key={key} value={key}>
                      {PRICING_TIERS[key].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70">{t("pricing.serviceLevelLabel")}</label>
                <select
                  value={serviceLevel}
                  onChange={(event) => setServiceLevel(event.target.value as ServiceLevel)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white focus:border-emerald-400 focus:outline-none"
                >
                  <option value="STANDARD">{t("pricing.standardLabel")}</option>
                  <option value="EXPRESS">{t("pricing.expressLabel")}</option>
                </select>
              </div>
              <label className="flex items-center gap-3 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={homeDelivery}
                  onChange={(event) => setHomeDelivery(event.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-[#111827] text-emerald-400"
                />
                {t("pricing.addHomeDelivery", { fee: HOME_DELIVERY_FEE.toFixed(2) })}
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
              <h3 className="text-lg font-semibold text-white">{t("pricing.estimateTitle")}</h3>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>{t("pricing.billingWeight")}</span>
                  <span className="text-white">{pricing.billingWeight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("pricing.ratePerKg")}</span>
                  <span className="text-white">MAD {pricing.ratePerKg.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("pricing.basePrice")}</span>
                  <span className="text-white">MAD {pricing.basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("pricing.finalPrice")}</span>
                  <span className="text-emerald-300">MAD {pricing.finalPrice.toFixed(2)}</span>
                </div>
                {serviceLevel === "EXPRESS" && (
                  <p className="text-xs text-amber-200">{t("pricing.expressNote")}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-semibold text-white">{t("pricing.readyTitle")}</h2>
          <p className="mt-3 text-white/70">{t("pricing.readySubtitle")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/staff"
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              {t("pricing.createShipment")}
            </Link>
            <Link
              href="/track"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
            >
              {t("pricing.trackNow")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
