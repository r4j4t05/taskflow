import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, tasksApi, authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Badge, Avatar, Modal, EmptyState, Spinner, StatusSelect, PrioritySelect } from '../components/ui';
import { Plus, Users, Filter, Trash2, Edit2, ChevronDown } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';

function TaskForm({ projectId, members, onSubmit, onCancel, initial = {} }) {
  const [form, setForm] = useState({
    title: '', description: '', status: 'todo', priority: 'medium',
    assignee_id: '', due_date: '', ...initial,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input className="input" placeholder="Task title" value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea className="input resize-none" rows={3} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <StatusSelect value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <PrioritySelect value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
          <select className="input" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input type="date" className="input" value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : (initial.id ? 'Update Task' : 'Create Task')}
        </button>
      </div>
    </form>
  );
}

function TaskRow({ task, projectId, members, onUpdate, onDelete, canEdit }) {
  const [editing, setEditing] = useState(false);
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';

  const handleStatusChange = async (status) => {
    await tasksApi.update(projectId, task.id, { status });
    onUpdate();
  };

  return (
    <>
      <div className={`p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${isOverdue ? 'border-l-2 border-l-red-400' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-gray-900">{task.title}</span>
              <Badge status={task.priority} />
            </div>
            {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {task.assignee_name ? (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Avatar name={task.assignee_name} initials={task.assignee_avatar} size="sm" />
                  {task.assignee_name}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Unassigned</span>
              )}
              {task.due_date && (
                <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  {isOverdue ? '⚠ ' : ''}Due {format(parseISO(task.due_date), 'MMM d')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-32">
              <StatusSelect value={task.status} onChange={handleStatusChange} />
            </div>
            {canEdit && (
              <>
                <button onClick={() => setEditing(!editing)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => onDelete(task.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {editing && (
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <TaskForm
            projectId={projectId}
            members={members}
            initial={task}
            onSubmit={async (data) => {
              await tasksApi.update(projectId, task.id, data);
              setEditing(false);
              onUpdate();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');

  const loadAll = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        projectsApi.get(projectId),
        tasksApi.list(projectId, filterStatus ? { status: filterStatus } : {}),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTasks(tasksRes.data.tasks);
    } catch { navigate('/projects'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [projectId, filterStatus]);
  useEffect(() => { authApi.users().then(r => setAllUsers(r.data.users)); }, []);

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await tasksApi.delete(projectId, taskId);
    loadAll();
  };

  const myMembership = members.find(m => m.id === user?.id);
  const canManage = isAdmin || myMembership?.role === 'admin' || project?.owner_id === user?.id;

  const nonMembers = allUsers.filter(u => !members.find(m => m.id === u.id));

  const groups = [
    { label: 'To Do', status: 'todo', tasks: tasks.filter(t => t.status === 'todo') },
    { label: 'In Progress', status: 'in_progress', tasks: tasks.filter(t => t.status === 'in_progress') },
    { label: 'Review', status: 'review', tasks: tasks.filter(t => t.status === 'review') },
    { label: 'Done', status: 'done', tasks: tasks.filter(t => t.status === 'done') },
  ];

  if (loading) return <Spinner />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
          {project?.description && <p className="text-gray-500 text-sm mt-1">{project.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowMembers(true)} className="btn-secondary flex items-center gap-2">
            <Users size={16} /> {members.length} Members
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter size={15} className="text-gray-400" />
        <div className="flex gap-2 flex-wrap">
          {['', 'todo', 'in_progress', 'review', 'done'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${filterStatus === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === '' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Task groups */}
      {filterStatus ? (
        <div className="card overflow-hidden">
          {tasks.length === 0 ? (
            <EmptyState icon="✅" title="No tasks" description="No tasks with this status" />
          ) : tasks.map(task => (
            <TaskRow key={task.id} task={task} projectId={projectId} members={members}
              onUpdate={loadAll} onDelete={handleDelete}
              canEdit={canManage || task.creator_id === user?.id || task.assignee_id === user?.id} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {groups.map(group => (
            <div key={group.status} className="card overflow-hidden">
              <div className="p-3 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge status={group.status} />
                </div>
                <span className="text-xs text-gray-400 font-medium">{group.tasks.length}</span>
              </div>
              <div>
                {group.tasks.length === 0 ? (
                  <p className="text-center text-gray-300 text-xs py-8">No tasks</p>
                ) : group.tasks.map(task => (
                  <TaskRow key={task.id} task={task} projectId={projectId} members={members}
                    onUpdate={loadAll} onDelete={handleDelete}
                    canEdit={canManage || task.creator_id === user?.id || task.assignee_id === user?.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Task">
        <TaskForm
          projectId={projectId}
          members={members}
          onSubmit={async (data) => {
            await tasksApi.create(projectId, data);
            setShowCreate(false);
            loadAll();
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {/* Members Modal */}
      <Modal isOpen={showMembers} onClose={() => setShowMembers(false)} title="Team Members">
        <div className="space-y-3 mb-6">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={m.name} initials={m.avatar_initials} size="sm" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'}`}>
                  {m.role}
                </span>
                {canManage && m.id !== user?.id && (
                  <button onClick={async () => { await projectsApi.removeMember(projectId, m.id); loadAll(); }}
                    className="text-xs text-red-500 hover:underline">Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {canManage && nonMembers.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Add Member</p>
            <div className="flex gap-2">
              <select id="new-member" className="input flex-1 text-sm">
                {nonMembers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
              <button className="btn-primary" onClick={async () => {
                const uid = document.getElementById('new-member').value;
                await projectsApi.addMember(projectId, { user_id: parseInt(uid) });
                loadAll();
              }}>Add</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
