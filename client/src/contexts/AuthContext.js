import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { token, user } = response.data;
      
      setAuthToken(token);
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    setAuthToken(token);
    
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const hasPermission = (resource, action) => {
    if (!user || !user.permissions) return false;
    // Permissions are stored as strings like "view_dashboard", "manage_projects"
    const requiredPermission = `${action}_${resource}`;
    return user.permissions.includes(requiredPermission);
  };

  const isAdmin = () => {
    // Check if user has Admin role
    return user?.role === 'Admin' || user?.role_name === 'Admin';
  };

  const isManager = () => {
    return user?.role === 'Manager' || user?.role_name === 'Manager';
  };

  const isCSP = () => {
    return user?.role === 'CSP' || user?.role_name === 'CSP';
  };

  const canManagePerformance = () => {
    return hasPermission('performance', 'manage') || isAdmin() || isCSP();
  };

  const canAddClients = () => {
    return hasPermission('clients', 'manage') ||
           user?.role === 'Admin' || user?.role_name === 'Admin' ||
           user?.role === 'Superuser' || user?.role_name === 'Superuser';
  };

  const canManageWeeklyUpdates = () => {
    return hasPermission('weekly_updates', 'manage') || isAdmin() || isCSP();
  };

  const canViewGlobalWeeklyUpdates = () => {
    return hasPermission('weekly_updates', 'view_global') || isAdmin() || isCSP();
  };

  const canViewGlobalPerformance = () => {
    return hasPermission('performance', 'view_global') || isAdmin() || isCSP();
  };

  // Forgot password methods
  const sendResetCode = async (email) => {
    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to send reset code' 
      };
    }
  };

  const verifyResetCode = async (email, code) => {
    try {
      const response = await axios.post('/api/auth/verify-reset-code', { email, code });
      return { success: true, resetToken: response.data.resetToken };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Invalid or expired code' 
      };
    }
  };

  const resetPassword = async (resetToken, newPassword) => {
    try {
      const response = await axios.post('/api/auth/reset-password', { 
        resetToken, 
        newPassword 
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to reset password' 
      };
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    hasPermission,
    isAdmin,
    isManager,
    isCSP,
    canManagePerformance,
    canAddClients,
    canManageWeeklyUpdates,
    canViewGlobalWeeklyUpdates,
    canViewGlobalPerformance,
    checkAuth,
    sendResetCode,
    verifyResetCode,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
