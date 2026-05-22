import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dbService } from '../firebase';
import { formatDistance, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Clock, Trash2, Plus, Zap, Play, CheckCircle, XCircle, Edit, Copy, Save } from 'lucide-react';

const LeaderDashboard = ({ projectId, project, onProjectDeleted }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activities, setActivities] = useState([]); // These are now 'Objetivos'
  
  // Modals / Forms
  const [showNewActModal, setShowNewActModal] = useState(false);
  const [newAct, setNewAct] = useState({ 
    title: '', 
    description: '', 
    assignedTo: '',
    type: 'normal',
    targetAmount: '',
    deadline: ''
  });

  const [editActModal, setEditActModal] = useState(null); // stores activity to edit

  useEffect(() => {
    if (projectId) {
      const unsubActs = dbService.subscribeToActivities(projectId, (acts) => {
        const sorted = acts.sort((a, b) => {
          if (a.status === b.status) return b.createdAt - a.createdAt;
          if (a.status === 'submitted') return -1;
          if (a.status === 'pending') return 0;
          return 1;
        });
        setActivities(sorted);
      });

      return () => { unsubActs(); };
    }
  }, [projectId]);

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!newAct.title.trim() || !project) return;
    
    const deadlineMs = newAct.deadline ? new Date(newAct.deadline).getTime() : null;
    const targetAmt = newAct.type === 'numerical' ? Number(newAct.targetAmount) : null;

    await dbService.createActivity(
      project.id, 
      newAct.title, 
      newAct.description, 
      newAct.assignedTo || null,
      newAct.type,
      targetAmt,
      deadlineMs
    );

    showToast('Objetivo creado con éxito');

    setNewAct({ title: '', description: '', assignedTo: '', type: 'normal', targetAmount: '', deadline: '' });
    setShowNewActModal(false);
  };

  const handleSaveAsRoutine = async () => {
    // Save this current Project (Actividad) and its current Activities (Objetivos) as a routine
    try {
      const currentActs = await dbService.getActivitiesForProject(project.id);
      await dbService.createProjectRoutine(user.id, project.name, currentActs);
      showToast('Actividad guardada como Rutina exitosamente');
    } catch (error) {
      console.error(error);
      showToast('Error al guardar rutina', 'error');
    }
  };

  const handleDeleteActivity = async (actId) => {
    if (window.confirm('¿Seguro que deseas eliminar este objetivo?')) {
      await dbService.deleteActivity(actId);
      showToast('Objetivo eliminado');
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm('¿ELIMINAR ACTIVIDAD? Esto borrará todos los objetivos y desconectará a los ayudantes.')) {
      await dbService.deleteProject(project.id);
      if (onProjectDeleted) onProjectDeleted();
    }
  };

  const handleAutoAssign = async () => {
    if (!project.helpers || project.helpers.length === 0) {
      alert("No hay ayudantes en esta actividad para asignar objetivos.");
      return;
    }
    
    const unassignedActs = activities.filter(a => a.status === 'pending' && !a.assignedTo);
    if (unassignedActs.length === 0) {
      showToast('No hay objetivos pendientes sin asignar', 'error');
      return;
    }

    let helperIndex = 0;
    const helpersCount = project.helpers.length;

    for (const act of unassignedActs) {
      if (act.type === 'numerical' && act.targetAmount) {
        // Divide into pieces
        const pieceAmount = Math.floor(act.targetAmount / helpersCount);
        const remainder = act.targetAmount % helpersCount;
        
        await dbService.deleteActivity(act.id);
        
        for (let i = 0; i < helpersCount; i++) {
          const helper = project.helpers[i];
          const amountForThis = i === 0 ? pieceAmount + remainder : pieceAmount;
          if (amountForThis > 0) {
            await dbService.createActivity(
              project.id, 
              `${act.title} (Parte)`, 
              act.description, 
              helper.id, 
              'numerical', 
              amountForThis, 
              act.deadline
            );
          }
        }
      } else {
        const helper = project.helpers[helperIndex];
        await dbService.updateActivity(act.id, { assignedTo: helper.id });
        helperIndex = (helperIndex + 1) % helpersCount;
      }
    }
    showToast(`Asignación automática de objetivos completada`);
  };

  const handleApprove = async (act) => {
    await dbService.completeActivity(act);
    showToast('Objetivo aprobado y completado');
  };

  const handleReturn = async (act) => {
    let newAmt = act.currentAmount;
    if (act.type === 'numerical') {
      const p = window.prompt("Ingresa el valor numérico correcto o déjalo igual para devolverlo:", act.currentAmount);
      if (p === null) return; // cancel
      if (!isNaN(Number(p))) {
        newAmt = Number(p);
      }
    }
    await dbService.returnActivity(act.id, newAmt);
    showToast('Objetivo devuelto al ayudante');
  };

  const handleEditActivity = async (e) => {
    e.preventDefault();
    if (!editActModal.title.trim()) return;

    const updates = {
      title: editActModal.title,
      description: editActModal.description,
      type: editActModal.type,
      assignedTo: editActModal.assignedTo || null,
      targetAmount: editActModal.type === 'numerical' ? Number(editActModal.targetAmount) : null,
      deadline: editActModal.deadline ? new Date(editActModal.deadline).getTime() : null,
    };
    
    await dbService.updateActivity(editActModal.id, updates);
    showToast('Objetivo actualizado');
    setEditActModal(null);
  };

  const getHelperName = (id) => {
    const h = project?.helpers?.find(h => h.id === id);
    return h ? h.name : 'Desconocido';
  };

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

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Panel de Control de la Actividad: {project.name}</h2>
          <p>Gestiona esta actividad y monitorea el progreso de los objetivos</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={handleSaveAsRoutine} title="Guardar como Rutina para futuro">
            <Save size={20} /> Guardar como Rutina
          </button>
          <button className="btn btn-danger" onClick={handleDeleteProject} title="Eliminar Actividad">
            <Trash2 size={20} /> Eliminar Actividad
          </button>
        </div>
      </div>

      {project && (
        <>
          <div className="grid-2">
            <div>
              <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
                <div className="card-header">
                  <h3 className="card-title">
                    <Play size={24} /> Objetivos de esta Actividad
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handleAutoAssign} title="Asignación Automática (Equitativa)">
                      <Zap size={18} /> Auto-asignar
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowNewActModal(true)}>
                      <Plus size={18} /> Nuevo Objetivo
                    </button>
                  </div>
                </div>

                {activities.length === 0 && !showNewActModal ? (
                  <div className="empty-state">
                    <p>No hay objetivos creados. ¡Crea uno para comenzar!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Inline Create Form */}
                    {showNewActModal && (
                      <div className="list-item" style={{ flexDirection: 'column', gap: '1rem', background: 'var(--surface-color-light)', borderLeft: '4px solid var(--primary-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>Nuevo Objetivo</h4>
                          <button className="btn-icon" onClick={() => setShowNewActModal(false)}><XCircle size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateActivity} style={{ width: '100%' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label>Título del objetivo</label>
                                <input type="text" className="input-field" value={newAct.title} onChange={e => setNewAct({...newAct, title: e.target.value})} required />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label>Descripción (opcional)</label>
                                <textarea className="input-field" rows="2" value={newAct.description} onChange={e => setNewAct({...newAct, description: e.target.value})}></textarea>
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label>Tipo de Objetivo</label>
                                <select className="input-field select-field" value={newAct.type} onChange={e => setNewAct({...newAct, type: e.target.value})}>
                                  <option value="normal">Normal (Checkbox)</option>
                                  <option value="numerical">Numérico (Cantidad)</option>
                                </select>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {newAct.type === 'numerical' && (
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label>Meta Numérica</label>
                                  <input type="number" className="input-field" min="1" value={newAct.targetAmount} onChange={e => setNewAct({...newAct, targetAmount: e.target.value})} required />
                                </div>
                              )}
                              <div className="form-group" style={{ margin: 0 }}>
                                <label>Fecha Límite (opcional)</label>
                                <input type="datetime-local" className="input-field" value={newAct.deadline} onChange={e => setNewAct({...newAct, deadline: e.target.value})} />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label>Asignar a (opcional)</label>
                                <select className="input-field select-field" value={newAct.assignedTo} onChange={e => setNewAct({...newAct, assignedTo: e.target.value})}>
                                  <option value="">-- Sin asignar --</option>
                                  {project?.helpers?.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowNewActModal(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Crear Objetivo</button>
                          </div>
                        </form>
                      </div>
                    )}

                    {activities.map(act => {
                      const isOverdue = act.deadline && Date.now() > act.deadline;
                      const isEditing = editActModal && editActModal.id === act.id;

                      if (isEditing) {
                        return (
                          <div key={act.id} className="list-item" style={{ flexDirection: 'column', gap: '1rem', background: 'var(--surface-color-light)', borderLeft: '4px solid var(--secondary-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ margin: 0, color: 'var(--secondary-color)' }}>Editando: {act.title}</h4>
                              <button className="btn-icon" onClick={() => setEditActModal(null)}><XCircle size={20} /></button>
                            </div>
                            <form onSubmit={handleEditActivity} style={{ width: '100%' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  <div className="form-group" style={{ margin: 0 }}>
                                    <label>Título</label>
                                    <input type="text" className="input-field" value={editActModal.title} onChange={e => setEditActModal({...editActModal, title: e.target.value})} required />
                                  </div>
                                  <div className="form-group" style={{ margin: 0 }}>
                                    <label>Descripción</label>
                                    <textarea className="input-field" rows="2" value={editActModal.description || ''} onChange={e => setEditActModal({...editActModal, description: e.target.value})}></textarea>
                                  </div>
                                  <div className="form-group" style={{ margin: 0 }}>
                                    <label>Tipo de Objetivo</label>
                                    <select className="input-field select-field" value={editActModal.type} onChange={e => setEditActModal({...editActModal, type: e.target.value})}>
                                      <option value="normal">Normal (Checkbox)</option>
                                      <option value="numerical">Numérico (Cantidad)</option>
                                    </select>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {editActModal.type === 'numerical' && (
                                    <div className="form-group" style={{ margin: 0 }}>
                                      <label>Meta Numérica</label>
                                      <input type="number" className="input-field" min="1" value={editActModal.targetAmount || ''} onChange={e => setEditActModal({...editActModal, targetAmount: e.target.value})} required />
                                    </div>
                                  )}
                                  <div className="form-group" style={{ margin: 0 }}>
                                    <label>Fecha Límite (opcional)</label>
                                    <input type="datetime-local" className="input-field" value={editActModal.deadline || ''} onChange={e => setEditActModal({...editActModal, deadline: e.target.value})} />
                                  </div>
                                  <div className="form-group" style={{ margin: 0 }}>
                                    <label>Asignar a (opcional)</label>
                                    <select className="input-field select-field" value={editActModal.assignedTo || ''} onChange={e => setEditActModal({...editActModal, assignedTo: e.target.value})}>
                                      <option value="">-- Sin asignar --</option>
                                      {project?.helpers?.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setEditActModal(null)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
                              </div>
                            </form>
                          </div>
                        )
                      }

                      return (
                      <div key={act.id} className="list-item" style={{ border: isOverdue && act.status === 'pending' ? '1px solid var(--danger-color)' : 'none', marginBottom: 0 }}>
                        <div className="item-content">
                          <h4>{act.title}</h4>
                          <p>{act.description}</p>
                          {act.type === 'numerical' && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--primary-color)' }}>
                              Meta: {act.targetAmount} | Actual: {act.currentAmount || 0}
                            </p>
                          )}
                          <div className="item-meta">
                            {act.status === 'completed' ? (
                              <span className="badge badge-completed">Completado</span>
                            ) : act.status === 'submitted' ? (
                              <span className="badge badge-pending" style={{ background: 'var(--primary-hover)' }}>Revisión Pendiente</span>
                            ) : (
                              <span className={act.assignedTo ? "badge badge-pending" : "badge badge-unassigned"} style={isOverdue ? {background: 'var(--danger-color)', color: 'white'} : {}}>
                                {isOverdue ? 'Vencido' : act.assignedTo ? "En progreso" : "Sin asignar"}
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
                          
                          {/* Botones de Aprobación */}
                          {act.status === 'submitted' && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                              <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }} onClick={() => handleApprove(act)}>
                                <CheckCircle size={14} /> Aprobar
                              </button>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }} onClick={() => handleReturn(act)}>
                                <XCircle size={14} /> Devolver
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="item-actions">
                          <button 
                            className="btn-icon" 
                            style={{ color: 'var(--text-secondary)' }}
                            onClick={() => {
                              setShowNewActModal(false);
                              setEditActModal({
                                ...act,
                                deadline: act.deadline ? new Date(act.deadline).toISOString().slice(0, 16) : ''
                              });
                            }}
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            className="btn-icon" 
                            style={{ color: 'var(--danger-color)' }}
                            onClick={() => handleDeleteActivity(act.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
                <h3 className="card-title" style={{ marginBottom: '1rem' }}>Invitar Ayudantes</h3>
                <div className="join-code-box">
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Código de la Actividad</p>
                  <h3>{project.joinCode}</h3>
                </div>
                
                <h4 style={{ marginBottom: '1rem', marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
                  Equipo Actual ({project.helpers?.length || 0})
                </h4>
                {(!project.helpers || project.helpers.length === 0) ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Aún no se ha unido nadie.</p>
                ) : (
                  <ul style={{ listStyle: 'none' }}>
                    {project.helpers.map(h => (
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
                    <div className="metric-label">Objetivos Cumplidos</div>
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



    </div>
  );
};

export default LeaderDashboard;
