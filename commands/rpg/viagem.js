const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, updateUserData } = require('../../utils/db.js');
const { generateMiniMapImage } = require('../../utils/ImageGen.js');
const { getTile } = require('../../functions/MapReader.js');
const mapa = require('../../data/map.json');

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('viajar')
    .setDescription('Viaja para uma direção')
    .addStringOption(option =>
    option.setName('direcao')
    .setDescription('Para onde deseja ir?')
    .setRequired(true)
    .addChoices(
        { name: 'Norte', value: 'norte' },
        { name: 'Sul', value: 'sul' },
        { name: 'Leste', value: 'leste' },
        { name: 'Oeste', value: 'oeste' },
        { name: 'Nordeste', value: 'nordeste' },
        { name: 'Noroeste', value: 'noroeste' },
        { name: 'Sudeste', value: 'sudeste' },
        { name: 'Sudoeste', value: 'sudoeste' },
    )
    ),

    async execute(interaction) {
        const user = getUserData(interaction.user.id);
        if (!user) {
            return interaction.reply(`:star: Voce ainda não tem um personagem, use o comando **/criarficha** para criar um! :star:`);
        }

        const dir = interaction.options.getString('direcao');
        const directions = {
            norte: [0, -1],
            sul: [0, 1],
            leste: [1, 0],
            oeste: [-1, 0],
            nordeste: [1, -1],
            noroeste: [-1, -1],
            sudeste: [1, 1],
            sudoeste: [-1, 1]
        };

        const [dx, dy] = directions[dir];
        const [currX, currY] = user.AREA.split(',').map(Number);

        const newX = currX + dx;
        const newY = currY + dy;

        const tile = getTile(newX, newY);
        if (!tile) return interaction.reply('❌ Direção inválida ou fora do mapa!');

        // Atualiza posição
        updateUserData(user.id, { AREA: `${newX},${newY}` });

        // Gera imagem do novo local
        const miniMapBuffer = await generateMiniMapImage(newX, newY, mapa);
        const file = new AttachmentBuilder(miniMapBuffer, { name: 'mapa.png' });

        const embed = new EmbedBuilder()
        .setTitle(`🧭 Nova Área: ${tile.nome !== 'none' ? tile.nome : `Terreno ${tile.tipo}`}`)
        .setDescription(`📌 Localização: (${newX}, ${newY})\n🌎 Tipo: ${tile.tipo}\n🧱 Rank: ${tile.rank}`)
        .setImage('attachment://mapa.png');

        await interaction.reply({ embeds: [embed], files: [file] });
    }
};
