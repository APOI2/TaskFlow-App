import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../firebase';
import { PlusCircle, LogIn, Activity } from 'lucide-react';

const Welcome = () => {
  const { login } = useAuth();
  const [view, setView] = useState('initial'); // initial, create, join
  const [name, setName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!name.trim() || !projectName.trim()) return;
    
    setLoading(true);
    try {
      // Entramos como líder de manera temporal
      login(name, 'leader');
      
      // Obtenemos el usuario simulado para obtener el ID
      const tempUser = JSON.parse(sessionStorage.getItem('authUser'));
      
      await dbService.createProject(projectName, tempUser.id);
      // Redirección manejada por AuthContext y App.js
    } catch (err) {
      console.error(err);
      setError("Error al crear el proyecto. Intenta nuevamente.");
      setLoading(false);
    }
  };

  const handleJoinProject = async (e) => {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Creamos el helper temporal
      const newUserId = Math.random().toString(36).substring(2, 10);
      
      // Intentamos unirnos
      await dbService.joinProject(joinCode.toUpperCase(), newUserId, name);
      
      // Si tuvo éxito, registramos al usuario localmente
      const newUser = { id: newUserId, name, role: 'helper' };
      sessionStorage.setItem('authUser', JSON.stringify(newUser));
      window.location.reload(); // Recargar para activar el contexto de auth de forma sucia y rápida para simulación
      
    } catch (err) {
      console.error(err);
      setError(err.message || "Código inválido o error de conexión.");
      setLoading(false);
    }
  };

  return (
    <div className="landing-wrapper">
      <div className="glass-panel auth-card animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
          <Activity size={48} />
        </div>
        <h1>TaskFlow</h1>
        <p>Gestión inteligente de actividades y proyectos</p>

        {view === 'initial' && (
          <div className="auth-actions" style={{ flexDirection: 'column' }}>
            <button 
              onClick={() => setView('create')} 
              className="btn btn-primary"
            >
              <PlusCircle size={20} /> Crear un nuevo proyecto
            </button>
            <div className="divider">o</div>
            <button 
              onClick={() => setView('join')} 
              className="btn btn-secondary"
            >
              <LogIn size={20} /> Unirte a un proyecto
            </button>
          </div>
        )}

        {view === 'create' && (
          <form onSubmit={handleCreateProject} className="animate-fade-in">
            <div className="form-group">
              <label>Tu Nombre (Jefe/Líder)</label>
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
              <label>Nombre del Proyecto</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ej. Diseño de Interfaz" 
                value={projectName} 
                onChange={(e) => setProjectName(e.target.value)} 
                required 
              />
            </div>
            {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creando...' : 'Comenzar Proyecto'}
            </button>
            <button 
              type="button" 
              className="btn btn-icon" 
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => setView('initial')}
            >
              Volver
            </button>
          </form>
        )}

        {view === 'join' && (
          <form onSubmit={handleJoinProject} className="animate-fade-in">
            <div className="form-group">
              <label>Tu Nombre (Ayudante)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ej. Carlos Mendoza" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Código del Proyecto</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ej. AB12CD" 
                value={joinCode} 
                onChange={(e) => setJoinCode(e.target.value)}
                style={{ textTransform: 'uppercase' }}
                maxLength={6}
                required 
              />
            </div>
            {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            
            <button type="submit" className="btn btn-secondary" disabled={loading}>
              {loading ? 'Conectando...' : 'Unirse al Proyecto'}
            </button>
            <button 
              type="button" 
              className="btn btn-icon" 
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => setView('initial')}
            >
              Volver
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Welcome;
