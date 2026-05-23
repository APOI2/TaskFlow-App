import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dbService } from '../firebase';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Clock, Send, Minus, Plus } from 'lucide-react';

const ActivityItem = ({ act, onConfirm }) => {
  const [localAmount, setLocalAmount] = useState(act.currentAmount || 0);

  const handleConfirm = () => {
    onConfirm(act, act.type === 'numerical' ? localAmount : null);
  };

  const isOverdue = act.deadline && Date.now() > act.deadline;

  return (
    <div className="list-item" style={{ flexDirection: 'column', gap: '1rem', border: isOverdue && act.status === 'pending' ? '1px solid var(--danger-color)' : 'none' }}>
      <div className="item-content" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h4>{act.title}</h4>
          {act.status === 'completed' && <span className="badge badge-completed">Completada</span>}
          {act.status === 'submitted' && <span className="badge badge-pending" style={{ background: 'var(--primary-color)' }}>Enviada a Revisión</span>}
          {act.status === 'pending' && !isOverdue && <span className="badge badge-pending">Pendiente</span>}
          {act.status === 'pending' && isOverdue && <span className="badge badge-unassigned" style={{ background: 'var(--danger-color)', color: 'white' }}>Vencida</span>}
        </div>
        <p>{act.description || 'Sin descripción adicional.'}</p>
        
        <div className="item-meta" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
          <span>
            <Clock size={14} /> 
            Asignada hace {formatDistance(new Date(act.createdAt), new Date(), { locale: es })}
          </span>
          {act.deadline && (
            <span style={{ color: isOverdue && act.status === 'pending' ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
              Vence: {new Date(act.deadline).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {act.status === 'pending' && act.type === 'numerical' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface-color-light)', padding: '0.5rem', borderRadius: '8px' }}>
          <span>Objetivo: {act.targetAmount}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <button className="btn-icon" onClick={() => setLocalAmount(Math.max(0, localAmount - 1))}><Minus size={16} /></button>
            <span style={{ fontWeight: 'bold', width: '30px', textAlign: 'center' }}>{localAmount}</span>
            <button className="btn-icon" onClick={() => setLocalAmount(localAmount + 1)}><Plus size={16} /></button>
          </div>
        </div>
      )}

      {act.status === 'pending' && (
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
          onClick={handleConfirm}
        >
          <Send size={18} /> Confirmar Tarea
        </button>
      )}
      {act.status === 'completed' && act.timeTakenMs && (
        <div style={{ width: '100%', textAlign: 'center', color: 'var(--success-color)', fontSize: '0.875rem' }}>
          Completada en {Math.floor(act.timeTakenMs / 1000 / 60)} minutos
        </div>
      )}
    </div>
  );
};

const HelperDashboard = ({ projectId, project }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (projectId) {
      const unsubscribe = dbService.subscribeToActivities(projectId, (acts) => {
        const myActs = acts.filter(a => a.assignedTo === user.id);
        const sorted = myActs.sort((a, b) => {
          if (a.status === b.status) return b.createdAt - a.createdAt;
          if (a.status === 'pending') return -1;
          if (a.status === 'submitted') return 0;
          return 1;
        });
        setActivities(sorted);
      });
      return () => unsubscribe();
    } else {
      setActivities([]);
    }
  }, [projectId, user.id]);

  const handleConfirmActivity = async (act, finalAmount) => {
    await dbService.submitActivity(act, finalAmount);
    showToast('¡Tarea enviada para revisión!', 'success');
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Tus Actividades Asignadas en {project?.name}</h2>
          <p>Revisa y completa tus tareas pendientes</p>
        </div>
      </div>

      {activities.filter(act => act.status === 'pending' && act.deadline && (act.deadline - Date.now() < 24 * 60 * 60 * 1000) && Date.now() < act.deadline).length > 0 && (
        <div style={{ background: 'var(--primary-hover)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} />
          <span><strong>¡Atención!</strong> Tienes tareas cuya fecha límite se aproxima en menos de 24 horas.</span>
        </div>
      )}

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
              <ActivityItem key={act.id} act={act} onConfirm={handleConfirmActivity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HelperDashboard;
