import { User } from '@/types';

const TOKEN_KEY = 'logistics_app_token';
const USER_KEY = 'logistics_app_user';

export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const setCurrentUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const removeCurrentUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const logout = (): void => {
  removeAuthToken();
  removeCurrentUser();
};