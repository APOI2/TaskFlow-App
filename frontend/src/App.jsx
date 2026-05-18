import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Welcome from './pages/Welcome';
import LeaderDashboard from './pages/LeaderDashboard';
import HelperDashboard from './pages/HelperDashboard';
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
        <span className="user-role">
          {user.role === 'leader' ? 'Jefe / Líder' : 'Ayudante'}
        </span>
        <span>{user.name}</span>
        <button onClick={logout} className="logout-btn" title="Cerrar sesión">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
};

const ProtectedRoute = ({ children, roleRequired }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/" replace />;
  if (roleRequired && user.role !== roleRequired) {
    // Redirigir al dashboard correcto si el rol no coincide
    return <Navigate to={user.role === 'leader' ? "/leader" : "/helper"} replace />;
  }
  
  return children;
};

const MainRouter = () => {
  const { user } = useAuth();

  return (
    <div className="app-container">
      <NavigationBar />
      <main className="main-content">
        <Routes>
          <Route 
            path="/" 
            element={
              user ? (
                <Navigate to={user.role === 'leader' ? "/leader" : "/helper"} replace />
              ) : (
                <Welcome />
              )
            } 
          />
          <Route 
            path="/leader" 
            element={
              <ProtectedRoute roleRequired="leader">
                <LeaderDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/helper" 
            element={
              <ProtectedRoute roleRequired="helper">
                <HelperDashboard />
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
