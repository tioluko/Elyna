const { db } = require('../utils/db'); // ou './db' dependendo do caminho real

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tabelas existentes:", tables);
