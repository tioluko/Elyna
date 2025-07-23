const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, updateUserData, db } = require('../../utils/db.js');
const stats = require('../../functions/stats.js');
const { barCreate } = require('../../functions/stats.js');
const { getTile } = require('../../functions/MapReader.js');
const { createCombat } = require('../../functions/CombatEvent.js');
const { getEvent, addItem } = require('../../functions/EventGen.js');
const { info, map } = require('../../data/locale.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('explore')
    .setDescription('Explore the area you are in')
    .setNameLocalizations({ "pt-BR": "explorar" })
    .setDescriptionLocalizations({ "pt-BR": "Explora a area em que você se encontra" }),

    async execute(interaction) {
        let user = getUserData(interaction.user.id);
        if (!user) {
            return interaction.reply(info.no_character);
        }
        if (user.EVENT !== 'none') return interaction.reply({ content: info.on_event, ephemeral: true });

        // 🗺️ Pega tile atual
        const [x, y] = user.AREA.split(',').map(Number);
        const tile = getTile(x, y);
        if (!tile) return interaction.reply(`⚠️ Invalid area.`);

        //stats.fullheal(user); //temporario

        if (user.PE < tile.rank) {
            return interaction.reply(`:star: ${map.youneed} ${tile.rank} ${map.sp} ${map.onlyhave} ${user.PE} :star:`);
        }

        // Pagar o custo
        updateUserData(user.id, {PE: user.PE - tile.rank});


        function rollPercent(chance) {
            //let nbr = Math.random() * 100;
            //console.log(`${nbr}  dt:${10+(tile.cont*10)+(tile.rank*2)}`);
            //return nbr < chance;
            return Math.random() * 100 < chance;
        }

        if (rollPercent(20+(tile.cont*10)+(tile.rank*2))){
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
                .setImage(npc.image)
                .setFooter({text: interaction.user.username,iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,});
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

        }else{
            const result = getEvent(tile.tipo, tile.cont, tile.ocup, tile.rank);

            if (!result) {
                return interaction.reply(`🚫 No event found.`);
            }

            if (result.itemId !== null && result.qtd > 0) {
                try {
                    addItem(user.id, result.itemId, result.qtd);
                } catch (e) {
                    console.error('Erro ao adicionar item ao inventário:', e);
                }
            }

            //(result.eventoId === algo especifico && result.qtd > 0) {
            // coisa especifica (algo que recupera hp, sp, etc, ou efeito negativo)
            //}

            try {
                user = getUserData(interaction.user.id);
                console.log(`${result.msg}`); // log

                const embed = new EmbedBuilder()
                .setDescription(`**${user.nome}**`)
                .addFields(
                    {name: "\u200B", value: result.msg},
                    {name: "\u200B", value: `${barCreate(user,"PE")} **${map.sp}: **${user.PE} / ${user.MPE}`}
                )
                .setFooter({text: interaction.user.username,iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,});
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
    }
};
