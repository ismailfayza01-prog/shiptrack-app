import type { UserSession } from "./types";

const SESSION_KEY = "shiptrack_mvp_session";

export const saveSession = (session: UserSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const loadSession = (): UserSession | null => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};
