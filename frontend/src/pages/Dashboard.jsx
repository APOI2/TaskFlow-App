import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, LogIn, Layout, Briefcase, Users, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderProjects, setLeaderProjects] = useState([]);
  const [helperProjects, setHelperProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    loadAllProjects();
  }, [user.id]);

  const loadAllProjects = async () => {
    try {
      setLoading(true);
      const [lProj, hProj] = await Promise.all([
        dbService.getProjectsForLeader(user.id),
        dbService.getProjectsForHelper(user.id)
      ]);
      setLeaderProjects(lProj);
      setHelperProjects(hProj);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    try {
      const proj = await dbService.createProject(newProjectName, user.id);
      navigate(`/project/${proj.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinProject = async (e) => {
    e.preventDefault();
    if (!joinCode.trim() || !nickname.trim()) return;
    setJoinError('');
    
    try {
      const proj = await dbService.joinProject(joinCode.toUpperCase(), user.id, nickname);
      navigate(`/project/${proj.id}`);
    } catch (err) {
      setJoinError(err.message || 'Error al unirse al proyecto');
    }
  };

  if (loading) return <div className="empty-state">Cargando tus proyectos...</div>;

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Tus Proyectos</h2>
          <p>Gestiona los proyectos que lideras y en los que colaboras</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
            <LogIn size={20} /> Unirse
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <PlusCircle size={20} /> Crear Proyecto
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* Leader Projects */}
        <div className="card glass-panel">
          <h3 className="card-title" style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
            <Briefcase size={24} /> Proyectos que Lideras
          </h3>
          {leaderProjects.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No lideras ningún proyecto actualmente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {leaderProjects.map(p => (
                <div 
                  key={p.id} 
                  className="list-item" 
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => navigate(`/project/${p.id}`)}
                >
                  <div>
                    <h4>{p.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Código: {p.joinCode}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Helper Projects */}
        <div className="card glass-panel">
          <h3 className="card-title" style={{ marginBottom: '1.5rem', color: 'var(--secondary-color)' }}>
            <Users size={24} /> Proyectos en los que Colaboras
          </h3>
          {helperProjects.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No estás colaborando en ningún proyecto.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {helperProjects.map(p => (
                <div 
                  key={p.id} 
                  className="list-item" 
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => navigate(`/project/${p.id}`)}
                >
                  <div>
                    <h4>{p.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Tu apodo: {p.helpers?.find(h => h.id === user.id)?.name || 'Desconocido'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel card animate-fade-in">
            <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            <h3 style={{ marginBottom: '1.5rem' }}>Crear Proyecto</h3>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>Nombre del Proyecto</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Crear y Entrar</button>
            </form>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel card animate-fade-in">
            <button className="modal-close" onClick={() => setShowJoin(false)}>✕</button>
            <h3 style={{ marginBottom: '1.5rem' }}>Unirse a Proyecto</h3>
            <form onSubmit={handleJoinProject}>
              <div className="form-group">
                <label>Código del Proyecto</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                  maxLength={6}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tu Apodo para este Grupo</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="Ej. Carlos Dev"
                  required
                />
              </div>
              {joinError && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>{joinError}</div>}
              <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>Unirse</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
