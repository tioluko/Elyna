const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, updateUserData } = require('../../utils/db.js');
const { generateMiniMapImage } = require('../../utils/ImageGen.js');
const { getTile } = require('../../functions/MapReader.js');
const { info, map } = require('../../data/locale.js');
const { barCreate } = require('../../functions/stats.js');
const mapa = require('../../data/map.json');

function getMovementCost(tipo) {
    if ([2, 3, 6].includes(tipo)) return 1;
    if ([4, 5].includes(tipo)) return 2;
    if ([7, 8, 9].includes(tipo)) return 3;
    return "---";
}

module.exports = {
    cooldown: 2,
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
        { name: `North`, value: 'norte' },
        { name: `South`, value: 'sul' },
        { name: `East`, value: 'leste' },
        { name: `West`, value: 'oeste' },
        { name: `North-east`, value: 'nordeste' },
        { name: `North-west`, value: 'noroeste' },
        { name: `South-east`, value: 'sudeste' },
        { name: `South-west`, value: 'sudoeste' },
    )
    ),

    async execute(interaction) {
        let user = getUserData(interaction.user.id);
        if (!user) {
            return interaction.reply(info.no_character);
        }
        if (user.EVENT !== 'none') return interaction.reply({ content: info.on_event, ephemeral: true });

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

        const moveCost = getMovementCost(tile.tipo);

        if (typeof moveCost !== 'number') {
            return interaction.reply(map.cant);
        }

        if (user.PE < moveCost) {
            return interaction.reply(`:star: ${map.youneed} ${moveCost} ${map.sp} ${map.onlyhave} ${user.PE} :star:`);
        }

        // Pagar o custo e mover
        updateUserData(user.id, {
            AREA: `${newX},${newY}`,
            PE: user.PE - moveCost
        });
        user = getUserData(interaction.user.id);

        await interaction.deferReply();

        // Gera imagem do novo local
        const miniMapBuffer = await generateMiniMapImage(newX, newY, mapa);
        const file = new AttachmentBuilder(miniMapBuffer, { name: 'mapa.png' });

        const embed = new EmbedBuilder()
        .setTitle(`🧭 Current Area: ${tile.nome !== 'none' ? tile.nome : `${map[`tipo${tile.tipo}`]}`}`)
        .setDescription(
            `📌 **${newX}, ${newY}**\n` +
            `🌎 Type: **${map[`tipo${tile.tipo}`]}**\n` +
            `🧱 Rank: **${tile.rank}**\n` +
            `🏙️ Occupancy: **${tile.ocup}**\n` +
            `🌀 Contamination: **${tile.cont}**\n\n` +
            `${barCreate(user,"PE")} **${map.sp}: **${user.PE} / ${user.MPE}`
        )
        .setImage('attachment://mapa.png');

        console.log(`${currX},${currY}-> ${newX},${newY}`); // log

        await interaction.editReply({ embeds: [embed], files: [file] });

        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (err) {
                if (err.code === 10008) {
                    console.warn('[deleteReply] Mensagem já não existe.');
                } else {
                    console.error('[deleteReply] Erro inesperado:', err);
                }
            }
        }, 10_000);
    }
};
