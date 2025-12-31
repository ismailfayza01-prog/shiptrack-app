import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hashPin } from "@/lib/crypto";
import type { UserRecord, UserRole } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const normalizePhone = (value: string) => value.replace(/[\s\-()]/g, "").trim();

const formatPhone = (value: string) => {
  const normalized = normalizePhone(value);
  if (!normalized) {
    return "";
  }
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
};

const phoneToEmail = (value: string) => {
  const digits = formatPhone(value).replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return `phone-${digits}@shiptrack.local`;
};

const isValidRole = (value: string): value is UserRole =>
  ["admin", "staff", "driver", "relay"].includes(value);

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase service role key not configured." },
      { status: 500 }
    );
  }

  let payload: { temp_pin?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tempPin = payload.temp_pin?.trim() || "";
  if (tempPin.length < 4) {
    return NextResponse.json(
      { error: "Temporary PIN must be at least 4 digits." },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id,full_name,phone,role,address,active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const results = {
    total: users?.length || 0,
    created: 0,
    skipped: 0,
    failed: 0,
    failures: [] as Array<{ user_id: string; phone: string; error: string }>,
  };

  const pinHash = await hashPin(tempPin);

  for (const user of (users || []) as UserRecord[]) {
    const normalizedPhone = formatPhone(user.phone || "");
    const email = phoneToEmail(normalizedPhone);
    if (!normalizedPhone || !email || !isValidRole(user.role)) {
      results.failed += 1;
      results.failures.push({
        user_id: user.id,
        phone: user.phone || "",
        error: "Invalid phone or role.",
      });
      continue;
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPin,
        email_confirm: true,
        user_metadata: {
          phone: normalizedPhone,
          legacy_user_id: user.id,
          role: user.role,
        },
        app_metadata: { role: user.role },
      });

    if (authError || !authData.user?.id) {
      const message = authError?.message || "Unable to create auth user.";
      if (message.toLowerCase().includes("already")) {
        results.skipped += 1;
        continue;
      }
      results.failed += 1;
      results.failures.push({
        user_id: user.id,
        phone: user.phone || "",
        error: message,
      });
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        phone: normalizedPhone,
        pin_hash: pinHash,
      })
      .eq("id", user.id);

    if (updateError) {
      results.failed += 1;
      results.failures.push({
        user_id: user.id,
        phone: user.phone || "",
        error: updateError.message,
      });
      continue;
    }

    results.created += 1;
  }

  return NextResponse.json({ ok: true, ...results });
}
