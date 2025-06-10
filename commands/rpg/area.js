const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, updateUserData } = require('../../utils/db.js');
const { generateMiniMapImage } = require('../../utils/ImageGen.js');
const { getLocalGrid, getTile } = require('../../functions/MapReader.js');
const mapa = require('../../data/map.json');


module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('area')
    .setDescription('Exibe informação da area local e arredores'),

    async execute(interaction){
        const user = getUserData(interaction.user.id);
        if (!user) {
            return interaction.reply(`:star: Voce ainda não tem um personagem, use o comando **/criarficha** para criar um! :star:`);
        }
        const [x, y] = user.AREA.split(',').map(Number);
        //const [x, y] = [7,15];
        const tile = getTile(x, y);

        const miniMapBuffer = await generateMiniMapImage(x, y, mapa);

        const file = new AttachmentBuilder(miniMapBuffer, { name: 'mapa.png' });

        const embed = new EmbedBuilder()
        .setTitle(`🧭 Área Atual: ${tile.nome !== 'none' ? tile.nome : `Terreno ${tile.tipo}`}`)
        .setDescription(`📌 Localização: (${x}, ${y})\n🌎 Tipo: ${tile.tipo}\n🧱 Rank: ${tile.rank}`)
        .setImage('attachment://mapa.png');

        await interaction.reply({ embeds: [embed], files: [file] });
    }
}
