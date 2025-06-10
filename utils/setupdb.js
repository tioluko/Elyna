const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database('data/database.sqlite');
const schema = fs.readFileSync('data/schema.sql', 'utf8');

try {
    db.exec(schema);
    console.log('Tabela criada com sucesso!');
} catch (err) {
    console.error('Erro ao criar a tabela:', err.message);
}
