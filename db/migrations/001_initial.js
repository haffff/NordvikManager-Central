'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../database');

function runMigration() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const runAll = db.transaction(() => {
    for (const statement of statements) {
      db.prepare(statement).run();
    }
  });

  runAll();

  // Add is_public column to game_sessions if it was created before this field existed
  const columns = db.prepare('PRAGMA table_info(game_sessions)').all();
  if (!columns.some((c) => c.name === 'is_public')) {
    db.prepare('ALTER TABLE game_sessions ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0').run();
    console.log('[migration] added is_public column to game_sessions');
  }

  console.log('[migration] 001_initial applied');
}

module.exports = runMigration;
