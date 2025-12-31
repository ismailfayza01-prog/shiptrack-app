"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getSessionProfile, signInWithPhonePin, signOut } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { buildQuery, supabaseRequest } from "@/lib/supabase";
import type { ShipmentRecord, UserRecord, UserRole, UserSession } from "@/lib/types";

const roleOptions: UserRole[] = ["admin", "staff", "driver", "relay"];

export default function AdminPage() {
  const { t } = useI18n();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [assignment, setAssignment] = useState({
    shipmentId: "",
    driverId: "",
    relayId: "",
  });

  const [newUser, setNewUser] = useState({
    full_name: "",
    phone: "",
    address: "",
    role: "staff" as UserRole,
    pin: "",
  });

  useEffect(() => {
    let isMounted = true;
    getSessionProfile(["admin"]).then((profile) => {
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
      loadUsers();
      loadShipments();
    }
  }, [session]);

  const kpis = useMemo(() => {
    const total = shipments.length;
    const delivered = shipments.filter((s) => s.status === "DELIVERED").length;
    const inTransit = shipments.filter((s) => s.status === "IN_TRANSIT").length;
    const pending = shipments.filter((s) => s.status === "CREATED").length;
    return { total, delivered, inTransit, pending };
  }, [shipments]);

  const customerSummary = useMemo(() => {
    const unknownLabel = t("common.unknown");
    const map = new Map<
      string,
      { phone: string; name: string; count: number; address: string; city: string; country: string }
    >();

    const extractCity = (address: string) => {
      const cleaned = address.replace(/\s+/g, " ").trim();
      if (!cleaned) {
        return "";
      }
      const parts = cleaned.split(/[,/\\-]/).map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return parts[parts.length - 1];
      }
      return "";
    };

    shipments.forEach((shipment) => {
      const phone = shipment.sender_phone?.trim() || "";
      if (!phone) {
        return;
      }
      const name = shipment.sender_name?.trim() || unknownLabel;
      const address = shipment.sender_address?.trim() || "";
      const city = extractCity(address);
      const country = shipment.destination_country?.trim() || "";
      const existing = map.get(phone);
      if (existing) {
        existing.count += 1;
        if (existing.name === unknownLabel && name !== unknownLabel) {
          existing.name = name;
        }
        if (!existing.address && address) {
          existing.address = address;
        }
        if (!existing.city && city) {
          existing.city = city;
        }
        if (!existing.country && country) {
          existing.country = country;
        }
      } else {
        map.set(phone, {
          phone,
          name,
          count: 1,
          address,
          city,
          country,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [shipments, t]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const user = await signInWithPhonePin(loginPhone.trim(), loginPin.trim(), [
        "admin",
      ]);
      if (!user) {
        setLoginError(t("admin.invalidAdmin"));
      } else {
        setSession(user);
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : t("admin.invalidAdmin"));
    } finally {
      setLoginLoading(false);
    }
  };

  const loadUsers = async () => {
    const query = buildQuery({
      select: "id,full_name,phone,role,address,active",
      order: "created_at.desc",
    });
    const data = await supabaseRequest<UserRecord[]>(`users?${query}`);
    setUsers(data || []);
  };

  const loadShipments = async () => {
    const query = buildQuery({
      select:
        "id,tracking_code,sender_name,sender_phone,sender_address,destination_country,status,service_level,received_at,expected_delivery_at,worst_case_delivery_at,final_price,assigned_driver_id,assigned_relay_id,created_at",
      order: "created_at.desc",
    });
    const data = await supabaseRequest<ShipmentRecord[]>(`shipments?${query}`);
    setShipments(data || []);
  };

  const handleAssign = async (event: FormEvent) => {
    event.preventDefault();
    setActionMessage("");
    setActionError("");

    if (!assignment.shipmentId) {
      setActionError(t("admin.selectShipmentError"));
      return;
    }

    const payload: Record<string, string> = {};
    if (assignment.driverId) {
      payload.assigned_driver_id = assignment.driverId;
    }
    if (assignment.relayId) {
      payload.assigned_relay_id = assignment.relayId;
    }

    try {
      await supabaseRequest<ShipmentRecord[]>(
        `shipments?id=eq.${assignment.shipmentId}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(payload),
        }
      );
      setActionMessage(t("admin.assignSaved"));
      setAssignment({ shipmentId: "", driverId: "", relayId: "" });
      loadShipments();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("common.updateFailed"));
    }
  };

  const handleDeleteShipment = async (shipmentId: string) => {
    setActionMessage("");
    setActionError("");

    const confirmDelete = window.confirm(t("admin.deleteConfirm"));
    if (!confirmDelete) {
      return;
    }

    try {
      await supabaseRequest(`shipments?id=eq.${shipmentId}`, {
        method: "DELETE",
      });
      setActionMessage(t("admin.shipmentDeleted"));
      loadShipments();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("common.createFailed"));
    }
  };

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    setActionMessage("");
    setActionError("");

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newUser.full_name,
          phone: newUser.phone,
          address: newUser.address,
          role: newUser.role,
          pin: newUser.pin,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Unable to create user");
      }
      setActionMessage(t("admin.userCreated"));
      setNewUser({ full_name: "", phone: "", address: "", role: "staff", pin: "" });
      loadUsers();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t("admin.deleteError")
      );
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
              {t("admin.loginTitle")}
            </h1>
            <p className="mt-2 text-sm text-white/70">{t("admin.loginSubtitle")}</p>
            {loginError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <input
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("admin.phone")}
                value={loginPhone}
                onChange={(event) => setLoginPhone(event.target.value)}
                required
              />
              <input
                type="password"
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white"
                placeholder={t("admin.pin")}
                value={loginPin}
                onChange={(event) => setLoginPin(event.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                {loginLoading ? t("admin.signingIn") : t("staff.loginButton")}
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
            <h1 className="text-3xl font-semibold text-white">{t("admin.console")}</h1>
            <p className="mt-2 text-white/70">
              {t("admin.welcome", { name: session.full_name })}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/50 hover:text-white"
          >
            {t("admin.logout")}
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <KpiCard label={t("admin.totalShipments")} value={kpis.total} />
          <KpiCard label={t("admin.inTransit")} value={kpis.inTransit} />
          <KpiCard label={t("admin.delivered")} value={kpis.delivered} />
          <KpiCard label={t("admin.pending")} value={kpis.pending} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#1f2937] p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white">{t("admin.shipments")}</h2>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                {shipments.length === 0 && (
                  <p className="rounded-lg border border-white/10 bg-[#111827] px-3 py-2">
                    {t("admin.noShipments")}
                  </p>
                )}
                {shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="rounded-xl border border-white/10 bg-[#111827] p-4"
                  >
                    <div className="flex items-center justify-between text-white">
                      <span className="font-semibold">{shipment.tracking_code}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-200">{shipment.status}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteShipment(shipment.id)}
                          className="rounded-full border border-red-400/30 px-2 py-1 text-[10px] text-red-200 transition hover:border-red-300 hover:text-red-100"
                        >
                          {t("admin.delete")}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-white/60">
                      <span>
                        {t("admin.destination")}: {shipment.destination_country || "-"}
                      </span>
                      <span>{t("admin.service")}: {shipment.service_level}</span>
                      <span>{t("admin.expected")}: {formatDate(shipment.expected_delivery_at)}</span>
                      <span>
                        {t("admin.finalPrice")}: {shipment.final_price ? `MAD ${Number(shipment.final_price).toFixed(2)}` : "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#1f2937] p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white">{t("admin.assignTitle")}</h2>
              <form onSubmit={handleAssign} className="mt-4 space-y-4 text-sm">
                <select
                  className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white"
                  value={assignment.shipmentId}
                  onChange={(event) =>
                    setAssignment((prev) => ({ ...prev, shipmentId: event.target.value }))
                  }
                >
                  <option value="">{t("admin.selectShipment")}</option>
                  {shipments.map((shipment) => (
                    <option key={shipment.id} value={shipment.id}>
                      {shipment.tracking_code}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white"
                  value={assignment.driverId}
                  onChange={(event) =>
                    setAssignment((prev) => ({ ...prev, driverId: event.target.value }))
                  }
                >
                  <option value="">{t("admin.assignDriver")}</option>
                  {users
                    .filter((user) => user.role === "driver")
                    .map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.full_name}
                      </option>
                    ))}
                </select>
                <select
                  className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white"
                  value={assignment.relayId}
                  onChange={(event) =>
                    setAssignment((prev) => ({ ...prev, relayId: event.target.value }))
                  }
                >
                  <option value="">{t("admin.assignRelay")}</option>
                  {users
                    .filter((user) => user.role === "relay")
                    .map((relay) => (
                      <option key={relay.id} value={relay.id}>
                        {relay.full_name}
                      </option>
                    ))}
                </select>

                {actionError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {actionError}
                  </div>
                )}
                {actionMessage && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {actionMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
                >
                  {t("admin.saveAssignment")}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#1f2937] p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white">{t("admin.createUser")}</h2>
              <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-sm">
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white"
                  placeholder={t("admin.fullName")}
                  value={newUser.full_name}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, full_name: event.target.value }))
                  }
                  required
                />
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white"
                  placeholder={t("admin.phone")}
                  value={newUser.phone}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  required
                />
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white"
                  placeholder={t("admin.address")}
                  value={newUser.address}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, address: event.target.value }))
                  }
                />
                <select
                  className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white"
                  value={newUser.role}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, role: event.target.value as UserRole }))
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <input
                  type="password"
                  className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white"
                  placeholder={t("admin.pin")}
                  value={newUser.pin}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, pin: event.target.value }))
                  }
                  required
                />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  {t("admin.createUserButton")}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#1f2937] p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white">{t("admin.userList")}</h2>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-white/10 bg-[#111827] p-3"
                  >
                    <div className="flex items-center justify-between text-white">
                      <span>{user.full_name}</span>
                      <span className="text-xs text-emerald-200">{user.role}</span>
                    </div>
                    <div className="mt-2 text-xs text-white/60">
                      {user.phone} - {user.address || t("admin.noAddress")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#1f2937] p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white">{t("admin.customers")}</h2>
              <p className="mt-2 text-sm text-white/60">
                {t("admin.customersSubtitle")}
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                {customerSummary.length === 0 && (
                  <p className="rounded-lg border border-white/10 bg-[#111827] px-3 py-2">
                    {t("admin.noCustomers")}
                  </p>
                )}
                {customerSummary.map((customer) => (
                  <div
                    key={customer.phone}
                    className="rounded-xl border border-white/10 bg-[#111827] p-3"
                  >
                    <div className="flex items-center justify-between text-white">
                      <span>{customer.name}</span>
                      <span className="text-xs text-emerald-200">
                        {t("admin.shipmentsCount", { count: customer.count })}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-white/60">
                      <div>{customer.phone}</div>
                      <div>
                        {t("admin.customerAddress")}: {customer.address || t("common.unknown")}
                      </div>
                      <div>
                        {t("admin.customerCity")}: {customer.city || t("common.unknown")}
                      </div>
                      <div>
                        {t("admin.customerCountry")}: {customer.country || t("common.unknown")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const KpiCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-white/10 bg-[#1f2937] p-4 text-white shadow-lg shadow-black/20">
    <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-emerald-200">{value}</p>
  </div>
);
