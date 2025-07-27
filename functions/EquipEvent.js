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

    // Se for item de mão
    if (slot === 'hand') {
        slot = getFreeHand(userId);
        if (!slot) throw new Error('Ambas as mãos já estão ocupadas.');
    }

    // Se for item de duas mãos
    if (slot === '2hand') {
        if (!getFreeHand(userId)) throw new Error('Ambas as mãos já estão ocupadas.');
        slot = 'hands';

        const handsToUnequip = db.prepare(`
        SELECT ui.id, i.move_id
        FROM user_inventory ui
        JOIN items i ON i.id = ui.item_id
        WHERE ui.user_id = ? AND ui.equipado = 1
        AND ui.slot_override IN ('rhand', 'lhand')
        `).all(userId);

        db.prepare(`
        UPDATE user_inventory SET equipado = 0, slot_override = NULL
        WHERE user_id = ? AND slot_override IN ('rhand', 'lhand')
        `).run(userId);

        // Remove os moves dos itens que foram removidos das mãos
        for (const item of handsToUnequip) {
            db.prepare(`
            DELETE FROM user_moves
            WHERE user_id = ? AND origem = ?
            `).run(userId, `equip:${item.id}`);
        }
    } else {
        // Desequipa qualquer item anterior no mesmo slot (exceto mãos que já foram tratadas acima)
        const existing = db.prepare(`
        SELECT ui.id, i.move_id
        FROM user_inventory ui
        JOIN items i ON i.id = ui.item_id
        WHERE ui.user_id = ? AND ui.equipado = 1 AND ui.slot_override = ?
        `).get(userId, slot);

        if (existing) {
            db.prepare(`
            UPDATE user_inventory SET equipado = 0, slot_override = NULL
            WHERE user_id = ? AND id = ?
            `).run(userId, existing.id);

            if (existing.move_id) {
                db.prepare(`
                DELETE FROM user_moves
                WHERE user_id = ? AND origem = ?
                `).run(userId, `equip:${existing.id}`);
            }
        }
    }

    // Atualiza novo item como equipado
    db.prepare(`
    UPDATE user_inventory SET equipado = 1, slot_override = ? WHERE id = ?
    `).run(slot, invId);

    // Remove move desarmado se ambas mãos ocupadas
    if (!getFreeHand(userId)) {
        db.prepare(`
        DELETE FROM user_moves WHERE user_id = ? AND move_id = 96
        `).run(userId);
    }

    // Adiciona movimento do novo item, se existir
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

    // Atualiza stats
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    const moddedUser = modApply(user);
    updateUserData(user.id, calculateStats(moddedUser));

    // Se sobrou mão livre, garante ataque desarmado
    if (getFreeHand(userId)) {
        const alreadyHas = db.prepare(`
        SELECT 1 FROM user_moves WHERE user_id = ? AND move_id = 96
        `).get(userId);
        if (!alreadyHas) {
            db.prepare(`
            INSERT INTO user_moves (user_id, move_id, origem, mods)
            VALUES (?, 96, 'auto:unarmed', '{}')
            `).run(userId);
        }
    }

    return moddedUser;
}

