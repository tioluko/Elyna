const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, updateUserData } = require('../../utils/db.js');
const { generateMiniMapImage } = require('../../utils/ImageGen.js');
const { getLocalGrid, getTile } = require('../../functions/MapReader.js');
const { info, map } = require("../../data/locale.js");
const mapa = require('../../data/map.json');


module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('area')
    .setDescription('Exibe informação da area local e arredores'),

    async execute(interaction){
        const user = getUserData(interaction.user.id);
        if (!user) {
            return interaction.reply(info.no_character);
        }
        const [x, y] = user.AREA.split(',').map(Number);
        //const [x, y] = [7,15];
        const tile = getTile(x, y);

        const miniMapBuffer = await generateMiniMapImage(x, y, mapa);

        const file = new AttachmentBuilder(miniMapBuffer, { name: 'mapa.png' });

        const embed = new EmbedBuilder()
        .setTitle(`🧭 Área Atual: ${tile.nome !== 'none' ? tile.nome : `Terreno ${tile.tipo}`}`)
        .setDescription(`📌 Localização: (${x}, ${y})\n Tipo: ${tile.tipo}\n Rank: ${tile.rank}\n Ocupação: ${tile.ocup}\n Contaminação: ${tile.cont}`)
        .setImage('attachment://mapa.png');

        /*
         Type wilderness/village  Name(if there is one)*

         The temperarute is (Freezing-10 / Cold-9,0 / Chilly1,10 / Brisk/Cool 11,20 /Mild / Warm21,30  / Hot31,40 /Scorching 41+) in here

         nothing - You think you might find resources in here * (not 100% info)

         nothing  -  There is some anomalous aura in the area * (not 100% info)
         0 There is no anomaly in this area.
         1 There is some faint anomalous aura here.
         2 This area is fairly anomalous.
         3 This area is under high anomalous pressure.
         4 This place is overwhelmed with anomaly;

        */

        await interaction.reply({ embeds: [embed], files: [file] });
    }
}
