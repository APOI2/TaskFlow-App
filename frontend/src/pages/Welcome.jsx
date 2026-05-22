import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../firebase';
import { Activity, LogIn, UserPlus } from 'lucide-react';

const Welcome = () => {
  const { loginUser } = useAuth();
  const [view, setView] = useState('login'); // login, register
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const userData = await authService.login(email, password);
      loginUser(userData);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al iniciar sesión.");
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const userData = await authService.register(email, password, name);
      loginUser(userData);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al registrarse.");
      setLoading(false);
    }
  };

  return (
    <div className="landing-wrapper">
      <div className="glass-panel auth-card animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
          <Activity size={48} />
        </div>
        <h1>GTI katana</h1>
        <p>Gestión inteligente de actividades y proyectos</p>

        {view === 'login' ? (
          <form onSubmit={handleLogin} className="animate-fade-in" style={{ marginTop: '2rem' }}>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="ejemplo@correo.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Tu contraseña" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
            {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              <LogIn size={20} /> {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
              ¿No tienes una cuenta? <button type="button" className="btn-link" onClick={() => { setView('register'); setError(''); }}>Regístrate aquí</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="animate-fade-in" style={{ marginTop: '2rem' }}>
            <div className="form-group">
              <label>Nombre Completo</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ej. Ana García" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="ejemplo@correo.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Crea una contraseña" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
            {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            
            <button type="submit" className="btn btn-secondary" disabled={loading} style={{ width: '100%' }}>
              <UserPlus size={20} /> {loading ? 'Registrando...' : 'Crear Cuenta'}
            </button>
            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
              ¿Ya tienes una cuenta? <button type="button" className="btn-link" onClick={() => { setView('login'); setError(''); }}>Inicia sesión</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Welcome;
