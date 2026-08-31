import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('secure_exam_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('secure_exam_token') || null);
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const res = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;
      const userPayload = {
        id: data.user_id,
        username: data.username,
        role: data.role,
        full_name: data.full_name,
      };

      setToken(data.access_token);
      setUser(userPayload);

      localStorage.setItem('secure_exam_token', data.access_token);
      localStorage.setItem('secure_exam_user', JSON.stringify(userPayload));

      return { success: true };
    } catch (err) {
      const detail = err.response?.data?.detail || 'Authentication failed.';
      return { success: false, error: detail };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('secure_exam_token');
    localStorage.removeItem('secure_exam_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
