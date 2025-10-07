const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, getUserInventory, getItemData } = require('../../utils/db.js');
const { equip } = require('../../functions/EquipEvent.js'); // <- função separada
const { info, eq } = require('../../data/locale.js');

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Get a detailed item description')
    .setDescriptionLocalizations({ "pt-BR": "Exibe a descrção detalhada se um item", })
    .addIntegerOption(option =>
    option.setName('item')
    .setDescription('Choose the item you want to check')
    .setDescriptionLocalizations({ "pt-BR": "Escolha um item para checar", })
    .setAutocomplete(true)
    .setRequired(true)
    ),

    async autocomplete(interaction) {
        const user = getUserData(interaction.user.id);

        if (!user) return interaction.respond([{ name: `🚫 ${eq.no_char}`, value: -1 }]);

        const inv = getUserInventory(user.id);
        const focused = interaction.options.getFocused().toLowerCase();

        const options = inv
        .filter(i => Number(i.equipado) === 0)
        .filter(i => i.nome.toLowerCase().includes(focused))
        .map(i => ({ name: `${i.nome}`,value: i.id}));

        await interaction.respond(options.slice(0, 25));
    },

    async execute(interaction){
        const user = getUserData(interaction.user.id);

        if (!user) return interaction.reply({ content: info.no_character , ephemeral: true });

        const id = interaction.options.getInteger('item');
        if (typeof id !== 'number' || id <= 0) {
            return interaction.reply({ content: eq.inv_opt , ephemeral: true });
        }

        const itemId = interaction.options.getInteger('item');
        const item = getItemData(user.id,itemId);

        console.log(item);
        /*await interaction.deferReply();


        const embed = new EmbedBuilder()
        .setTitle(`🧭 Current Area: ${tile.nome !== 'none' ? tile.nome : `${map[`tipo${tile.tipo}`]}`}`)
        .setDescription(
            `📌 **${x}, ${y}**\n` +
            `🌎 Type: **${map[`tipo${tile.tipo}`]}**\n` +
            `🧱 Rank: **${tile.rank}**\n` +
            `🏙️ Occupancy: **${tile.ocup}**\n` +
            `🌀 Contamination: **${tile.cont}**\n\n` +
            `${barCreate(user,"PE")} **${map.sp}: **${user.PE} / ${user.MPE}`
        )
        .setImage('attachment://mapa.png')
        .setFooter({text: interaction.user.username,iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,});

        console.log(`${x},${y}`); // log

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
        }, 10_000);*/
    }
}
