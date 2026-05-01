const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard — aggregated stats for current user
router.get('/', authenticate, (req, res) => {
  const isAdmin = req.user.role === 'admin';

  // My tasks (assigned to me)
  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.assignee_id = ?
    ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    LIMIT 20
  `).all(req.user.id);

  // Overdue tasks (for my projects)
  const today = new Date().toISOString().split('T')[0];
  let overdueTasks;
  if (isAdmin) {
    overdueTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.due_date < ? AND t.status != 'done'
      ORDER BY t.due_date ASC LIMIT 10
    `).all(today);
  } else {
    overdueTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t JOIN projects p ON t.project_id = p.id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.due_date < ? AND t.status != 'done'
      ORDER BY t.due_date ASC LIMIT 10
    `).all(req.user.id, today);
  }

  // Task status summary
  let statusSummary;
  if (isAdmin) {
    statusSummary = db.prepare(`SELECT status, COUNT(*) as count FROM tasks GROUP BY status`).all();
  } else {
    statusSummary = db.prepare(`
      SELECT t.status, COUNT(*) as count FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
      GROUP BY t.status
    `).all(req.user.id);
  }

  // Recent activity (recently updated tasks)
  let recentTasks;
  if (isAdmin) {
    recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      ORDER BY t.updated_at DESC LIMIT 10
    `).all();
  } else {
    recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t JOIN projects p ON t.project_id = p.id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      LEFT JOIN users u ON t.assignee_id = u.id
      ORDER BY t.updated_at DESC LIMIT 10
    `).all(req.user.id);
  }

  // Project summary
  let projectSummary;
  if (isAdmin) {
    projectSummary = db.prepare(`
      SELECT p.id, p.name, p.status,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks,
        COUNT(pm.user_id) as member_count
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      LEFT JOIN project_members pm ON pm.project_id = p.id
      GROUP BY p.id ORDER BY p.created_at DESC LIMIT 5
    `).all();
  } else {
    projectSummary = db.prepare(`
      SELECT p.id, p.name, p.status,
        COUNT(DISTINCT t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks,
        COUNT(DISTINCT pm2.user_id) as member_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      LEFT JOIN tasks t ON t.project_id = p.id
      LEFT JOIN project_members pm2 ON pm2.project_id = p.id
      GROUP BY p.id ORDER BY p.created_at DESC LIMIT 5
    `).all(req.user.id);
  }

  // Priority breakdown
  let prioritySummary;
  if (isAdmin) {
    prioritySummary = db.prepare(`SELECT priority, COUNT(*) as count FROM tasks WHERE status != 'done' GROUP BY priority`).all();
  } else {
    prioritySummary = db.prepare(`
      SELECT t.priority, COUNT(*) as count FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
      WHERE t.status != 'done' GROUP BY t.priority
    `).all(req.user.id);
  }

  res.json({
    myTasks,
    overdueTasks,
    statusSummary,
    recentTasks,
    projectSummary,
    prioritySummary,
    overdueCount: overdueTasks.length,
  });
});

module.exports = router;
