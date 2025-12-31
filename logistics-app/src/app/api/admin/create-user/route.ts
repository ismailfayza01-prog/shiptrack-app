import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hashPin } from "@/lib/crypto";
import type { UserRole } from "@/lib/types";

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

  let payload: {
    full_name?: string;
    phone?: string;
    address?: string;
    role?: string;
    pin?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fullName = payload.full_name?.trim() || "";
  const phone = payload.phone?.trim() || "";
  const address = payload.address?.trim() || "";
  const role = payload.role?.trim() || "";
  const pin = payload.pin?.trim() || "";

  if (!fullName || !phone || !pin || !role) {
    return NextResponse.json(
      { error: "Missing required user fields." },
      { status: 400 }
    );
  }

  if (!isValidRole(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const normalizedPhone = formatPhone(phone);
  const email = phoneToEmail(normalizedPhone);
  if (!normalizedPhone || !email) {
    return NextResponse.json(
      { error: "Invalid phone number." },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: pin,
      email_confirm: true,
      user_metadata: {
        phone: normalizedPhone,
        role,
      },
      app_metadata: {
        role,
      },
    });

  if (authError || !authData.user?.id) {
    return NextResponse.json(
      { error: authError?.message || "Unable to create auth user." },
      { status: 400 }
    );
  }

  const pinHash = await hashPin(pin);
  const { error: profileError } = await supabaseAdmin.from("users").upsert({
    id: authData.user.id,
    full_name: fullName,
    phone: normalizedPhone,
    address: address || null,
    role,
    pin_hash: pinHash,
    active: true,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user_id: authData.user.id });
}