/*function equip(userId, invId) {
    const inv = db.prepare(`
    SELECT ui.*, i.slot, i.move_id, i.mods
    FROM user_inventory ui
    JOIN items i ON i.id = ui.item_id
    WHERE ui.id = ? AND ui.user_id = ?
    `).get(invId, userId);
    if (!inv) throw new Error("Item inexistente ou inválido");

    let slot = inv.slot;

    // ← Pegue os itens equipados nas mãos ANTES de desequipar qualquer coisa
    let prevHandItems = [];
    if (['hand', '2hand'].includes(inv.slot)) {
        for (const item of prevHandItems) {
            const stillEquipped = db.prepare(`
            SELECT equipado FROM user_inventory WHERE id = ?
            `).get(item.id);

            if (!stillEquipped || stillEquipped.equipado === 0) {
                db.prepare(`
                DELETE FROM user_moves
                WHERE user_id = ? AND origem = ?
                `).run(userId, `equip:${item.id}`);
            }
        }
    }

    // Escolher slot correto
    if (slot === 'hand') {
        slot = getFreeHand(userId);
        if (!slot) throw new Error('Ambas as mãos já estão ocupadas.');
    } else if (slot === '2hand') {
        if (!getFreeHand(userId)) throw new Error('Ambas as mãos já estão ocupadas.');
        slot = 'hands';

        // Captura os itens nas mãos que serão desequipados
        const twoHandPreItems = db.prepare(`
        SELECT ui.id, i.move_id
        FROM user_inventory ui
        JOIN items i ON i.id = ui.item_id
        WHERE ui.user_id = ? AND ui.equipado = 1
        AND ui.slot_override IN ('rhand', 'lhand')
        `).all(userId);

        // Desequipa quaisquer itens nas mãos
        db.prepare(`
        UPDATE user_inventory SET equipado = 0, slot_override = NULL
        WHERE user_id = ? AND slot_override IN ('rhand', 'lhand')
        `).run(userId);

        // Remove moves dos itens desequipados
        for (const item of twoHandPreItems) {
            const stillEquipped = db.prepare(`
            SELECT equipado FROM user_inventory WHERE id = ?
            `).get(item.id);

            if (!stillEquipped || stillEquipped.equipado === 0) {
                db.prepare(`
                DELETE FROM user_moves
                WHERE user_id = ? AND origem = ?
                `).run(userId, `equip:${item.id}`);
            }
        }
    }

    // Atualiza novo item como equipado
    db.prepare(`
    UPDATE user_inventory SET equipado = 1, slot_override = ? WHERE id = ?
    `).run(slot, invId);

    // Remove ataque desarmado se ambas as mãos ocupadas
    if (!getFreeHand(userId)) {
        db.prepare(`
        DELETE FROM user_moves WHERE user_id = ? AND move_id = 96
        `).run(userId);
    }

    // Adiciona movimento do item, se existir
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

    // Atualiza stats
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    const moddedUser = modApply(user);
    updateUserData(user.id, calculateStats(moddedUser));

    // Garante ataque desarmado se mão livre
    if (getFreeHand(userId)) {
        const alreadyHas = db.prepare(`
        SELECT 1 FROM user_moves WHERE user_id = ? AND move_id = 96
        `).get(userId);
        if (!alreadyHas) {
            db.prepare(`
            INSERT INTO user_moves (user_id, move_id, origem, mods)
            VALUES (?, 96, 'auto:unarmed', '{}')
            `).run(userId);
        }
    }

    return moddedUser;
}*/


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

    // Remove movimento, se existir
    if (inv.move_id) {
        db.prepare(`
        DELETE FROM user_moves
        WHERE user_id = ? AND move_id = ? AND origem = ?
        `).run(userId, inv.move_id, `equip:${invId}`);
    }

    // Restaura ataque desarmado se sobrar mão livre
    if (getFreeHand(userId)) {
        const alreadyHas = db.prepare(`
        SELECT 1 FROM user_moves WHERE user_id = ? AND move_id = 96
        `).get(userId);
        if (!alreadyHas) {
            db.prepare(`
            INSERT INTO user_moves (user_id, move_id, origem, mods)
            VALUES (?, 96, 'auto:unarmed', '{}')
            `).run(userId);
        }
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
        // Equipáveis devem sempre ser adicionados como instância nova
        db.prepare(`
        INSERT INTO user_inventory (user_id, item_id, quantidade, equipado)
        VALUES (?, ?, 1, 0)
        `).run(userId, itemId);
    } else {
        // Empilháveis: verificar se já existe
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
    WHERE user_id = ? AND equipado = 1 AND slot_override IN ('rhand', 'lhand', 'hands')
    `).all(userId);

    const used = hands.map(h => h.slot_override);
    if (used.includes('hands')) return null; // 2hand ocupa ambas
    if (!used.includes('rhand')) return 'rhand';
    if (!used.includes('lhand')) return 'lhand';
    return null; // Ambas ocupadas
}

module.exports = { equip, unequip, addItem, getFreeHand };
