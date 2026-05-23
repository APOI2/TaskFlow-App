import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dbService } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, LogIn, Briefcase, Users, Play, Trash2, Copy } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [leaderProjects, setLeaderProjects] = useState([]);
  const [helperProjects, setHelperProjects] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [projectHistory, setProjectHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    loadAllProjects();
    const unsubRout = dbService.subscribeToProjectRoutines(user.id, (routs) => setRoutines(routs));
    return () => unsubRout();
  }, [user.id]);

  const loadAllProjects = async () => {
    try {
      setLoading(true);
      const [lProj, hProj, history] = await Promise.all([
        dbService.getProjectsForLeader(user.id),
        dbService.getProjectsForHelper(user.id),
        dbService.getProjectHistory(user.id)
      ]);
      setLeaderProjects(lProj);
      setHelperProjects(hProj);
      setProjectHistory(history);
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
      setJoinError(err.message || 'Error al unirse a la actividad');
    }
  };

  const handleDeployRoutine = async (routineId) => {
    try {
      const newProj = await dbService.deployProjectRoutine(user.id, routineId);
      showToast('Actividad desplegada desde la rutina exitosamente', 'success');
      navigate(`/project/${newProj.id}`);
    } catch (err) {
      console.error(err);
      showToast('Error al desplegar rutina', 'error');
    }
  };

  const handleDeleteRoutine = async (routineId) => {
    if (window.confirm('¿Seguro que deseas eliminar esta rutina guardada?')) {
      await dbService.deleteProjectRoutine(routineId);
      showToast('Rutina eliminada', 'success');
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('¿Seguro que deseas borrar TODO el historial de actividades?')) {
      await dbService.clearProjectHistory(user.id);
      setProjectHistory([]);
      showToast('Historial borrado');
    }
  };

  const handleDeleteHistoryItem = async (id) => {
    if (window.confirm('¿Borrar este registro del historial?')) {
      await dbService.deleteProjectHistoryItem(id);
      setProjectHistory(prev => prev.filter(h => h.id !== id));
      showToast('Registro borrado');
    }
  };

  if (loading) return <div className="empty-state">Cargando tus actividades...</div>;

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Tus Actividades</h2>
          <p>Gestiona las actividades que lideras y en las que colaboras</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
            <LogIn size={20} /> Unirse
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <PlusCircle size={20} /> Crear Actividad
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div>
          {/* Leader Projects */}
          <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
            <h3 className="card-title" style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
              <Briefcase size={24} /> Actividades que Lideras
            </h3>
            {leaderProjects.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No lideras ninguna actividad actualmente.</p>
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

          {/* Project Routines */}
          <div className="card glass-panel">
            <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>
              <Copy size={24} /> Actividades Rutinarias Guardadas
            </h3>
            {routines.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No tienes actividades rutinarias guardadas. Entra a una actividad y dale clic en "Guardar como Rutina".</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {routines.map(r => (
                  <div 
                    key={r.id} 
                    className="list-item" 
                    style={{ background: 'var(--surface-color-light)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <h4>{r.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contiene {r.activities ? r.activities.length : 0} objetivos predefinidos</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-icon" style={{ color: 'var(--primary-color)' }} onClick={() => handleDeployRoutine(r.id)} title="Desplegar Actividad">
                        <Play size={20} />
                      </button>
                      <button className="btn-icon" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteRoutine(r.id)} title="Eliminar Rutina">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Helper Projects */}
        <div className="card glass-panel" style={{ height: 'fit-content' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem', color: 'var(--secondary-color)' }}>
            <Users size={24} /> Actividades en las que Colaboras
          </h3>
          {helperProjects.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No estás colaborando en ninguna actividad.</p>
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

      {/* Historial Section */}
      <div className="card glass-panel" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Historial de Actividades Concluidas</h3>
          {projectHistory.length > 0 && (
            <button className="btn btn-danger" onClick={handleClearHistory} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
              Limpiar Historial
            </button>
          )}
        </div>
        
        {projectHistory.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Aún no hay actividades en el historial.</p>
        ) : (
          <div className="grid-2">
            {projectHistory.map(h => {
              let badgeColor = 'var(--text-secondary)';
              let label = h.outcome;
              if (h.outcome === 'exitosa') { badgeColor = 'var(--success-color)'; label = 'Exitosa'; }
              if (h.outcome === 'parcial') { badgeColor = 'var(--primary-color)'; label = 'Parcialmente Hecha'; }
              if (h.outcome === 'ignorada') { badgeColor = 'var(--secondary-color)'; label = 'Ignorada'; }
              if (h.outcome === 'borrada') { badgeColor = 'var(--danger-color)'; label = 'Borrada'; }

              return (
                <div key={h.id} className="list-item" style={{ borderLeft: `4px solid ${badgeColor}`, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>{h.projectName}</h4>
                      <span className="badge" style={{ background: badgeColor, color: 'white' }}>{label}</span>
                    </div>
                    {h.stats && h.stats.total !== undefined && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {h.stats.completed !== undefined ? `${h.stats.completed} de ` : ''}{h.stats.total} objetivos completados
                      </p>
                    )}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      Finalizada: {new Date(h.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="btn-icon" onClick={() => handleDeleteHistoryItem(h.id)} title="Eliminar registro" style={{ marginLeft: '1rem' }}>
                    <Trash2 size={18} style={{ color: 'var(--danger-color)' }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel card animate-fade-in">
            <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            <h3 style={{ marginBottom: '1.5rem' }}>Crear Actividad</h3>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>Nombre de la Actividad</label>
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
            <h3 style={{ marginBottom: '1.5rem' }}>Unirse a Actividad</h3>
            <form onSubmit={handleJoinProject}>
              <div className="form-group">
                <label>Código de la Actividad</label>
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
