"use client";

import { useState, type FormEvent } from "react";
import { buildQuery, supabaseRequest } from "@/lib/supabase";
import { computeEta } from "@/lib/pricing";
import { formatDate } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import type { ShipmentRecord } from "@/lib/types";

export default function TrackPage() {
  const { t } = useI18n();
  const [trackingCode, setTrackingCode] = useState("");
  const [shipment, setShipment] = useState<ShipmentRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setShipment(null);
    setLoading(true);

    try {
      const query = buildQuery({
        select: "*",
        tracking_code: `eq.${trackingCode.trim()}`,
        limit: "1",
      });
      const results = await supabaseRequest<ShipmentRecord[]>(`shipments?${query}`);
      if (!results || results.length === 0) {
        setError(t("track.notFound"));
      } else {
        setShipment(results[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("track.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const eta = shipment
    ? computeEta(shipment.received_at, shipment.service_level)
    : null;

  return (
    <div className="py-12">
      <div className="mx-auto max-w-4xl px-6">
        <h1 className="text-3xl font-semibold text-white">{t("track.title")}</h1>
        <p className="mt-3 text-white/70">{t("track.subtitle")}</p>

        <form
          onSubmit={handleSearch}
          className="mt-8 rounded-2xl border border-white/10 bg-[#1f2937] p-6"
        >
          <label className="text-sm text-white/70">{t("track.trackingLabel")}</label>
          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <input
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white focus:border-emerald-400 focus:outline-none"
              placeholder={t("track.trackingPlaceholder")}
              required
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              {loading ? t("track.searching") : t("track.trackButton")}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {shipment && (
          <div className="mt-8 grid gap-6 rounded-3xl border border-white/10 bg-[#0f172a] p-6 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-white">{t("track.detailsTitle")}</h2>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>{t("track.tracking")}</span>
                  <span className="text-white">{shipment.tracking_code}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("track.status")}</span>
                  <span className="text-emerald-300">{shipment.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("track.service")}</span>
                  <span className="text-white">{shipment.service_level}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("track.received")}</span>
                  <span className="text-white">{formatDate(shipment.received_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("track.finalPrice")}</span>
                  <span className="text-white">
                    {shipment.final_price
                      ? `MAD ${Number(shipment.final_price).toFixed(2)}`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">{t("track.etaTitle")}</h2>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                {!shipment.received_at && (
                  <p className="rounded-lg bg-white/5 px-3 py-2">
                    {t("track.etaPending")}
                  </p>
                )}
                {shipment.received_at && shipment.service_level === "STANDARD" && (
                  <>
                    <div className="flex justify-between">
                      <span>{t("track.expected")}</span>
                      <span className="text-white">
                        {eta?.expected ? `${formatDate(eta.expected)} (J+7)` : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("track.worstCase")}</span>
                      <span className="text-white">
                        {eta?.worstCase ? `${formatDate(eta.worstCase)} (J+9)` : "-"}
                      </span>
                    </div>
                  </>
                )}
                {shipment.received_at && shipment.service_level === "EXPRESS" && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-amber-200">
                    {t("track.expressEta", {
                      date: eta?.expected ? formatDate(eta.expected) : "-",
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
