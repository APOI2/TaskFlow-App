import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../firebase';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Clock, Layout } from 'lucide-react';

const HelperDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [user.id]);

  useEffect(() => {
    if (currentProject) {
      const unsubscribe = dbService.subscribeToActivities(currentProject.id, (acts) => {
        // Filtrar solo las asignadas a este ayudante
        const myActs = acts.filter(a => a.assignedTo === user.id);
        
        // Ordenar: Pendientes primero
        const sorted = myActs.sort((a, b) => {
          if (a.status === b.status) return b.createdAt - a.createdAt;
          return a.status === 'pending' ? -1 : 1;
        });
        setActivities(sorted);
      });
      return () => unsubscribe();
    } else {
      setActivities([]);
    }
  }, [currentProject, user.id]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const proj = await dbService.getProjectsForHelper(user.id);
      setProjects(proj);
      
      // Si el proyecto actual ya no existe (ej. el jefe lo borró), deseleccionar
      if (currentProject && !proj.find(p => p.id === currentProject.id)) {
        setCurrentProject(null);
      } else if (proj.length > 0 && !currentProject) {
        setCurrentProject(proj[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteActivity = async (act) => {
    await dbService.completeActivity(act);
  };

  if (loading) return <div className="empty-state">Cargando tus tareas...</div>;

  if (projects.length === 0) {
    return (
      <div className="empty-state glass-panel">
        <Layout size={48} />
        <h2>Sin Proyectos</h2>
        <p>No estás unido a ningún proyecto. Pídele el código a tu Jefe de proyecto e ingresa de nuevo.</p>
        <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Recargar página</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Tus Actividades Asignadas</h2>
          <p>Revisa y completa tus tareas pendientes</p>
        </div>
        <div>
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
        </div>
      </div>

      <div className="card glass-panel">
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>
          Tareas en {currentProject?.name}
        </h3>

        {activities.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} style={{ color: 'var(--success-color)' }} />
            <p>¡No tienes tareas pendientes en este proyecto! Buen trabajo.</p>
          </div>
        ) : (
          <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {activities.map(act => (
              <div key={act.id} className="list-item" style={{ flexDirection: 'column', gap: '1rem' }}>
                <div className="item-content" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h4>{act.title}</h4>
                    {act.status === 'completed' ? (
                      <span className="badge badge-completed">Completada</span>
                    ) : (
                      <span className="badge badge-pending">Pendiente</span>
                    )}
                  </div>
                  <p>{act.description || 'Sin descripción adicional.'}</p>
                  
                  <div className="item-meta" style={{ marginTop: '1rem' }}>
                    <span>
                      <Clock size={14} /> 
                      Asignada hace {formatDistance(new Date(act.createdAt), new Date(), { locale: es })}
                    </span>
                  </div>
                </div>

                {act.status === 'pending' && (
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    onClick={() => handleCompleteActivity(act)}
                  >
                    Marcar como Completada
                  </button>
                )}
                {act.status === 'completed' && act.timeTakenMs && (
                  <div style={{ width: '100%', textAlign: 'center', color: 'var(--success-color)', fontSize: '0.875rem' }}>
                    Completada en {Math.floor(act.timeTakenMs / 1000 / 60)} minutos
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HelperDashboard;
