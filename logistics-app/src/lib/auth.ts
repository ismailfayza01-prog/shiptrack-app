import { buildQuery, supabaseRequest } from "./supabase";
import { supabaseClient } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";
import type { UserRecord, UserRole, UserSession } from "./types";

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

const extractPhoneFromUser = (user: User) => {
  const metadataPhone =
    typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone
      : "";
  if (metadataPhone) {
    return formatPhone(metadataPhone);
  }

  if (user.phone) {
    return formatPhone(user.phone);
  }

  if (user.email) {
    const match = user.email.match(/^phone-(\d+)@shiptrack\.local$/);
    if (match?.[1]) {
      return formatPhone(match[1]);
    }
  }

  return "";
};

const extractLegacyUserId = (user: User) => {
  const legacyId = user.user_metadata?.legacy_user_id;
  return typeof legacyId === "string" ? legacyId : "";
};

const fetchUserProfileById = async (
  userId: string
): Promise<UserRecord | null> => {
  const query = buildQuery({
    select: "id,full_name,phone,role,address,active",
    id: `eq.${userId}`,
    active: "eq.true",
    limit: "1",
  });
  const users = await supabaseRequest<UserRecord[]>(`users?${query}`);
  if (!users || users.length === 0) {
    return null;
  }
  return users[0];
};

const fetchUserProfileByPhone = async (
  phone: string
): Promise<UserRecord | null> => {
  const variants = buildPhoneVariants(phone);
  for (const variant of variants) {
    const query = buildQuery({
      select: "id,full_name,phone,role,address,active",
      phone: `eq.${variant}`,
      active: "eq.true",
      limit: "1",
    });
    const users = await supabaseRequest<UserRecord[]>(`users?${query}`);
    if (users && users.length > 0) {
      return users[0];
    }
  }
  return null;
};

const normalizeProfile = (profile: UserRecord): UserRecord => {
  const roleValue =
    typeof profile.role === "string" ? profile.role.toLowerCase() : profile.role;
  return { ...profile, role: roleValue as UserRole };
};

const resolveUserProfile = async (user: User): Promise<UserRecord | null> => {
  const legacyId = extractLegacyUserId(user);
  if (legacyId && legacyId !== user.id) {
    const legacyProfile = await fetchUserProfileById(legacyId);
    if (legacyProfile) {
      return normalizeProfile(legacyProfile);
    }
  }

  const byId = await fetchUserProfileById(user.id);
  if (byId) {
    return normalizeProfile(byId);
  }

  const phone = extractPhoneFromUser(user);
  if (!phone) {
    return null;
  }

  const byPhone = await fetchUserProfileByPhone(phone);
  return byPhone ? normalizeProfile(byPhone) : null;
};

const toSession = (user: UserRecord): UserSession => ({
  id: user.id,
  full_name: user.full_name,
  phone: user.phone,
  role: user.role,
  address: user.address,
});

export const signInWithPhonePin = async (
  phone: string,
  pin: string,
  roles: UserRole[]
): Promise<UserSession | null> => {
  const email = phoneToEmail(phone);
  if (!email) {
    return null;
  }

  let { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password: pin,
  });

  if (error || !data.session?.user) {
    const repairResponse = await fetch("/api/auth/phone-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin }),
    });

    if (!repairResponse.ok) {
      return null;
    }

    const retry = await supabaseClient.auth.signInWithPassword({
      email,
      password: pin,
    });

    data = retry.data;
    error = retry.error;
  }

  if (error || !data.session?.user) {
    return null;
  }

  let profile = await resolveUserProfile(data.session.user);
  if (!profile) {
    const repairResponse = await fetch("/api/auth/phone-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin }),
    });

    if (repairResponse.ok) {
      const sessionResult = await supabaseClient.auth.getSession();
      const refreshedUser =
        sessionResult.data.session?.user || data.session.user;
      profile = await resolveUserProfile(refreshedUser);
    }
  }

  if (!profile || (roles.length > 0 && !roles.includes(profile.role))) {
    await supabaseClient.auth.signOut();
    return null;
  }

  return toSession(profile);
};

export const getSessionProfile = async (
  roles: UserRole[] = []
): Promise<UserSession | null> => {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.user) {
    return null;
  }

  const profile = await resolveUserProfile(data.session.user);
  if (!profile || (roles.length > 0 && !roles.includes(profile.role))) {
    await supabaseClient.auth.signOut();
    return null;
  }

  return toSession(profile);
};

export const signOut = async () => {
  await supabaseClient.auth.signOut();
};
