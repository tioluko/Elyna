const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, db } = require('../../utils/db.js');
const stats = require('../../functions/stats.js');
const { getTile } = require('../../functions/MapReader.js');
const { createCombat } = require('../../functions/CombatEvent.js');
const { info, map } = require('../../data/locale.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('explore')
    .setDescription('Explore the area you are in')
    .setNameLocalizations({ "pt-BR": "explorar" })
    .setDescriptionLocalizations({ "pt-BR": "Explora a area em que você se encontra" }),

    async execute(interaction) {
        const user = getUserData(interaction.user.id);
        if (!user) {
            return interaction.reply(info.no_character);
        }
        if (user.EVENT !== 'none') return interaction.respond(blockAutocomplete(eq.on_event));

        // 🗺️ Pega tile atual
        const [x, y] = user.AREA.split(',').map(Number);
        const tile = getTile(x, y);
        if (!tile) return interaction.reply(`⚠️ Invalid area.`);

        stats.fullheal(user); //temporario

        //`:star: Found a fruit bearing tree :star: \n\n You magaged to collect X fruits from it! :apple:`
        //`:star: Found some edible mushrooms :star: \n\n You magaged to collect X mushrooms! :brown_mushroom:`
        //`:star: Found some medicinal herbs :star: \n\n You magaged to harvest X of them! :herb:`
        //`:star: Found some medicinal roots :star: \n\n You magaged to harvest X of them! :ginger_root:`
        //`:star: Found some rare medicinal flowers :star: \n\n You magaged to harvest X of them! :blossom:`
        //

        // 🔍 Busca NPCs compatíveis no mapa
        const stmt = db.prepare(`
        SELECT n.* FROM npc_encounters e
        JOIN npcs n ON n.id = e.npc_id
        WHERE (e.tipo = ? OR e.tipo = -1)
        AND e.cont <= ?
        AND e.ocup <= ?
        AND ABS(n.NV - ?) <= 1
        ORDER BY RANDOM()
        LIMIT 1
        `);
        const npc = stmt.get(tile.tipo, tile.cont ?? 0, tile.ocup ?? 0, tile.rank ?? 1);

        if (!npc) {
            return interaction.reply(`🚫 No enemy can be found here.`);
        }

        try {
            const combateId = createCombat(user.id, npc.id);
            const embed = new EmbedBuilder()
            .setDescription(`**${npc.nome}** ${map.encounter}`)
            .setImage(npc.image);
            interaction.reply({ embeds: [embed] }).then(() =>
            setTimeout(
                () => interaction.deleteReply(),
                       10_000 // not sure if you wanted 2000 (2s) or 20000 (20s)
            )
            )

        } catch (e) {
            console.error('Erro ao criar combate:', e);
            return interaction.reply(`❌ Erro ao iniciar combate.`);
        }
    }
};
