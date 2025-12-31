"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  COUNTRIES,
  MINIMUM_WEIGHT_KG,
  PRICING_TIERS,
} from "@/lib/constants";
import { getSessionProfile, signInWithPhonePin, signOut } from "@/lib/auth";
import { calculatePrice } from "@/lib/pricing";
import { formatDate } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { supabaseClient } from "@/lib/supabaseClient";
import { buildQuery, supabaseRequest } from "@/lib/supabase";
import type { PricingTier, ShipmentRecord, UserSession } from "@/lib/types";

const emptyForm = {
  sender_name: "",
  sender_phone: "",
  sender_address: "",
  sender_id_number: "",
  receiver_name: "",
  receiver_phone: "",
  receiver_address: "",
  destination_country: "",
  weight_kg: 20,
  pricing_tier: "B2C" as PricingTier,
  service_level: "STANDARD" as const,
  negotiated_rate: "",
  payment_terms: "PAY_ON_PICKUP",
  home_delivery: false,
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function StaffPage() {
  const { t } = useI18n();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [formData, setFormData] = useState({ ...emptyForm });
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [parcelPhotoFile, setParcelPhotoFile] = useState<File | null>(null);
  const idPhotoRef = useRef<HTMLInputElement | null>(null);
  const parcelPhotoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    getSessionProfile(["staff", "admin"]).then((profile) => {
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
      loadShipments(session.id);
    }
  }, [session]);

  const pricingPreview = useMemo(() => {
    return calculatePrice({
      weightKg: Number(formData.weight_kg) || 0,
      pricingTier: formData.pricing_tier,
      hasHomeDelivery: formData.home_delivery,
      negotiatedRate: formData.negotiated_rate
        ? Number(formData.negotiated_rate)
        : undefined,
      serviceLevel: formData.service_level,
    });
  }, [formData]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const user = await signInWithPhonePin(loginPhone.trim(), loginPin.trim(), [
        "staff",
        "admin",
      ]);
      if (!user) {
        setLoginError(t("staff.invalidCreds"));
      } else {
        setSession(user);
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : t("staff.invalidCreds"));
    } finally {
      setLoginLoading(false);
    }
  };

  const loadShipments = async (userId: string) => {
    try {
      const query = buildQuery({
        select:
          "id,tracking_code,sender_name,destination_country,status,service_level,received_at,expected_delivery_at,worst_case_delivery_at,final_price,created_at",
        created_by: `eq.${userId}`,
        order: "created_at.desc",
      });
      const data = await supabaseRequest<ShipmentRecord[]>(`shipments?${query}`);
      setShipments(data || []);
    } catch {
      setShipments([]);
    }
  };

  const handleCreateShipment = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) {
      return;
    }

    setActionMessage("");
    setActionError("");

    if (!idPhotoFile || !parcelPhotoFile) {
      setActionError(t("staff.photoRequired"));
      return;
    }

    try {
      const trackingCode = `ST-${Date.now().toString(36).toUpperCase()}`;
      const pricing = calculatePrice({
        weightKg: Number(formData.weight_kg) || 0,
        pricingTier: formData.pricing_tier,
        hasHomeDelivery: formData.home_delivery,
        negotiatedRate: formData.negotiated_rate
          ? Number(formData.negotiated_rate)
          : undefined,
        serviceLevel: formData.service_level,
      });

      const uploadAsset = async (file: File, suffix: string) => {
        const extension =
          file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `shipments/${trackingCode}/${suffix}.${extension}`;
        const { error: uploadError } = await supabaseClient.storage
          .from("shiptrack-assets")
          .upload(path, file, {
            upsert: true,
            contentType: file.type || "image/jpeg",
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data } = supabaseClient.storage
          .from("shiptrack-assets")
          .getPublicUrl(path);
        return data.publicUrl;
      };

      const [idPhotoUrl, parcelPhotoUrl] = await Promise.all([
        uploadAsset(idPhotoFile, "sender-id"),
        uploadAsset(parcelPhotoFile, "parcel"),
      ]);

      const payload = {
        tracking_code: trackingCode,
        sender_name: formData.sender_name,
        sender_phone: formData.sender_phone,
        sender_address: formData.sender_address,
        sender_id_number: formData.sender_id_number,
        receiver_name: formData.receiver_name,
        receiver_phone: formData.receiver_phone,
        receiver_address: formData.receiver_address,
        destination_country: formData.destination_country,
        weight_kg: Number(formData.weight_kg),
        pricing_tier: formData.pricing_tier,
        service_level: formData.service_level,
        base_price: pricing.basePrice,
        final_price: pricing.finalPrice,
        payment_terms: formData.payment_terms,
        status: "CREATED",
        created_by: session.id,
        id_photo_url: idPhotoUrl,
        parcel_photo_url: parcelPhotoUrl,
      };

      await supabaseRequest<ShipmentRecord[]>("shipments", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      });

      const printShipmentLabel = () => {
        if (typeof window === "undefined") {
          return;
        }

        const printWindow = window.open("", "_blank", "width=900,height=1200");
        if (!printWindow) {
          setActionError(t("staff.popupBlocked"));
          return;
        }

        const senderLine = `${formData.sender_name} ${
          formData.sender_phone ? `- ${formData.sender_phone}` : ""
        }`.trim();
        const receiverLine = `${formData.receiver_name} ${
          formData.receiver_phone ? `- ${formData.receiver_phone}` : ""
        }`.trim();

        const labelLang = document.documentElement.lang || "fr";
        const html = `<!doctype html>
<html lang="${escapeHtml(labelLang)}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(t("label.title"))} ${escapeHtml(trackingCode)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
      .label {
        border: 2px solid #111827;
        border-radius: 12px;
        padding: 16mm;
        height: calc(297mm - 24mm);
        box-sizing: border-box;
      }
      .title { font-size: 20pt; font-weight: 700; margin-bottom: 8mm; }
      .tracking { font-size: 18pt; font-weight: 700; letter-spacing: 1px; }
      .meta { margin-top: 6mm; font-size: 12pt; line-height: 1.4; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-top: 10mm; }
      .section h3 { margin: 0 0 4mm; font-size: 12pt; text-transform: uppercase; letter-spacing: 0.1em; }
      .barcode, .qr { display: flex; align-items: center; justify-content: center; }
      .barcode svg { width: 100%; height: 70px; }
      .qr canvas { width: 140px; height: 140px; }
      .footer { margin-top: 10mm; font-size: 10pt; color: #6b7280; }
    </style>
  </head>
  <body>
      <div class="label">
      <div class="title">${escapeHtml(t("label.title"))}</div>
      <div class="tracking">${escapeHtml(trackingCode)}</div>
      <div class="meta">
        <div><strong>${escapeHtml(t("label.sender"))}:</strong> ${escapeHtml(senderLine)}</div>
        <div><strong>${escapeHtml(t("label.receiver"))}:</strong> ${escapeHtml(receiverLine)}</div>
        <div><strong>${escapeHtml(t("label.destination"))}:</strong> ${escapeHtml(
          formData.destination_country
        )}</div>
        <div><strong>${escapeHtml(t("label.weight"))}:</strong> ${Number(formData.weight_kg).toFixed(
          2
        )} kg</div>
      </div>
      <div class="grid">
        <div class="section">
          <h3>${escapeHtml(t("label.barcode"))}</h3>
          <div class="barcode">
            <svg id="barcode"></svg>
          </div>
        </div>
        <div class="section">
          <h3>${escapeHtml(t("label.qr"))}</h3>
          <div class="qr" id="qrcode"></div>
        </div>
      </div>
      <div class="footer">${escapeHtml(t("label.printed"))}: ${escapeHtml(
        new Date().toLocaleString()
      )}</div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
    <script>
      function renderCodes() {
        if (window.JsBarcode && window.QRCode) {
          window.JsBarcode("#barcode", "${escapeHtml(trackingCode)}", {
            format: "CODE128",
            displayValue: false,
            margin: 0
          });
          new window.QRCode(document.getElementById("qrcode"), {
            text: "${escapeHtml(trackingCode)}",
            width: 140,
            height: 140
          });
          setTimeout(function () {
            window.focus();
            window.print();
          }, 300);
          return;
        }
        setTimeout(renderCodes, 100);
      }
      renderCodes();
      window.onafterprint = function () {
        window.close();
      };
    </script>
  </body>
</html>`;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
      };

      printShipmentLabel();
      setActionMessage(t("staff.shipmentCreated", { trackingCode }));
      setFormData({ ...emptyForm });
      setIdPhotoFile(null);
      setParcelPhotoFile(null);
      if (idPhotoRef.current) {
        idPhotoRef.current.value = "";
      }
      if (parcelPhotoRef.current) {
        parcelPhotoRef.current.value = "";
      }
      await loadShipments(session.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("common.createFailed"));
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
            <h1 className="text-2xl font-semibold text-white">
              {t("staff.loginTitle")}
            </h1>
            <p className="mt-2 text-sm text-white/70">{t("staff.loginSubtitle")}</p>
            {loginError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="text-sm text-white/70">{t("staff.phoneLabel")}</label>
                <input
                  value={loginPhone}
                  onChange={(event) => setLoginPhone(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white"
                  placeholder="+212..."
                  required
                />
              </div>
              <div>
                <label className="text-sm text-white/70">{t("staff.pinLabel")}</label>
                <input
                  type="password"
                  value={loginPin}
                  onChange={(event) => setLoginPin(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white"
                  placeholder="4-6 digit PIN"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                {loginLoading ? t("staff.signingIn") : t("staff.loginButton")}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">
              {t("staff.dashboardTitle")}
            </h1>
            <p className="mt-2 text-white/70">
              {t("staff.dashboardSubtitle", { name: session.full_name })}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/50 hover:text-white"
          >
            {t("staff.logout")}
          </button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <form
            onSubmit={handleCreateShipment}
            className="rounded-3xl border border-white/10 bg-[#1f2937] p-6 shadow-lg"
          >
            <h2 className="text-xl font-semibold text-white">{t("staff.createTitle")}</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.senderName")}
                value={formData.sender_name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, sender_name: event.target.value }))
                }
                required
              />
              <input
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.senderPhone")}
                value={formData.sender_phone}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, sender_phone: event.target.value }))
                }
                required
              />
              <input
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.senderAddress")}
                value={formData.sender_address}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, sender_address: event.target.value }))
                }
                required
              />
              <input
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.senderId")}
                value={formData.sender_id_number}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, sender_id_number: event.target.value }))
                }
                required
              />
              <input
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.receiverName")}
                value={formData.receiver_name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, receiver_name: event.target.value }))
                }
                required
              />
              <input
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.receiverPhone")}
                value={formData.receiver_phone}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, receiver_phone: event.target.value }))
                }
                required
              />
              <input
                className="md:col-span-2 rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.receiverAddress")}
                value={formData.receiver_address}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, receiver_address: event.target.value }))
                }
                required
              />
              <select
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                value={formData.destination_country}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    destination_country: event.target.value,
                  }))
                }
                required
              >
                <option value="">{t("staff.destinationCountry")}</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={MINIMUM_WEIGHT_KG}
                step="0.1"
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.weight")}
                value={formData.weight_kg}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    weight_kg: Number(event.target.value),
                  }))
                }
                required
              />
              <select
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                value={formData.pricing_tier}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    pricing_tier: event.target.value as PricingTier,
                  }))
                }
              >
                {Object.entries(PRICING_TIERS).map(([key, tier]) => (
                  <option key={key} value={key}>
                    {tier.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                value={formData.service_level}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    service_level: event.target.value as "STANDARD" | "EXPRESS",
                  }))
                }
              >
                <option value="STANDARD">{t("pricing.standardLabel")}</option>
                <option value="EXPRESS">{t("pricing.expressLabel")}</option>
              </select>
              <input
                type="number"
                min={15}
                step="0.1"
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("staff.negotiatedRate")}
                value={formData.negotiated_rate}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    negotiated_rate: event.target.value,
                  }))
                }
              />
              <select
                className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                value={formData.payment_terms}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    payment_terms: event.target.value,
                  }))
                }
              >
                <option value="PAY_ON_PICKUP">{t("staff.payOnPickup")}</option>
                <option value="PAY_NOW">{t("staff.payNow")}</option>
                <option value="POD">{t("staff.pod")}</option>
              </select>
              <label className="flex items-center gap-3 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={formData.home_delivery}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      home_delivery: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-white/30 bg-[#111827] text-emerald-400"
                />
                {t("staff.addHomeDelivery")}
              </label>
              <div className="md:col-span-2">
                <label className="text-sm text-white/70">{t("staff.senderIdPhoto")}</label>
                <input
                  ref={idPhotoRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setIdPhotoFile(event.target.files?.[0] || null)
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-white/70">{t("staff.parcelPhoto")}</label>
                <input
                  ref={parcelPhotoRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setParcelPhotoFile(event.target.files?.[0] || null)
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
                  required
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#111827] p-4 text-sm text-white/70">
              <div className="flex justify-between">
                <span>{t("staff.billingWeight")}</span>
                <span className="text-white">{pricingPreview.billingWeight} kg</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span>{t("staff.ratePerKg")}</span>
                <span className="text-white">
                  MAD {pricingPreview.ratePerKg.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span>{t("staff.finalPrice")}</span>
                <span className="text-emerald-300">
                  MAD {pricingPreview.finalPrice.toFixed(2)}
                </span>
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

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              {t("staff.createButton")}
            </button>
          </form>

          <div className="rounded-3xl border border-white/10 bg-[#1f2937] p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-white">{t("staff.myShipments")}</h2>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              {shipments.length === 0 && (
                <p className="rounded-lg border border-white/10 bg-[#111827] px-3 py-2">
                  {t("staff.noShipments")}
                </p>
              )}
              {shipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="rounded-xl border border-white/10 bg-[#111827] p-4"
                >
                  <div className="flex items-center justify-between text-white">
                    <span className="font-semibold">{shipment.tracking_code}</span>
                    <span className="text-xs text-emerald-200">{shipment.status}</span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-white/60">
                    <span>
                      {t("staff.destination")}: {shipment.destination_country || "-"}
                    </span>
                    <span>{t("staff.service")}: {shipment.service_level}</span>
                    <span>{t("staff.created")}: {formatDate(shipment.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
