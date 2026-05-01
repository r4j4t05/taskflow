const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireProjectAccess, requireProjectAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects — list projects accessible to user
router.get('/', authenticate, (req, res) => {
  let projects;
  if (req.user.role === 'admin') {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name, pm.role as my_role,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);
  }
  res.json({ projects });
});

// POST /api/projects — create project (any auth user)
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['active', 'archived', 'completed']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description = '', status = 'active' } = req.body;

  const result = db.prepare(
    'INSERT INTO projects (name, description, status, owner_id) VALUES (?, ?, ?, ?)'
  ).run(name, description, status, req.user.id);

  // Auto-add creator as project admin member
  db.prepare(
    'INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, req.user.id, 'admin');

  const project = db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?').get(result.lastInsertRowid);
  res.status(201).json({ project });
});

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, requireProjectAccess, (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_initials, pm.role, pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).all(req.params.projectId);

  const taskStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status
  `).all(req.params.projectId);

  res.json({ project: req.project, members, taskStats });
});

// PUT /api/projects/:projectId
router.put('/:projectId', authenticate, requireProjectAccess, requireProjectAdmin, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['active', 'archived', 'completed']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, status } = req.body;
  const updates = [];
  const values = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.projectId);

  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const project = db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?').get(req.params.projectId);
  res.json({ project });
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', authenticate, requireProjectAccess, requireProjectAdmin, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:projectId/members — add member
router.post('/:projectId/members', authenticate, requireProjectAccess, requireProjectAdmin, [
  body('user_id').isInt(),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { user_id, role = 'member' } = req.body;
  const user = db.prepare('SELECT id, name, email, avatar_initials FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  try {
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.projectId, user_id, role);
    res.status(201).json({ message: 'Member added', user });
  } catch (e) {
    res.status(409).json({ error: 'User is already a member' });
  }
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', authenticate, requireProjectAccess, requireProjectAdmin, (req, res) => {
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.projectId, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
