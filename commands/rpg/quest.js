const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, db } = require('../../utils/db.js');
const { getTile } = require('../../functions/MapReader.js');
const { barCreate, addxp } = require('../../functions/stats.js');
const { info, cft } = require("../../data/locale.js");
const block = require('../../utils/block.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Get a new quest or handle an ongoing quest')
    .setNameLocalizations({ "pt-BR": "missão", })
    .setDescriptionLocalizations({ "pt-BR": "Adquire uma nova missão ou checa o progresso de uma", })
    .addStringOption(option =>
    option.setName('options')
    .setDescription('Report or Abandon the quest')
    .setNameLocalizations({ "pt-BR": "opções", })
    .setDescriptionLocalizations({ "pt-BR": "Reportar ou Abandonar a missão", })
    .setRequired(false)
    .addChoices(
        { name: 'Report', value: 'report' },
        { name: 'Abandon', value: 'cancel' },
    )),
    async execute(interaction) {
        try {
            const user = getUserData(interaction.user.id);
            const option = interaction.options.getString('options');

            const blocks = block.noChar(user) || block.onEvent(user) || block.Resting(user);
            if (blocks) return interaction.reply({ content: blocks , ephemeral: true });

            // Busca posição e ocupação atual do usuário
            const [x, y] = user.AREA.split(',').map(Number);
            const userPos = getTile(x, y);

            if (!userPos) {
                return interaction.reply({ content: 'Não foi possível encontrar sua posição no mapa.', ephemeral: true });
            }

            // Verifica se já tem quest ativa
            const activeQuest = db.prepare(`
            SELECT * FROM user_quests
            WHERE user_id = ? AND estado = 0
            LIMIT 1
            `).get(user.id);

            if (option === 'report') {
                if (!activeQuest) {
                    return interaction.reply({ content: 'Você não tem uma missão ativa.', ephemeral: true });
                }
                const inicio = JSON.parse(activeQuest.inicio);
                const questCoords = inicio[1]; // [x, y]
                const [x, y] = user.AREA.split(',').map(Number);

                if (x !== questCoords[0] || y !== questCoords[1]) {
                    return interaction.reply({ content: 'Você precisa estar no local onde pegou a missão para reportar.', ephemeral: true });
                }

                const alvo = JSON.parse(activeQuest.alvo);
                const recompensa = JSON.parse(activeQuest.recompensa);

                // Verificar se os requisitos foram atendidos
                const completed = checkProgress(activeQuest, alvo);

                if (!completed) {
                    return interaction.reply({ content: '❌ Você ainda não cumpre os requisitos da missão.', ephemeral: true });
                }

                // Marca como concluída
                db.prepare(`
                UPDATE user_quests
                SET estado = 1
                WHERE id = ?
                `).run(activeQuest.id);

                // Recompensa
                for (const [itemId, qty] of recompensa) {
                    const row = db.prepare(`
                    SELECT quantidade FROM user_inventory
                    WHERE user_id = ? AND item_id = ? AND equipado = 0
                    `).get(user.id, itemId);

                    if (row) {
                        db.prepare(`
                        UPDATE user_inventory
                        SET quantidade = quantidade + ?
                        WHERE user_id = ? AND item_id = ? AND equipado = 0
                        `).run(qty, user.id, itemId);
                    } else {
                        db.prepare(`
                        INSERT INTO user_inventory (user_id, item_id, quantidade, equipado)
                        VALUES (?, ?, ?, 0)
                        `).run(user.id, itemId, qty);
                    }
                }

                const desc = describe(activeQuest, alvo, true);
                let lvlup = false;
                lvlup = addxp(user, userPos.rank);

                const embed = new EmbedBuilder()
                .setTitle(`:star: Você completou sua missão :star:`)
                .setDescription(`${desc}\n🏆 ${cft.got} **${userPos.rank} XP** ${lvlup ? `\n\n${info.lvlup}` : ""}`)
                .setColor(0xffd700)
                .setFooter({text: interaction.user.username,iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,});

                return interaction.reply({ embeds: [embed]});
            }

            if (option === 'cancel') {
                if (!activeQuest) {
                    return interaction.reply({ content: 'Você não tem uma quest ativa.', ephemeral: true });
                }

                db.prepare(`
                UPDATE user_quests
                SET estado = 2
                WHERE id = ?
                `).run(activeQuest.id);

                // Placeholder para teste
                return interaction.reply({ content: '📜❌ Você abandonou sua missão', ephemeral: true });
            }

            if (activeQuest) {
                let alvo;
                try { alvo = JSON.parse(activeQuest.alvo); } catch { alvo = []; }

                const desc = describe(activeQuest, alvo);

                const embed = new EmbedBuilder()
                .setTitle('📜 Current Quest')
                .setDescription(desc)
                .setColor(0xffd700)
                .setFooter({text: interaction.user.username,iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,});

                return interaction.reply({ embeds: [embed]});
            }

            if (userPos.ocup < 1) {
                return interaction.reply({ content: 'Você não está em uma area populosa os suficiente para encontrar missões.', ephemeral: true });
            }

            // Placeholder: cria uma quest fixa
            const tipo = Math.random() < 0.5 ? 'deliver' : 'hunt';

            function getRandomItem(arr) {
                const index = Math.floor(Math.random() * arr.length);
                return arr[index];
            }

            let alvo;
            if (tipo === 'deliver') {
                alvo = JSON.stringify([getRandomItem([3,4,5,6,7]), Math.floor(Math.random()*(userPos.rank*2))+userPos.rank]); // item id 3, quantidade X
            } else {
                const stmt = db.prepare(`
                SELECT id FROM npcs
                WHERE NV = ?
                ORDER BY RANDOM()
                LIMIT 1;
                `);
                const npcData = stmt.get(userPos.rank ?? 1);
                const npcid = npcData ? npcData.id : null;

                alvo = JSON.stringify([npcid, Math.floor(Math.random()*(userPos.rank + 1))+1, 0]); // npc id 45, quantidade necessária X, atual 0
            }

            const recompensa = JSON.stringify([[1, (50*userPos.rank)+((Math.floor(Math.random()*(userPos.rank + 1))+1)*(10+((user.CAR+user.Pol)*5)))], [getRandomItem([15,18,22]), Math.floor(Math.random()*(userPos.rank + 1))+1]]);
            const inicio = JSON.stringify([Date.now(), [userPos.x, userPos.y]]);

            db.prepare(`
            INSERT INTO user_quests (user_id, tipo, alvo, recompensa, estado, inicio)
            VALUES (?, ?, ?, ?, 0, ?)
            `).run(user.id, tipo, alvo, recompensa, inicio);

            return interaction.reply({ content: `Nova quest adquirida! Tipo: **${tipo}**` });
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: 'Ocorreu um erro ao tentar gerar a quest.', ephemeral: true });
        }
    }
};

