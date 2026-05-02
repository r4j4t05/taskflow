const path = require('path');

function getDatabasePath() {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  if (process.env.NODE_ENV === 'production') {
    return '/app/data/taskflow.db';
  }

  return path.join(__dirname, '../../data/taskflow.db');
}

module.exports = { getDatabasePath };
