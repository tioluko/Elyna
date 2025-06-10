const { DEBUG } = require('../config.js');
const { db, updateUserData } = require('../utils/db.js');
const { modApply, calculateStats } = require('./stats.js');

function equip(userId, invId) {
    const inv = db.prepare(`
    SELECT ui.*, i.slot, i.move_id, i.mods
    FROM user_inventory ui
    JOIN items i ON i.id = ui.item_id
    WHERE ui.id = ? AND ui.user_id = ?
    `).get(invId, userId);

    if (!inv) throw new Error("Item inexistente ou inválido");

    let slot = inv.slot;

    // Slot especial: hand → rhand ou lhand
    if (slot === 'hand') {
        slot = getFreeHand(userId);
        if (!slot) throw new Error('Ambas as mãos já estão ocupadas.');
    }

    // Desequipa outros itens no mesmo slot, exceto o que será equipado
    db.prepare(`
    UPDATE user_inventory SET equipado = 0, slot_override = NULL
    WHERE user_id = ? AND slot_override = ? AND id != ?
    `).run(userId, slot, invId);

    // Atualiza este item como equipado
    db.prepare(`UPDATE user_inventory SET equipado = 1, slot_override = ? WHERE id = ?`)
    .run(slot, invId);

    // Adiciona movimento se necessário
    if (inv.move_id) {
        const mods = JSON.parse(inv.mods || '{}');
        const moveMods = {};

        for (const key in mods) {
            if (key.startsWith("move")) {
                moveMods[key.slice(4)] = mods[key];
            }
        }

        db.prepare(`
        INSERT INTO user_moves (user_id, move_id, origem, mods)
        VALUES (?, ?, ?, ?)
        `).run(userId, inv.move_id, `equip:${invId}`, JSON.stringify(moveMods));
    }

    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    const moddedUser = modApply(user);
    updateUserData(user.id, calculateStats(moddedUser));
    return moddedUser;
}

function unequip(userId, invId) {
    const inv = db.prepare(`
    SELECT ui.*, i.slot, i.move_id
    FROM user_inventory ui
    JOIN items i ON i.id = ui.item_id
    WHERE ui.user_id = ? AND ui.id = ?
    `).get(userId, invId);

    if (!inv || !inv.equipado) throw new Error('Item não está equipado.');

    // Desequipa
    db.prepare(`UPDATE user_inventory SET equipado = 0 WHERE user_id = ? AND id = ?`)
    .run(userId, invId);

    if (inv.move_id) {
        db.prepare(`
        DELETE FROM user_moves
        WHERE user_id = ? AND move_id = ? AND origem = ?
        `).run(userId, inv.move_id, `equip:${invId}`);
    }

    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    const moddedUser = modApply(user);
    updateUserData(user.id, calculateStats(moddedUser));
    return moddedUser;
}

function addItem(userId, itemId, quantidade = 1) {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    if (!item) throw new Error('Item inexistente');

    if (item.tipo === 'equip') {
        // ⚔️ Equipáveis devem sempre ser adicionados como instância nova
        db.prepare(`
        INSERT INTO user_inventory (user_id, item_id, quantidade, equipado)
        VALUES (?, ?, 1, 0)
        `).run(userId, itemId);
    } else {
        // 📦 Empilháveis: verificar se já existe
        const existing = db.prepare(`
        SELECT * FROM user_inventory WHERE user_id = ? AND item_id = ? AND equipado = 0
        `).get(userId, itemId);

        if (existing) {
            db.prepare(`
            UPDATE user_inventory SET quantidade = quantidade + ? WHERE id = ?
            `).run(quantidade, existing.id);
        } else {
            db.prepare(`
            INSERT INTO user_inventory (user_id, item_id, quantidade, equipado)
            VALUES (?, ?, ?, 0)
            `).run(userId, itemId, quantidade);
        }
    }
}

function getFreeHand(userId) {
    const hands = db.prepare(`
    SELECT slot_override FROM user_inventory
    WHERE user_id = ? AND equipado = 1 AND slot_override IN ('rhand', 'lhand')
    `).all(userId);

    const used = hands.map(h => h.slot_override);
    if (!used.includes('rhand')) return 'rhand';
    if (!used.includes('lhand')) return 'lhand';
    return null; // Ambas ocupadas
}

module.exports = { equip, unequip, addItem, getFreeHand };
