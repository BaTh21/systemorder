// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      setLoading(false);
      return;
    }
    
    // Check if it's an old invalid token
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('Token payload:', payload);
        
        // Check if it's the old token with "sub": "3"
        if (payload.sub === '3' || !payload.sub.includes('-')) {
          console.warn('⚠️ OLD TOKEN DETECTED - Clearing...');
          localStorage.removeItem('access_token');
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Invalid token format, clearing...');
      localStorage.removeItem('access_token');
      setLoading(false);
      return;
    }
    
    // Token looks valid, fetch user
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token } = response.data;
    
    // Verify new token
    try {
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      console.log('✅ Login successful, user ID:', payload.sub);
    } catch(e) {}
    
    localStorage.setItem('access_token', access_token);
    await fetchUser();
    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    const { access_token } = response.data;
    
    // Verify new token
    try {
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      console.log('✅ Registration successful, user ID:', payload.sub);
    } catch(e) {}
    
    localStorage.setItem('access_token', access_token);
    await fetchUser();
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};