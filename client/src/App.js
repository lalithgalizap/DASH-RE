import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute, AdminOrCSPRoute } from './components/ProtectedRoute';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import Portfolio from './pages/Portfolio';
import Clients from './pages/Clients';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import WeeklyUpdates from './pages/WeeklyUpdates';
import Performance from './pages/Performance';
import './App.css';

// Redirects Resource role to /weekly-updates, everyone else to /
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role_name === 'Resource' || user?.role === 'Resource') {
    return <Navigate to="/weekly-updates" replace />;
  }
  return (
    <ProtectedRoute requirePermission resource="dashboard" action="view">
      <Dashboard />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Header />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RootRedirect />} />
            <Route path="/project/:id" element={
              <ProtectedRoute requirePermission resource="projects" action="view">
                <ProjectDetail />
              </ProtectedRoute>
            } />
            <Route path="/portfolio" element={
              <ProtectedRoute requirePermission resource="portfolio" action="view">
                <Portfolio />
              </ProtectedRoute>
            } />
            <Route path="/weekly-updates" element={
              <ProtectedRoute requirePermission resource="weekly_updates" action="view">
                <WeeklyUpdates />
              </ProtectedRoute>
            } />
            <Route path="/performance" element={
              <ProtectedRoute requirePermission resource="performance" action="view" blockRoles={['Resource']}>
                <Performance />
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <AdminOrCSPRoute>
                <Clients />
              </AdminOrCSPRoute>
            } />
            <Route path="/admin/users" element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            } />
            <Route path="/admin/roles" element={
              <AdminRoute>
                <RoleManagement />
              </AdminRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
