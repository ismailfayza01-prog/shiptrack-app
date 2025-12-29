'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User } from '@/types';
import { getAuthToken, getCurrentUser, isAuthenticated as checkAuth, logout as logoutUtil } from '@/utils/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (userData: { user: User; token: string }) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

type AuthAction =
  | { type: 'LOGIN'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      const user = getCurrentUser();

      if (token && user && checkAuth()) {
        dispatch({ type: 'LOGIN', payload: { user, token } });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = (userData: { user: User; token: string }) => {
    const { user, token } = userData;
    localStorage.setItem('logistics_app_token', token);
    localStorage.setItem('logistics_app_user', JSON.stringify(user));
    dispatch({ type: 'LOGIN', payload: { user, token } });
  };

  const logout = () => {
    logoutUtil();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const value = {
    ...state,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};