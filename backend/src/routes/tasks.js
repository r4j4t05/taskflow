const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectAccess, (req, res) => {
  const { status, priority, assignee_id } = req.query;
  let sql = `
    SELECT t.*, 
      u.name as assignee_name, u.avatar_initials as assignee_avatar,
      c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.creator_id = c.id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (assignee_id) { sql += ' AND t.assignee_id = ?'; params.push(assignee_id); }

  sql += ' ORDER BY CASE t.priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 ELSE 4 END, t.due_date ASC NULLS LAST, t.created_at DESC';

  const tasks = db.prepare(sql).all(...params);
  res.json({ tasks });
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectAccess, [
  body('title').trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional({ nullable: true }).isInt().toInt(),
  body('due_date').optional({ nullable: true }).isDate(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description = '', status = 'todo', priority = 'medium', assignee_id = null, due_date = null } = req.body;

  if (assignee_id) {
    const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, assignee_id);
    if (!isMember) {
      return res.status(400).json({ error: 'Assignee must be a project member' });
    }
  }

  const result = db.prepare(
    'INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, creator_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title, description, status, priority, req.params.projectId, assignee_id, req.user.id, due_date);

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_initials as assignee_avatar, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id JOIN users c ON t.creator_id = c.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// GET /api/projects/:projectId/tasks/:taskId
router.get('/:taskId', authenticate, requireProjectAccess, (req, res) => {
  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_initials as assignee_avatar, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id JOIN users c ON t.creator_id = c.id
    WHERE t.id = ? AND t.project_id = ?
  `).get(req.params.taskId, req.params.projectId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = db.prepare(`
    SELECT tc.*, u.name as user_name, u.avatar_initials
    FROM task_comments tc JOIN users u ON tc.user_id = u.id
    WHERE tc.task_id = ? ORDER BY tc.created_at ASC
  `).all(req.params.taskId);

  res.json({ task, comments });
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', authenticate, requireProjectAccess, [
  body('title').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional({ nullable: true }).isInt().toInt(),
  body('due_date').optional({ nullable: true }).isDate(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.role !== 'admin' && req.projectRole !== 'admin') {
    const isCreator = task.creator_id === req.user.id;
    const isAssignee = task.assignee_id === req.user.id;
    const sensitiveFields = ['title', 'description', 'priority', 'assignee_id', 'due_date'];
    const changingSensitive = sensitiveFields.some(f => req.body[f] !== undefined);
    if (!isCreator && !isAssignee) {
      return res.status(403).json({ error: 'You can only edit your own tasks' });
    }
    if (!isCreator && changingSensitive) {
      return res.status(403).json({ error: 'Assignees can only update task status' });
    }
  }

  if (req.body.assignee_id) {
    const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, req.body.assignee_id);
    if (!isMember) {
      return res.status(400).json({ error: 'Assignee must be a project member' });
    }
  }

  const allowed = ['title', 'description', 'status', 'priority', 'assignee_id', 'due_date'];
  const updates = ['updated_at = CURRENT_TIMESTAMP'];
  const values = [];

  allowed.forEach(field => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  });
  values.push(req.params.taskId);

  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_initials as assignee_avatar, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id JOIN users c ON t.creator_id = c.id
    WHERE t.id = ?
  `).get(req.params.taskId);

  res.json({ task: updated });
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', authenticate, requireProjectAccess, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.role !== 'admin' && req.projectRole !== 'admin' && task.creator_id !== req.user.id) {
    return res.status(403).json({ error: 'Only task creator or admin can delete tasks' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post('/:taskId/comments', authenticate, requireProjectAccess, [
  body('content').trim().isLength({ min: 1, max: 1000 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = db.prepare(
    'INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.taskId, req.user.id, req.body.content);

  const comment = db.prepare(`
    SELECT tc.*, u.name as user_name, u.avatar_initials
    FROM task_comments tc JOIN users u ON tc.user_id = u.id
    WHERE tc.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

module.exports = router;
