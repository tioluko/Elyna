const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, updateUserData } = require('../../utils/db.js');
const { generateMiniMapImage } = require('../../utils/ImageGen.js');
const { getTile } = require('../../functions/MapReader.js');
const { info } = require('../../data/locale.js');
const mapa = require('../../data/map.json');

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Travel to another zone')
    .setNameLocalizations({ "pt-BR": "mover" })
    .setDescriptionLocalizations({ "pt-BR": "Viaja para outra zona" })
    .addStringOption(option =>
    option.setName('direcao')
    .setDescription('Where are you going?')
    .setNameLocalizations({ "pt-BR": "direção" })
    .setDescriptionLocalizations({ "pt-BR": "Para onde deseja ir?" })
    .setRequired(true)
    .addChoices(
        { name: 'North', value: 'norte' },
        { name: 'South', value: 'sul' },
        { name: 'East', value: 'leste' },
        { name: 'West', value: 'oeste' },
        { name: 'North-east', value: 'nordeste' },
        { name: 'North-west', value: 'noroeste' },
        { name: 'South-east', value: 'sudeste' },
        { name: 'South-west', value: 'sudoeste' },
    )
    ),

    async execute(interaction) {
        const user = getUserData(interaction.user.id);
        if (!user) {
            return interaction.reply(info.no_character);
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
        .setDescription(`📌 Localização: (${newX}, ${newX})\n Tipo: ${tile.tipo}\n Rank: ${tile.rank}\n Ocupação: ${tile.ocup}\n Contaminação: ${tile.cont}`)
        .setImage('attachment://mapa.png');

        await interaction.reply({ embeds: [embed], files: [file] });
    }
};
