import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../firebase';
import LeaderDashboard from './LeaderDashboard';
import HelperDashboard from './HelperDashboard';
import { ArrowLeft } from 'lucide-react';

const ProjectView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [id, user.id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      // Determine if leader or helper
      const lProj = await dbService.getProjectsForLeader(user.id);
      const foundLeader = lProj.find(p => p.id === id);
      
      if (foundLeader) {
        setProject({ ...foundLeader, isLeader: true });
      } else {
        const hProj = await dbService.getProjectsForHelper(user.id);
        const foundHelper = hProj.find(p => p.id === id);
        if (foundHelper) {
          setProject({ ...foundHelper, isLeader: false });
        } else {
          // Not found or no access
          setProject(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="empty-state">Cargando proyecto...</div>;
  if (!project) return (
    <div className="empty-state">
      <h2>Proyecto no encontrado o no tienes acceso</h2>
      <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Volver al inicio</button>
    </div>
  );

  return (
    <div>
      <button className="btn btn-icon" onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} /> Volver al Dashboard
      </button>
      {project.isLeader ? (
        <LeaderDashboard projectId={id} project={project} onProjectDeleted={() => navigate('/dashboard')} />
      ) : (
        <HelperDashboard projectId={id} project={project} />
      )}
    </div>
  );
};

export default ProjectView;
