import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, tasksApi } from '../api';
import { Badge, Spinner, StatusSelect } from '../components/ui';
import { format, isPast, parseISO } from 'date-fns';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  const load = () => {
    dashboardApi.get().then(res => { setTasks(res.data.myTasks); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleStatusUpdate = async (task, status) => {
    await tasksApi.update(task.project_id, task.id, { status });
    load();
  };

  const filtered = tasks.filter(t => {
    if (filter === 'active') return t.status !== 'done';
    if (filter === 'done') return t.status === 'done';
    return true;
  });

  if (loading) return <Spinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'done'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${filter === f ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-medium text-gray-600">All caught up!</p>
            <p className="text-sm mt-1">No tasks assigned to you</p>
          </div>
        ) : filtered.map(task => {
          const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
          return (
            <div key={task.id} className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${isOverdue ? 'border-l-2 border-l-red-400' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</span>
                    <Badge status={task.priority} />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <Link to={`/projects/${task.project_id}`} className="text-xs text-brand-600 hover:underline">
                      {task.project_name}
                    </Link>
                    {task.due_date && (
                      <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {isOverdue ? '⚠ Overdue · ' : ''}Due {format(parseISO(task.due_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-32 flex-shrink-0">
                  <StatusSelect value={task.status} onChange={v => handleStatusUpdate(task, v)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
