const Database = require('better-sqlite3');
const db = new Database('data/database.sqlite');
const fs = require('fs');
const readline = require('readline');

function syncItemsFromJSON(path = '/data/items.json') {
    const items = JSON.parse(fs.readFileSync(path, 'utf8'));

    let updated = 0;
    let inserted = 0;

    for (const item of items) {
        if (!item.nome || !item.tipo || typeof item.mods !== 'object') {
            throw new Error(`❌ Item inválido detectado: ${JSON.stringify(item)}`);
        }

        const modsJson = JSON.stringify(item.mods || {});
        const exists = db.prepare(`SELECT id FROM items WHERE nome = ?`).get(item.nome);

        if (exists) {
            db.prepare(`UPDATE items SET descricao = ?, tipo = ?, slot = ?, mods = ?, move_id = ?, comp = ?, peso = ? WHERE nome = ?`)
            .run(item.descricao, item.tipo, item.slot, modsJson, item.move_id, item.comp, item.peso, item.nome);
            updated++;
        } else {
            db.prepare(`INSERT INTO items (nome, descricao, tipo, slot, mods, move_id, comp, peso)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(item.nome, item.descricao, item.tipo, item.slot, modsJson, item.move_id, item.comp, item.peso);
            inserted++;
        }
    }

    console.log(`✅ ${items.length} item(s) foram inseridos no banco de dados.`);
}

// Só executa se rodar via terminal
if (require.main === module) {
    const filePath = process.argv[2] || 'data/items.json';

    // Prompt para confirmação
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(`Isso irá importar dados de "${filePath}" para a tabela 'items'. Continuar? (s/N): `, (answer) => {
        if (answer.trim().toLowerCase() === 's') {
            try {
                syncItemsFromJSON(filePath);
            } catch (err) {
                console.error('❌ Erro ao importar os dados:', err.message);
            }
        } else {
            console.log('❎ Operação cancelada pelo usuário.');
        }
        rl.close();
    });
}
