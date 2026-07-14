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
    
    // Check if token is valid JWT format
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('⚠️ Invalid token format - Clearing...');
        localStorage.removeItem('access_token');
        setLoading(false);
        return;
      }
      
      // Decode payload
      const payload = JSON.parse(atob(parts[1]));
      console.log('Token payload:', payload);
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.warn('⚠️ Token expired - Clearing...');
        localStorage.removeItem('access_token');
        setLoading(false);
        return;
      }
      
      // Token looks valid, fetch user
      fetchUser();
    } catch (e) {
      console.error('Error parsing token, clearing...', e);
      localStorage.removeItem('access_token');
      setLoading(false);
    }
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
    
    // Verify new token format
    try {
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      console.log('✅ Login successful, user ID:', payload.sub);
    } catch(e) {
      console.error('Invalid token received from server');
    }
    
    localStorage.setItem('access_token', access_token);
    await fetchUser();
    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    const { access_token } = response.data;
    
    // Verify new token format
    try {
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      console.log('✅ Registration successful, user ID:', payload.sub);
    } catch(e) {
      console.error('Invalid token received from server');
    }
    
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