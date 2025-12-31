"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getSessionProfile, signInWithPhonePin, signOut } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { createQrScanner } from "@/lib/qrScanner";
import { buildQuery, supabaseRequest } from "@/lib/supabase";
import type { ShipmentRecord, UserSession } from "@/lib/types";

export default function DriverPage() {
  const { t } = useI18n();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const scannerRef = useRef<Awaited<ReturnType<typeof createQrScanner>> | null>(
    null
  );
  const scanRegionId = "driver-qr-reader";

  useEffect(() => {
    let isMounted = true;
    getSessionProfile(["driver", "admin"]).then((profile) => {
      if (isMounted && profile) {
        setSession(profile);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadAssignments(session.id);
    }
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    const stopScanner = async () => {
      if (!scannerRef.current) {
        return;
      }
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore stop errors
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // ignore clear errors
      }
      scannerRef.current = null;
    };

    const startScanner = async () => {
      setActionError("");
      setScanLoading(true);
      try {
        const scanner = await createQrScanner(scanRegionId);
        if (cancelled) {
          return;
        }
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          async (decodedText) => {
            const trackingCode = decodedText.trim();
            if (!trackingCode) {
              return;
            }
            await stopScanner();
            setScanOpen(false);
            const match = shipments.find(
              (shipment) => shipment.tracking_code === trackingCode
            );
            if (!match) {
              setActionError(t("driver.scanNotFound"));
              return;
            }
            await updateStatus(match.id, "IN_TRANSIT");
          }
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("driver.scanError");
        setActionError(message);
      } finally {
        if (!cancelled) {
          setScanLoading(false);
        }
      }
    };

    if (scanOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [scanOpen, shipments]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const user = await signInWithPhonePin(loginPhone.trim(), loginPin.trim(), [
        "driver",
        "admin",
      ]);
      if (!user) {
        setLoginError(t("driver.invalidCreds"));
      } else {
        setSession(user);
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : t("driver.invalidCreds"));
    } finally {
      setLoginLoading(false);
    }
  };

  const loadAssignments = async (driverId: string) => {
    const query = buildQuery({
      select:
        "id,tracking_code,destination_country,status,service_level,received_at,expected_delivery_at,final_price",
      assigned_driver_id: `eq.${driverId}`,
      order: "created_at.desc",
    });
    const data = await supabaseRequest<ShipmentRecord[]>(`shipments?${query}`);
    setShipments(data || []);
  };

  const updateStatus = async (shipmentId: string, status: string) => {
    if (!session) {
      return;
    }

    setActionMessage("");
    setActionError("");
    try {
      await supabaseRequest(`shipments?id=eq.${shipmentId}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          status,
          current_handler_id: session.id,
          current_handler_location: session.address,
        }),
      });
      setActionMessage(t("driver.shipmentUpdated"));
      loadAssignments(session.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("common.updateFailed"));
    }
  };

  const handleLogout = async () => {
    await signOut();
    setSession(null);
  };

  if (!session) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-md px-6">
          <div className="rounded-2xl border border-white/10 bg-[#1f2937] p-6 shadow-lg">
            <h1 className="text-2xl font-semibold text-white">{t("driver.loginTitle")}</h1>
            <p className="mt-2 text-sm text-white/70">{t("driver.loginSubtitle")}</p>
            {loginError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <input
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.phoneLabel")}
                value={loginPhone}
                onChange={(event) => setLoginPhone(event.target.value)}
                required
              />
              <input
                type="password"
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.pinLabel")}
                value={loginPin}
                onChange={(event) => setLoginPin(event.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                {loginLoading ? t("driver.signingIn") : t("staff.loginButton")}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">{t("driver.dashboardTitle")}</h1>
            <p className="mt-2 text-white/70">{t("driver.welcome", { name: session.full_name })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setScanOpen(true)}
              className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100"
            >
              {t("driver.scanQr")}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/50 hover:text-white"
            >
              {t("driver.logout")}
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {actionError}
          </div>
        )}
        {actionMessage && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {actionMessage}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {shipments.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#1f2937] p-6 text-sm text-white/70">
              {t("driver.noAssignments")}
            </div>
          )}
          {shipments.map((shipment) => (
            <div
              key={shipment.id}
              className="rounded-2xl border border-white/10 bg-[#1f2937] p-6 shadow-lg"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-white">
                <div>
                  <h2 className="text-lg font-semibold">{shipment.tracking_code}</h2>
                  <p className="text-sm text-white/60">
                    {t("driver.destination")}: {shipment.destination_country || "-"}
                  </p>
                </div>
                <span className="text-xs text-emerald-200">{shipment.status}</span>
              </div>
              <div className="mt-4 grid gap-3 text-xs text-white/60 md:grid-cols-3">
                <span>{t("driver.received")}: {formatDate(shipment.received_at)}</span>
                <span>{t("driver.eta")}: {formatDate(shipment.expected_delivery_at)}</span>
                <span>
                  {t("driver.price")}: {shipment.final_price ? `MAD ${Number(shipment.final_price).toFixed(2)}` : "-"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => updateStatus(shipment.id, "IN_TRANSIT")}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/80 transition hover:border-emerald-400 hover:text-emerald-200"
                >
                  {t("driver.markInTransit")}
                </button>
                <button
                  onClick={() => updateStatus(shipment.id, "DELIVERED")}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
                >
                  {t("driver.markDelivered")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#1f2937] p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("driver.scanTitle")}</h2>
              <button
                onClick={() => setScanOpen(false)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 transition hover:border-white/50 hover:text-white"
              >
                {t("driver.close")}
              </button>
            </div>
            <p className="mt-2 text-sm text-white/70">
              {t("driver.scanSubtitle")}
            </p>
            <div
              id={scanRegionId}
              className="mt-4 flex min-h-[260px] items-center justify-center rounded-xl border border-white/10 bg-[#111827]"
            >
              {scanLoading && (
                <span className="text-sm text-white/60">{t("driver.startingCamera")}</span>
              )}
            </div>
            <p className="mt-3 text-xs text-white/50">
              {t("driver.cameraNote")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
