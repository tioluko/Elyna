const { DEBUG } = require('../config.js');
const path = require('path');
const Database = require('better-sqlite3');

// Caminho absoluto para evitar erros
const dbPath = path.resolve(__dirname, '../data/database.sqlite'); // ajuste o caminho conforme necessário
const db = new Database(dbPath);

// Verifica se o usuário existe
function userExists(id) {
    const row = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    //return { ...raw };
    return !!row; // true se encontrou, false se não
}

// Insere novo usuário
function insertUser(userData) {
    const fields = Object.keys(userData).join(', ');
    const placeholders = Object.keys(userData).map(() => '?').join(', ');
    const values = Object.values(userData);

    const stmt = db.prepare(`INSERT INTO users (${fields}) VALUES (${placeholders})`);
    stmt.run(...values);
}

// Busca dados completos do usuário
function getUserData(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Atualiza dados do usuário
function updateUserData(id, updates) {
    const fields = Object.keys(updates);
    const placeholders = fields.map(field => `${field} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = db.prepare(`UPDATE users SET ${placeholders} WHERE id = ?`);
    const args = [...values, id];
    stmt.run(...args);
}

// Cria listas padrões do usuário
function initUserMoves(userId) {
    const defaultMoves = [96,97,98,99]; // IDs dos ataques básicos
    const stmt = db.prepare(`INSERT INTO user_moves (user_id, move_id) VALUES (?, ?)`);
    for (const moveId of defaultMoves) {
        stmt.run(userId, moveId);
    }
    if (DEBUG) console.log('[initUserPerks] Inserindo ações iniciais para o usuário', userId);
}
function initUserPerks(userId) {
    const defaultPerks = [1]; // Preencha com perks iniciais se quiser

    const stmt = db.prepare(`INSERT INTO user_perks (user_id, perk_id, quantidade) VALUES (?, ?, ?)`);
    for (const perkId of defaultPerks) {
        stmt.run(userId, perkId, 1);
    }
    if (DEBUG) console.log('[initUserPerks] Inserindo perks iniciais para o usuário', userId);
}
function initUserInventory(userId) {
    const defaultItems = [22]; // [{ id: 1, quantidade: 2 }]
    const stmt = db.prepare(`INSERT INTO user_inventory (user_id, item_id, quantidade, equipado ) VALUES (?, ?, ?, 1)`);
    for (const itemId of defaultItems) {
        stmt.run(userId, itemId, 1);
    }
    if (DEBUG) console.log('[initUserPerks] Inserindo itens iniciais para o usuário', userId);
}
// Busca dados no inventorio do usuário
function getUserInventory(userId) {
    return db.prepare(`
    SELECT ui.*, i.nome, i.descricao, i.tipo, i.slot, i.mods, i.move_id
    FROM user_inventory ui
    JOIN items i ON i.id = ui.item_id
    WHERE ui.user_id = ?
    `).all(userId);
}
// Atualiza inventorio do usuário
function updateUserInventory(inventoryId, updates) {
    const fields = Object.keys(updates);
    const placeholders = fields.map(field => `${field} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = db.prepare(`UPDATE user_inventory SET ${placeholders} WHERE id = ?`);
    stmt.run(...values, inventoryId);
}
// Busca dados na lista de peculiaridades do usuário
function getUserPerks(userId) {
    return db.prepare(`
    SELECT up.*, p.nome, p.descricao, p.tipo, p.mods
    FROM user_perks up
    JOIN perks p ON p.id = up.perk_id
    WHERE up.user_id = ?
    `).all(userId);
}
// Atualiza lista de peculiaridades do usuário
function updateUserPerks(perkInstanceId, updates) {
    const fields = Object.keys(updates);
    const placeholders = fields.map(field => `${field} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = db.prepare(`UPDATE user_perks SET ${placeholders} WHERE id = ?`);
    stmt.run(...values, perkInstanceId);
}
// Busca dados na lista de ações do usuário
function getUserMoves(userId) {
    const rows = db.prepare(`
    SELECT um.*, m.*
    FROM user_moves um
    JOIN moves m ON m.id = um.move_id
    WHERE um.user_id = ?
    `).all(userId);

    return rows.map(move => {
        const mods = JSON.parse(move.mods || '{}');
        return {
            ...move,
            AC: mods.AC ?? move.AC,
            DN: mods.DN ?? move.DN,
            INI: mods.INI ?? move.INI,
            RE: mods.RE ?? move.RE,
            ALC: mods.ALC ?? move.ALC,
            CHCRI: mods.CHCRI ?? move.CHCRI,
            DNCRI: mods.DNCRI ?? move.DNCRI
        };
    });
}
/*function getUserMoves(userId) {//SELECT um.*, m.nome, m.descricao, m.tipo, m.pericia
    return db.prepare(`
    SELECT um.*, m.*
    FROM user_moves um
    JOIN moves m ON m.id = um.move_id
    WHERE um.user_id = ?
    `).all(userId);

    for (const move of userMoves) {
        const mods = JSON.parse(move.mods || '{}');
        const finalMove = {
            ...move,
            AC: (mods.AC ?? move.AC),
            DN: (mods.DN ?? move.DN),
            INI: (mods.INI ?? move.INI),
            RE: (mods.RE ?? move.RE),
            Alc: (mods.ALC ?? move.ALC)
        };
    }
}*/
// Atualiza lista de ações do usuário
function updateUserMoves(moveId, updates) {
    const fields = Object.keys(updates);
    const placeholders = fields.map(field => `${field} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = db.prepare(`UPDATE user_moves SET ${placeholders} WHERE id = ?`);
    stmt.run(...values, moveId);
}

function getMoveById(moveId) {
    return db.prepare(`SELECT * FROM moves WHERE id = ?`).get(moveId);
}

function getUserCombatState(userId) {
    const user = getUserData(userId);
    const applied = modApplyInMemory(user); // <- sem salvar no banco
    const final = stats.getTotalStats(applied); // <- total com mods
    stats.update(final); // opcional, se quiser usar PV/PM/etc derivados
    return final;
}

function getCombatState(userId) {
    const u = getUserData(userId);
    if (!u || !u.EVENT || !u.EVENT.startsWith('combate:')) return null;

    const combatId = parseInt(u.EVENT.split(':')[1]);
    const row = db.prepare('SELECT * FROM combat WHERE id = ?').get(combatId);
    if (!row) return null;

    const user = JSON.parse(row.user_data);
    const npc = JSON.parse(row.npc_data);

    return {
        id: combatId,
        user: user,
        npc: npc,
        user_data: row.user_data,
        npc_data: row.npc_data,
        dist: row.dist,
        user_action: row.user_action,
        npc_action: row.npc_action,
        user_action_data: row.user_action_data,
        npc_action_data: row.npc_action_data,
        state: row.state,
        round: row.round
    };
}

function updateCombatUserData(combatId, playerObj) {
    db.prepare('UPDATE combat SET user_data = ? WHERE id = ?')
    .run(JSON.stringify(playerObj), combatId);
}

function updateCombat(id, updates) {
    const fields = Object.keys(updates);
    const placeholders = fields.map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = db.prepare(`UPDATE combat SET ${placeholders} WHERE id = ?`);
    stmt.run(...values, id);

    //const allowed = ['state', 'dist', 'user_action', 'npc_action', 'user_action_data', 'npc_action_data', 'npc_data'];
    //const validUpdates = Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.includes(key)));
}

module.exports = {
    db,
    userExists,
    insertUser,
    getUserData,
    getUserMoves,
    getUserInventory,
    getUserPerks,
    getMoveById,
    getCombatState,
    updateCombatUserData,
    updateUserData,
    updateUserInventory,
    updateUserPerks,
    updateUserMoves,
    updateCombat,
    initUserMoves,
    initUserPerks,
    initUserInventory
};
