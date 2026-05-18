import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../firebase';
import { formatDistance, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Clock, Trash2, Plus, Zap, AlertTriangle, Play } from 'lucide-react';

const LeaderDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / Forms
  const [showNewActModal, setShowNewActModal] = useState(false);
  const [newAct, setNewAct] = useState({ title: '', description: '', assignedTo: '' });

  useEffect(() => {
    loadProjects();
  }, [user.id]);

  useEffect(() => {
    if (currentProject) {
      const unsubscribe = dbService.subscribeToActivities(currentProject.id, (acts) => {
        // Ordenar: Pendientes primero, luego Completadas
        const sorted = acts.sort((a, b) => {
          if (a.status === b.status) return b.createdAt - a.createdAt;
          return a.status === 'pending' ? -1 : 1;
        });
        setActivities(sorted);
      });
      return () => unsubscribe();
    }
  }, [currentProject]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const proj = await dbService.getProjectsForLeader(user.id);
      setProjects(proj);
      if (proj.length > 0 && !currentProject) {
        setCurrentProject(proj[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!newAct.title.trim() || !currentProject) return;
    
    await dbService.createActivity(
      currentProject.id, 
      newAct.title, 
      newAct.description, 
      newAct.assignedTo || null
    );
    setNewAct({ title: '', description: '', assignedTo: '' });
    setShowNewActModal(false);
  };

  const handleDeleteActivity = async (actId) => {
    if (window.confirm('¿Seguro que deseas eliminar esta actividad?')) {
      await dbService.deleteActivity(actId);
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm('¿ELIMINAR PROYECTO? Esto borrará todas las actividades y desconectará a los ayudantes.')) {
      await dbService.deleteProject(currentProject.id);
      setCurrentProject(null);
      loadProjects();
    }
  };

  const handleAutoAssign = async () => {
    if (!currentProject.helpers || currentProject.helpers.length === 0) {
      alert("No hay ayudantes en este proyecto para asignar tareas.");
      return;
    }
    
    const unassignedActs = activities.filter(a => a.status === 'pending' && !a.assignedTo);
    if (unassignedActs.length === 0) return;

    let helperIndex = 0;
    const helpersCount = currentProject.helpers.length;

    // Asignación Round-Robin
    for (const act of unassignedActs) {
      const helper = currentProject.helpers[helperIndex];
      await dbService.updateActivity(act.id, { assignedTo: helper.id });
      helperIndex = (helperIndex + 1) % helpersCount;
    }
    alert(`Se asignaron ${unassignedActs.length} tareas automáticamente.`);
  };

  const getHelperName = (id) => {
    const h = currentProject?.helpers?.find(h => h.id === id);
    return h ? h.name : 'Desconocido';
  };

  // Metrics calculation
  const completedActs = activities.filter(a => a.status === 'completed');
  const avgTimeMs = completedActs.length > 0 
    ? completedActs.reduce((acc, curr) => acc + curr.timeTakenMs, 0) / completedActs.length 
    : 0;
  
  const formatTime = (ms) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) return <div className="empty-state">Cargando...</div>;

  if (projects.length === 0) {
    return (
      <div className="empty-state glass-panel">
        <AlertTriangle size={48} />
        <h2>Aún no tienes proyectos</h2>
        <p>Parece que has iniciado sesión como jefe pero no tienes proyectos.</p>
        <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Recargar página</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Panel de Control</h2>
          <p>Gestiona tus proyectos y monitorea el progreso</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            className="input-field select-field"
            value={currentProject?.id || ''}
            onChange={(e) => setCurrentProject(projects.find(p => p.id === e.target.value))}
            style={{ width: '250px' }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="btn btn-danger" onClick={handleDeleteProject} title="Eliminar Proyecto Actual">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {currentProject && (
        <>
          <div className="grid-2">
            <div>
              <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
                <div className="card-header">
                  <h3 className="card-title">
                    <Play size={24} /> Actividades del Proyecto
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handleAutoAssign} title="Asignación Automática (Equitativa)">
                      <Zap size={18} /> Auto-asignar
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowNewActModal(true)}>
                      <Plus size={18} /> Nueva Actividad
                    </button>
                  </div>
                </div>

                {activities.length === 0 ? (
                  <div className="empty-state">
                    <p>No hay actividades creadas. ¡Crea una para comenzar!</p>
                  </div>
                ) : (
                  <div>
                    {activities.map(act => (
                      <div key={act.id} className="list-item">
                        <div className="item-content">
                          <h4>{act.title}</h4>
                          <p>{act.description}</p>
                          <div className="item-meta">
                            {act.status === 'completed' ? (
                              <span className="badge badge-completed">Completada</span>
                            ) : (
                              <span className={act.assignedTo ? "badge badge-pending" : "badge badge-unassigned"}>
                                {act.assignedTo ? "En progreso" : "Sin asignar"}
                              </span>
                            )}
                            
                            {act.assignedTo && (
                              <span>
                                <Users size={14} /> 
                                {getHelperName(act.assignedTo)}
                              </span>
                            )}
                            
                            <span>
                              <Clock size={14} /> 
                              {format(new Date(act.createdAt), "dd MMM HH:mm", { locale: es })}
                            </span>
                            
                            {act.status === 'completed' && (
                              <span style={{ color: 'var(--success-color)' }}>
                                ✓ Tomó {formatTime(act.timeTakenMs)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="item-actions">
                          <button 
                            className="btn-icon" 
                            style={{ color: 'var(--danger-color)' }}
                            onClick={() => handleDeleteActivity(act.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
                <h3 className="card-title" style={{ marginBottom: '1rem' }}>Invitar Ayudantes</h3>
                <div className="join-code-box">
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Código del Proyecto</p>
                  <h3>{currentProject.joinCode}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Comparte este código con tu equipo</p>
                </div>
                
                <h4 style={{ marginBottom: '1rem', marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
                  Equipo Actual ({currentProject.helpers?.length || 0})
                </h4>
                {(!currentProject.helpers || currentProject.helpers.length === 0) ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Aún no se ha unido nadie.</p>
                ) : (
                  <ul style={{ listStyle: 'none' }}>
                    {currentProject.helpers.map(h => (
                      <li key={h.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--surface-color-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-color)' }}></div>
                        {h.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card glass-panel">
                <h3 className="card-title" style={{ marginBottom: '1rem' }}>Métricas de Rendimiento</h3>
                <div className="metrics-box">
                  <div className="metric-item">
                    <div className="metric-value">{completedActs.length}</div>
                    <div className="metric-label">Completadas</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value">{formatTime(avgTimeMs)}</div>
                    <div className="metric-label">Tiempo Promedio</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Nueva Actividad */}
      {showNewActModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel card animate-fade-in">
            <button className="modal-close" onClick={() => setShowNewActModal(false)}>✕</button>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Nueva Actividad</h3>
            <form onSubmit={handleCreateActivity}>
              <div className="form-group">
                <label>Título de la actividad</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newAct.title}
                  onChange={e => setNewAct({...newAct, title: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción (opcional)</label>
                <textarea 
                  className="input-field" 
                  rows="3"
                  value={newAct.description}
                  onChange={e => setNewAct({...newAct, description: e.target.value})}
                ></textarea>
              </div>
              <div className="form-group">
                <label>Asignar a (opcional)</label>
                <select 
                  className="input-field select-field"
                  value={newAct.assignedTo}
                  onChange={e => setNewAct({...newAct, assignedTo: e.target.value})}
                >
                  <option value="">-- Sin asignar --</option>
                  {currentProject?.helpers?.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Crear Actividad</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderDashboard;
