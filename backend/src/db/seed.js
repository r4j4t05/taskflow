require('dotenv').config();
require('./migrate'); // Ensure tables exist

const bcrypt = require('bcryptjs');
const db = require('./index');

async function seed() {
  console.log('Seeding demo data...');

  // Create users
  const adminHash = await bcrypt.hash('admin123', 12);
  const memberHash = await bcrypt.hash('member123', 12);

  db.prepare(`INSERT OR IGNORE INTO users (name, email, password_hash, role, avatar_initials) VALUES (?, ?, ?, ?, ?)`)
    .run('Alex Admin', 'admin@taskflow.com', adminHash, 'admin', 'AA');

  db.prepare(`INSERT OR IGNORE INTO users (name, email, password_hash, role, avatar_initials) VALUES (?, ?, ?, ?, ?)`)
    .run('Sam Member', 'member@taskflow.com', memberHash, 'member', 'SM');

  db.prepare(`INSERT OR IGNORE INTO users (name, email, password_hash, role, avatar_initials) VALUES (?, ?, ?, ?, ?)`)
    .run('Jordan Dev', 'jordan@taskflow.com', memberHash, 'member', 'JD');

  const adminId = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@taskflow.com').id;
  const memberId = db.prepare('SELECT id FROM users WHERE email = ?').get('member@taskflow.com').id;
  const member2Id = db.prepare('SELECT id FROM users WHERE email = ?').get('jordan@taskflow.com').id;

  // Create projects
  const existingProject = db.prepare('SELECT id FROM projects WHERE name = ?');
  const insertProject = db.prepare('INSERT INTO projects (name, description, status, owner_id) VALUES (?, ?, ?, ?)');

  if (!existingProject.get('Website Redesign')) {
    insertProject.run('Website Redesign', 'Redesign the company website with modern UI/UX principles', 'active', adminId);
  }

  if (!existingProject.get('Mobile App MVP')) {
    insertProject.run('Mobile App MVP', 'Build the v1 mobile application for iOS and Android', 'active', memberId);
  }

  const proj1Id = db.prepare('SELECT id FROM projects WHERE name = ?').get('Website Redesign').id;
  const proj2Id = db.prepare('SELECT id FROM projects WHERE name = ?').get('Mobile App MVP').id;

  // Add members to projects
  const addMember = db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)');
  addMember.run(proj1Id, adminId, 'admin');
  addMember.run(proj1Id, memberId, 'member');
  addMember.run(proj1Id, member2Id, 'member');
  addMember.run(proj2Id, memberId, 'admin');
  addMember.run(proj2Id, adminId, 'member');

  // Create tasks
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 2);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

  const fmt = (d) => d.toISOString().split('T')[0];

  const tasks = [
    { title: 'Design new homepage layout', description: 'Create wireframes and mockups for the homepage', status: 'in_progress', priority: 'high', project_id: proj1Id, assignee_id: memberId, creator_id: adminId, due_date: fmt(tomorrow) },
    { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment', status: 'todo', priority: 'urgent', project_id: proj1Id, assignee_id: member2Id, creator_id: adminId, due_date: fmt(yesterday) },
    { title: 'Write content for About page', description: null, status: 'review', priority: 'medium', project_id: proj1Id, assignee_id: memberId, creator_id: adminId, due_date: fmt(nextWeek) },
    { title: 'Fix mobile navigation bug', description: 'Nav menu not closing on mobile after link click', status: 'done', priority: 'high', project_id: proj1Id, assignee_id: member2Id, creator_id: memberId, due_date: null },
    { title: 'SEO optimization', description: 'Add meta tags, improve page load speed', status: 'todo', priority: 'low', project_id: proj1Id, assignee_id: null, creator_id: adminId, due_date: fmt(nextWeek) },
    { title: 'Design app onboarding flow', description: 'User onboarding screens for first-time users', status: 'in_progress', priority: 'high', project_id: proj2Id, assignee_id: member2Id, creator_id: memberId, due_date: fmt(tomorrow) },
    { title: 'Implement push notifications', description: null, status: 'todo', priority: 'medium', project_id: proj2Id, assignee_id: memberId, creator_id: memberId, due_date: fmt(nextWeek) },
    { title: 'App Store submission', description: 'Prepare screenshots, description, and submit to App Store', status: 'todo', priority: 'urgent', project_id: proj2Id, assignee_id: adminId, creator_id: memberId, due_date: fmt(yesterday) },
  ];

  const existingTask = db.prepare('SELECT id FROM tasks WHERE project_id = ? AND title = ?');
  const insertTask = db.prepare('INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, creator_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  tasks.forEach(t => {
    if (!existingTask.get(t.project_id, t.title)) {
      insertTask.run(t.title, t.description, t.status, t.priority, t.project_id, t.assignee_id, t.creator_id, t.due_date);
    }
  });

  console.log('Seed complete!');
  console.log('   admin@taskflow.com / admin123');
  console.log('   member@taskflow.com / member123');
  console.log('   jordan@taskflow.com / member123');
}

if (require.main === module) {
  seed().catch(console.error);
}

module.exports = seed;
