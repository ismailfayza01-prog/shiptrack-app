const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

import { supabaseClient } from "./supabaseClient";

const baseHeaders = () => ({
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
});

const ensureConfigured = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not set");
  }
};

export const buildQuery = (params: Record<string, string>) => {
  const search = new URLSearchParams(params);
  return search.toString();
};

const buildAuthHeaders = async () => {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // Ignore session errors and fall back to anon
  }
  return {};
};

export const supabaseRequest = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  ensureConfigured();

  const url = `${supabaseUrl}/rest/v1/${path}`;
  const authHeaders = await buildAuthHeaders();
  const headers = {
    ...baseHeaders(),
    "Content-Type": "application/json",
    ...authHeaders,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Supabase request failed");
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
};
