const { db } = require('../utils/db.js'); // ajuste o caminho conforme seu projeto
const { safeJsonParse } = require('../functions/JsonDesc.js');

function generateLoot({
    tier = 1,
    dropAmt = 1,
    certainDrop = 0,
    allowedTypes = ['equip', 'value', 'consumable'],
    specificType = null,
    highTierChance = 0,
    lowTierChance = 0,
    valuableIds = []
}) {
    const results = [];

    for (let i = 0; i < dropAmt; i++) {
        if (dropAmt <= 0) break;

        // Decide se este drop é "garantido"
        const isCertain = i < certainDrop;

        // 🎲 Determina o range de drop
        const roll = isCertain ? getRandomInt(1, 5) : getRandomInt(1, (9 + dropAmt));
        console.log("roll:"+roll);
        if (roll > 5 && !isCertain) {
            results.push(null); //nothin
            continue;
        }

        // Decide tipo de item
        let itemType;
        if (specificType) {
            itemType = specificType;
        } else {
            itemType = randomFromArray(allowedTypes); // 👈 aleatório dentro da lista permitida
        }

        // Escolhe slot de equipamento se for equip
        let slot = 'none';
        if (itemType === 'equip') {
            const sub = getRandomInt(1, 8);
            slot = getEquipSlotBySub(sub);
        }

        let finalTier = tier;
        if (lowTierChance > 0 && rollPercent(lowTierChance)) finalTier--;
        if (highTierChance > 0 && rollPercent(highTierChance)) finalTier++;
        console.log("type:"+itemType+" slot:"+slot+" tier:"+finalTier);

        // Busca item real no banco
        const item = getRandomItemFromDB({
            itemType,
            tier: finalTier,
            slot,
            itemIdWhitelist: itemType === 'value' ? valuableIds : []
        });
        console.log("result:"+item.nome);
        results.push(item || null); // pusha o item real ou null se nada achado
    }

    return results;
}


function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollPercent(chance) {
    return Math.random() * 100 < chance;
}

function randomFromArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
}

function getEquipSlotBySub(sub) {
    switch (sub) {
        case 1: return 'hand';
        case 2: return 'hand';
        case 3: return 'hand';
        case 4: return 'torso';
        case 5: return 'arms';
        case 6: return 'legs';
        case 7: return 'head';
        case 8: return 'acc';
        default: return 'none';
    }
}

function processLootFromNPC(npc) {
    const lootConfig = npc.Loot ? safeJsonParse(npc.Loot) : {};
    console.log('npc loot config:'+JSON.stringify(lootConfig));

    const {
        dropAmt = 1,
        certainDrop = 0,
        allowedTypes = ['equip', 'value', 'consumable'],
        specificType = null,
        highTierChance = 0,
        lowTierChance = 0,
        value = [] // lista de IDs específicos
    } = lootConfig;

    const drops = generateLoot({
        dropAmt,
        certainDrop,
        allowedTypes,
        specificType,
        highTierChance,
        lowTierChance,
        valuableIds: value // 👈 enviado para uso interno
    });
    console.log("drops:"+JSON.stringify(drops));
    return drops.filter(item => item !== null && item !== undefined);
    //return drops;
}

function getRandomItemFromDB({ itemType, tier, slot, itemIdWhitelist = [] }) {
    let query = `
    SELECT * FROM items
    WHERE tipo = ?
    AND tier = ?
    `;
    const params = [itemType, tier];

    if (slot && slot !== 'none') {
        query += ` AND slot = ?`;
        params.push(slot);
    }

    if (itemType === 'value' && itemIdWhitelist.length > 0) {
        const placeholders = itemIdWhitelist.map(() => '?').join(',');
        query += ` AND id IN (${placeholders})`;
        params.push(...itemIdWhitelist);
    }

    const candidates = db.prepare(query).all(...params);
    if (!candidates || candidates.length === 0) return null;

    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index];
}

function insertToInventory(userId, loot) {
    const insert = db.prepare(`
    INSERT INTO user_inventory (user_id, item_id, quantidade, equipado)
    VALUES (?, ?, ?, 0)
    `);

    const check = db.prepare(`
    SELECT id, quantidade FROM user_inventory
    WHERE user_id = ? AND item_id = ? AND equipado = 0
    `);

    const update = db.prepare(`
    UPDATE user_inventory SET quantidade = ? WHERE id = ?
    `);

    const transaction = db.transaction(() => {
        for (const item of loot) {
            if (!item || !item.id) continue;

            const { id: itemId, tipo } = item;

            if (tipo !== 'equip') {
                // Stackáveis
                const row = check.get(userId, itemId);
                if (row) {
                    const newQty = row.quantidade + 1;
                    update.run(newQty, row.id);
                    continue;
                }
            }

            // Equipáveis ou ainda não no inventário
            insert.run(userId, itemId, 1);
        }
    });

    transaction();
}

module.exports = { processLootFromNPC, generateLoot, getRandomItemFromDB, insertToInventory };
