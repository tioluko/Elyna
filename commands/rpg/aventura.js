const { SlashCommandBuilder} = require('discord.js');
const { getUserData, db } = require('../../utils/db.js');
const stats = require('../../functions/stats.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('adventure')
    .setDescription('Look for trouble')
    .setNameLocalizations({ "pt-BR": "aventura", })
    .setDescriptionLocalizations({ "pt-BR": "Procura treta", }),

    async execute(interaction) {
        const user = getUserData(interaction.user.id);
        //let npcId = 0;
        function getRandomInt(min, max) {
            const minCeiled = Math.ceil(min);
            const maxFloored = Math.floor(max);
            return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // The maximum is inclusive and the minimum is inclusive
        }


        if (!user) {
            return interaction.reply(`:star: Voce ainda não tem um personagem, use o comando **/criarficha** para criar um! :star:`);
        }
        if (user.EVENT?.startsWith('combate:')) {
            return interaction.reply(`:star: Voce ja está em combate, use o comando **/ação** lutar! :star:`);
        }
        stats.fullheal(user);
        let nivel = 0
        if (user.NV === 1) {nivel = 1}
        else if (user.NV === 2) {nivel = (getRandomInt(1,2))}
        else {nivel = (getRandomInt(2,3))}

        const stmt = db.prepare('SELECT * FROM npcs WHERE NV = ? ORDER BY RANDOM() LIMIT 1');
        const npc = stmt.get(nivel);
        const npcId = parseInt(npc.id);
        const { createCombat } = require('../../functions/CombatEvent.js');

        try {
            const combateId = createCombat(interaction.user.id, npcId);
            //const npc = db.prepare('SELECT * FROM npcs WHERE id = ?').get(npcId);
            if (!npc) throw new Error('NPC não encontrado');
            return interaction.reply(`Combate iniciado contra um ${npc.nome}, use /ação para agir`);
        } catch (e) {
            console.error('Erro ao criar combate:', e);
            return interaction.reply('Erro ao iniciar combate.');
        }
    }
};
