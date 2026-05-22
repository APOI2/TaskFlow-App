import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../firebase';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Clock, Layout } from 'lucide-react';

const HelperDashboard = ({ projectId, project }) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (projectId) {
      const unsubscribe = dbService.subscribeToActivities(projectId, (acts) => {
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
  }, [projectId, user.id]);

  const handleCompleteActivity = async (act) => {
    await dbService.completeActivity(act);
  };



  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Tus Actividades Asignadas en {project?.name}</h2>
          <p>Revisa y completa tus tareas pendientes</p>
        </div>
      </div>

      <div className="card glass-panel">
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>
          Tareas Pendientes
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
