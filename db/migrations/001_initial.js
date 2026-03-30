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
  console.log('[migration] 001_initial applied');
}

module.exports = runMigration;