function describe (activeQuest, alvo, noprog=false){

    // Pega area da missão
    const inicioData = JSON.parse(activeQuest.inicio);
    const [x, y] = inicioData[1];

    // Pega recompensa da missão
    let recompensa;
    try { recompensa = JSON.parse(activeQuest.recompensa); } catch { recompensa = []; }

    // Monta string da recompensa
    const rewardStr = recompensa.map(([itemId, qty]) => {
        const itemNameRow = db.prepare(`SELECT nome FROM items WHERE id = ?`).get(itemId);
        const itemName = itemNameRow ? itemNameRow.nome : `Item ${itemId}`;
        return `${qty}x ${itemName}`;
    }).join(', ');

    if (activeQuest.tipo === 'deliver') {
        const [itemId, required] = alvo;
        const itemNameRow = db.prepare(`SELECT nome FROM items WHERE id = ?`).get(itemId);
        const itemName = itemNameRow ? itemNameRow.nome : `Item ${itemId}`;
        const inv = db.prepare(`
        SELECT quantidade FROM user_inventory
        WHERE user_id = ? AND item_id = ? AND equipado = 0
        `).get(activeQuest.user_id, itemId);
        const haveQty = inv ? inv.quantidade : 0;

        if (noprog) return(`**Objective:** Deliver ${required}x ${itemName} at **${x},${y}**\n\n**Reward:** ${rewardStr}`);
        return(`**Objective:** Deliver ${required}x ${itemName} at **${x},${y}** \n**Progress:** ${haveQty}/**${required}**\n\n**Reward:** ${rewardStr}`);
    }
    if (activeQuest.tipo === 'hunt') {
        const [npcId, required, current] = alvo;
        const npcNameRow = db.prepare(`SELECT nome FROM npcs WHERE id = ?`).get(npcId);
        const npcName = npcNameRow ? npcNameRow.nome : `NPC ${npcId}`;

        if (noprog) return(`**Objective:** Eliminate ${required}x ${npcName} and report at **${x},${y}**\n\n**Reward:** ${rewardStr}`);
        return(`**Objective:** Eliminate ${required}x ${npcName} and report at **${x},${y}**\n**Progress:** ${current}/**${required}**\n\n**Reward:** ${rewardStr}`);
    }
}

function checkProgress(activeQuest, alvo){
    if (activeQuest.tipo === 'deliver') {
        const [itemId, required] = alvo;
        const inv = db.prepare(`
        SELECT quantidade FROM user_inventory
        WHERE user_id = ? AND item_id = ? AND equipado = 0
        `).get(activeQuest.user_id, itemId);
        const haveQty = inv ? inv.quantidade : 0;
        if (haveQty >= required) {
            // Remove itens
            db.prepare(`
            UPDATE user_inventory
            SET quantidade = quantidade - ?
            WHERE user_id = ? AND item_id = ? AND equipado = 0
            `).run(required, activeQuest.user_id, itemId);
            return true;
        }
    }
    if (activeQuest.tipo === 'hunt') {
        const [npcId, required, current] = alvo;
        if (current >= required) {
            return true;
        }
    }
    return false;
}
