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

const buildPhoneVariants = (value: string) => {
  const normalized = normalizePhone(value);
  if (!normalized) {
    return [];
  }

  const variants = new Set<string>();
  variants.add(normalized);

  if (normalized.startsWith("+")) {
    variants.add(normalized.slice(1));
  } else {
    variants.add(`+${normalized}`);
  }

  return Array.from(variants);
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

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const matchByDigits = (candidate: string, needleDigits: string) => {
  const candidateDigits = digitsOnly(candidate);
  return candidateDigits === needleDigits;
};

const findUserByPhone = async (supabaseAdmin: any, phone: string) => {
  const variants = buildPhoneVariants(phone);
  for (const variant of variants) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id,full_name,phone,role,address,active,pin_hash")
      .eq("phone", variant)
      .eq("active", true)
      .limit(1);
    if (data && data.length > 0) {
      return data[0] as UserRecord & { pin_hash?: string | null };
    }
  }

  const { data: allUsers } = await supabaseAdmin
    .from("users")
    .select("id,full_name,phone,role,address,active,pin_hash")
    .eq("active", true);
  if (!allUsers) {
    return null;
  }

  const needleDigits = digitsOnly(phone);
  if (!needleDigits) {
    return null;
  }

  return (
    (allUsers as Array<UserRecord & { pin_hash?: string | null }>).find(
      (user) => matchByDigits(user.phone || "", needleDigits)
    ) || null
  );
};

const findAuthUserByEmail = async (supabaseAdmin: any, email: string) => {
  const { data } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const users = (data?.users || []) as Array<{ id?: string; email?: string | null }>;
  return users.find((user) => user.email === email) || null;
};

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase service role key not configured." },
      { status: 500 }
    );
  }

  let payload: { phone?: string; pin?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const phone = payload.phone?.trim() || "";
  const pin = payload.pin?.trim() || "";

  if (!phone || !pin) {
    return NextResponse.json(
      { error: "Missing phone or PIN." },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profile = await findUserByPhone(supabaseAdmin, phone);
  if (!profile || !isValidRole(profile.role)) {
    return NextResponse.json(
      { error: "User not found or inactive." },
      { status: 401 }
    );
  }

  const pinHash = await hashPin(pin);
  if (profile.pin_hash && profile.pin_hash !== pinHash) {
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  const normalizedPhone = formatPhone(profile.phone || phone);
  const email = phoneToEmail(normalizedPhone);
  if (!email) {
    return NextResponse.json(
      { error: "Invalid phone number." },
      { status: 400 }
    );
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: pin,
      email_confirm: true,
      user_metadata: {
        phone: normalizedPhone,
        legacy_user_id: profile.id,
        role: profile.role,
      },
      app_metadata: { role: profile.role },
    });

  let authUserId = authData?.user?.id || "";
  if (authError || !authUserId) {
    const message = authError?.message || "Unable to create auth user.";
    if (!message.toLowerCase().includes("already")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const existing = await findAuthUserByEmail(supabaseAdmin, email);
    if (!existing?.id) {
      return NextResponse.json(
        { error: "Existing auth user not found." },
        { status: 400 }
      );
    }
    authUserId = existing.id;
  }

  await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    password: pin,
    user_metadata: {
      phone: normalizedPhone,
      legacy_user_id: profile.id,
      role: profile.role,
    },
    app_metadata: {
      role: profile.role,
    },
  });

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      phone: normalizedPhone,
      pin_hash: pinHash,
      active: true,
    })
    .eq("id", profile.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, email });
}
