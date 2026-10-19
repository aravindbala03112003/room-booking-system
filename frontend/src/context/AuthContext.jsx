import React, { createContext, useContext, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Restore authenticated session synchronously from localStorage on initial render
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('hotel_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error('Failed to parse stored user authentication info', e);
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('hotel_token') || null;
    } catch {
      return null;
    }
  });

  const [loading] = useState(false);

  /**
   * Log in user with email & password
   */
  const login = async (email, password) => {
    const response = await axiosClient.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = response.data;

    setToken(receivedToken);
    setUser(receivedUser);

    localStorage.setItem('hotel_token', receivedToken);
    localStorage.setItem('hotel_user', JSON.stringify(receivedUser));

    return receivedUser;
  };

  /**
   * Sign up new user
   */
  const signup = async (name, email, password, role = 'user') => {
    const response = await axiosClient.post('/auth/signup', { name, email, password, role });
    const { token: receivedToken, user: receivedUser } = response.data;

    setToken(receivedToken);
    setUser(receivedUser);

    localStorage.setItem('hotel_token', receivedToken);
    localStorage.setItem('hotel_user', JSON.stringify(receivedUser));

    return receivedUser;
  };

  /**
   * Log out user
   */
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hotel_token');
    localStorage.removeItem('hotel_user');
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
