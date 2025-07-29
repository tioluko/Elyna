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
        SELECT ui.id, ui.item_id, i.move_id
        FROM user_inventory ui
        JOIN items i ON i.id = ui.item_id
        WHERE ui.user_id = ? AND ui.equipado = 1 AND ui.slot_override = ?
        `).get(userId, slot);

        if (existing) {
            const oldItemId = existing.item_id;
            // Remove da tabela
            db.prepare(`
            DELETE FROM user_inventory WHERE user_id = ? AND id = ?
            `).run(userId, existing.id);

            // Empilha o item de volta
            insertStacking(userId, oldItemId);

            // Remove movimento
            if (existing.move_id) {
                db.prepare(`
                DELETE FROM user_moves
                WHERE user_id = ? AND origem = ?
                `).run(userId, `equip:${existing.id}`);
            }
        }
    }

    let realInvId = invId;

    if (inv.quantidade > 1) {
        // Reduz a pilha original
        db.prepare(`
        UPDATE user_inventory SET quantidade = quantidade - 1 WHERE id = ?
        `).run(invId);

        // Cria nova instância equipada com quantidade 1
        db.prepare(`
        INSERT INTO user_inventory (user_id, item_id, quantidade, equipado, slot_override)
        VALUES (?, ?, 1, 1, ?)
        `).run(userId, inv.item_id, slot);

        // Captura o ID da nova instância
        realInvId = db.prepare(`SELECT last_insert_rowid() AS id`).get().id;
    } else {
        // Se não for empilhado, equipa normalmente
        db.prepare(`
        UPDATE user_inventory SET equipado = 1, slot_override = ? WHERE id = ?
        `).run(slot, invId);
    }

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
        `).run(userId, inv.move_id, `equip:${realInvId}`, JSON.stringify(moveMods));
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

function unequip(userId, invId) {
    const inv = db.prepare(`
    SELECT ui.*, i.slot, i.move_id
    FROM user_inventory ui
    JOIN items i ON i.id = ui.item_id
    WHERE ui.user_id = ? AND ui.id = ?
    `).get(userId, invId);
    if (!inv || !inv.equipado) throw new Error('Item não está equipado.');

    // Desequipa
    db.prepare(`DELETE FROM user_inventory WHERE user_id = ? AND id = ?`)
    .run(userId, invId);

    // Remove movimento, se existir
    if (inv.move_id) {
        db.prepare(`
        DELETE FROM user_moves
        WHERE user_id = ? AND move_id = ? AND origem = ?
        `).run(userId, inv.move_id, `equip:${invId}`);
    }

    // Tenta empilhar de volta
    insertStacking(userId, inv.item_id);

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
        insertStacking(userId, itemId);
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

function insertStacking(userId, itemId) {
    const stack = db.prepare(`
    SELECT id FROM user_inventory
    WHERE user_id = ? AND item_id = ? AND equipado = 0
    `).get(userId, itemId);

    if (stack) {
        db.prepare(`
        UPDATE user_inventory SET quantidade = quantidade + 1 WHERE id = ?
        `).run(stack.id);
    } else {
        db.prepare(`
        INSERT INTO user_inventory (user_id, item_id, quantidade, equipado)
        VALUES (?, ?, 1, 0)
        `).run(userId, itemId);
    }
}

module.exports = { equip, unequip, addItem, getFreeHand };
