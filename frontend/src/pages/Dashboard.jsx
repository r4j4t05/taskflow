import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Badge, Avatar, Spinner } from '../components/ui';
import { AlertTriangle, CheckCircle2, Clock, BarChart3, TrendingUp, FolderOpen } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get().then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const statusMap = {};
  data.statusSummary.forEach(s => { statusMap[s.status] = s.count; });
  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const doneCount = statusMap['done'] || 0;
  const todoCount = statusMap['todo'] || 0;
  const inProgressCount = statusMap['in_progress'] || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening with your projects today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={total} icon={BarChart3} color="bg-brand-50 text-brand-600" />
        <StatCard label="In Progress" value={inProgressCount} icon={TrendingUp} color="bg-blue-50 text-blue-600" />
        <StatCard label="Completed" value={doneCount} icon={CheckCircle2} color="bg-green-50 text-green-600" />
        <StatCard label="Overdue" value={data.overdueCount} icon={AlertTriangle} color={data.overdueCount > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-2 card">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">My Tasks</h2>
            <Link to="/my-tasks" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.myTasks.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No tasks assigned to you</p>
            ) : data.myTasks.slice(0, 6).map(task => (
              <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link to={`/projects/${task.project_id}`} className="font-medium text-sm text-gray-900 hover:text-brand-600 truncate block">
                      {task.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{task.project_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge status={task.priority} />
                    <Badge status={task.status} />
                  </div>
                </div>
                {task.due_date && (
                  <p className={`text-xs mt-1 ${isPast(parseISO(task.due_date)) && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}`}>
                    Due {format(parseISO(task.due_date), 'MMM d')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Overdue */}
          {data.overdueTasks.length > 0 && (
            <div className="card border-red-100">
              <div className="p-4 border-b border-red-50 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <h2 className="font-semibold text-gray-900 text-sm">Overdue Tasks</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {data.overdueTasks.slice(0, 4).map(task => (
                  <div key={task.id} className="p-3">
                    <Link to={`/projects/${task.project_id}`} className="text-sm font-medium text-gray-800 hover:text-brand-600 line-clamp-1">
                      {task.title}
                    </Link>
                    <p className="text-xs text-red-500 mt-0.5">Due {format(parseISO(task.due_date), 'MMM d, yyyy')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          <div className="card">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">Projects</h2>
              <Link to="/projects" className="text-xs text-brand-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {data.projectSummary.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-6">No projects yet</p>
              ) : data.projectSummary.map(p => {
                const pct = p.total_tasks > 0 ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
                return (
                  <div key={p.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Link to={`/projects/${p.id}`} className="text-sm font-medium text-gray-800 hover:text-brand-600 truncate">
                        {p.name}
                      </Link>
                      <span className="text-xs text-gray-400">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{p.total_tasks} tasks · {p.member_count} members</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
