import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { setUnauthorizedHandler } from '../api/client';

/**
 * AuthContext — holds the current user + token, exposes login/logout.
 * Token is persisted in expo-secure-store (encrypted on device).
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- logout (wrapped in useCallback so interceptor can rely on it) ---
  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setToken(null);
    setUser(null);
  }, []);

  // On mount — hydrate from SecureStore
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          SecureStore.getItemAsync('token'),
          SecureStore.getItemAsync('user'),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.warn('Failed to restore session', err.message);
      } finally {
        setLoading(false);
      }
    })();

    setUnauthorizedHandler(() => logout());
  }, [logout]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (!data?.token || !data?.user) {
      throw new Error('Invalid response from server');
    }
    await SecureStore.setItemAsync('token', data.token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
