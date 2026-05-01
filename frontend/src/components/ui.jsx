export function Avatar({ name, initials, size = 'md' }) {
  const colors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700'];
  const color = colors[(name || '').charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {(initials || name?.slice(0, 2) || '?').toUpperCase()}
    </div>
  );
}

export function Badge({ status, type = 'status' }) {
  const labels = {
    todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done',
    low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
  };
  return <span className={`badge-${status}`}>{labels[status] || status}</span>;
}

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm mb-4 max-w-xs">{description}</p>
      {action}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" style={{ borderWidth: 3 }} />
    </div>
  );
}

export function StatusSelect({ value, onChange, className = '' }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={`input text-xs py-1 ${className}`}>
      <option value="todo">To Do</option>
      <option value="in_progress">In Progress</option>
      <option value="review">Review</option>
      <option value="done">Done</option>
    </select>
  );
}

export function PrioritySelect({ value, onChange, className = '' }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={`input text-xs py-1 ${className}`}>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="urgent">Urgent</option>
    </select>
  );
}
