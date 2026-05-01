import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, EmptyState, Spinner, Badge } from '../components/ui';
import { Plus, FolderOpen, Users, CheckSquare, MoreHorizontal } from 'lucide-react';

function ProjectCard({ project, onDelete, isAdmin }) {
  const [menu, setMenu] = useState(false);
  const total = project.task_count || 0;

  return (
    <div className="card p-5 hover:shadow-md transition-all group relative">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <FolderOpen size={20} className="text-brand-600" />
        </div>
        {(isAdmin || project.my_role === 'admin') && (
          <div className="relative">
            <button onClick={() => setMenu(!menu)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-all">
              <MoreHorizontal size={16} className="text-gray-500" />
            </button>
            {menu && (
              <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-100 w-36 z-10 py-1">
                <button onClick={() => { setMenu(false); onDelete(project); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  Delete Project
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Link to={`/projects/${project.id}`}>
        <h3 className="font-semibold text-gray-900 hover:text-brand-600 transition-colors mb-1">{project.name}</h3>
        {project.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{project.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><CheckSquare size={12}/> {total} tasks</span>
          <span className="flex items-center gap-1"><Users size={12}/> {project.member_count} members</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge status={project.status} type="status" />
          <span className="text-xs text-gray-400">by {project.owner_name}</span>
        </div>
      </Link>
    </div>
  );
}

export default function Projects() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', status: 'active' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = () => {
    projectsApi.list().then(res => setProjects(res.data.projects)).finally(() => setLoading(false));
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await projectsApi.create(form);
      setShowCreate(false);
      setForm({ name: '', description: '', status: 'active' });
      loadProjects();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (project) => {
    if (!confirm(`Delete "${project.name}"? This will delete all tasks.`)) return;
    await projectsApi.delete(project.id);
    loadProjects();
  };

  if (loading) return <Spinner />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16}/> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No projects yet"
          description="Create your first project to start organizing tasks"
          action={<button onClick={() => setShowCreate(true)} className="btn-primary">Create Project</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onDelete={handleDelete} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input className="input" placeholder="e.g. Website Redesign" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="What is this project about?"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
