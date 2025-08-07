const { DEBUG } = require('../config.js');
const { db, getUserData, getUserPerks } = require('../utils/db.js');
const { addStatus } = require('../functions/CombatEffects.js');
const { npcInitialize } = require('../functions/stats.js');
const stats = require('./stats');

function createCombat(userId, npcId) {

    const user = getUserData(userId);
    if (!user) throw new Error('Usuário não encontrado');
    stats.updatePerkMoves(userId);
    stats.modApply(user); // aplica perks/equips etc

    const npc = db.prepare('SELECT * FROM npcs WHERE id = ?').get(npcId);
    if (!npc) throw new Error('NPC não encontrado');


    const userClone = { ...user };

    for (const perk of getUserPerks(userId)) {
        const mods = JSON.parse(perk.mods || '{}');

        for (const key in mods) {
            if (key.startsWith('tag')) {
                const tag = key.slice(3); // remove "tag:"
                addStatus(userClone, tag);
            }
        }
    }

    const npcBase = db.prepare('SELECT * FROM npcs WHERE id = ?').get(npcId);
    // Clona NPC com update de stats
    const npcClone = { ...npcBase };
    npcClone.STATUS = npc.STATUS;
    //npcClone.STATUS = JSON.parse(npc.STATUS || '[]');

    const derived = npcInitialize(npcClone);

    Object.assign(npcClone, derived); // safe in-memory update

    const userDataJSON = JSON.stringify(userClone);
    const npcDataJSON = JSON.stringify(npcClone);

    // Cria combate
    const result = db.prepare(`
    INSERT INTO combat (user_id, npc_id, user_data, npc_data, dist, state)
    VALUES (?, ?, ?, ?, 0, 'waiting')
    `).run(userId, npcId, userDataJSON, npcDataJSON);

    /*//Deleta combate antigo
    db.prepare(`
    DELETE FROM combat
    WHERE id IN (
        SELECT id FROM combat
        ORDER BY id ASC
        LIMIT (SELECT COUNT(*) - 100 FROM combat)
    )
    `).run();*/

    // Atualiza evento do jogador
    db.prepare('UPDATE users SET EVENT = ? WHERE id = ?').run(`combate:${result.lastInsertRowid}`, userId);

    return result.lastInsertRowid;
}
module.exports = { createCombat };
