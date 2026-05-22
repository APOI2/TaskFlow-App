import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import { LogOut, Activity } from 'lucide-react';
import './App.css';

const NavigationBar = () => {
  const { user, logout } = useAuth();
  
  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Activity size={28} />
        <span>TaskFlow</span>
      </div>
      <div className="user-info">
        <span>{user.name}</span>
        <button onClick={logout} className="logout-btn" title="Cerrar sesión">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; // or a spinner
  if (!user) return <Navigate to="/" replace />;
  
  return children;
};

const MainRouter = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="app-container">
      <NavigationBar />
      <main className="main-content">
        <Routes>
          <Route 
            path="/" 
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Welcome />
              )
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/project/:id" 
            element={
              <ProtectedRoute>
                <ProjectView />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainRouter />
      </Router>
    </AuthProvider>
  );
}

export default App;
