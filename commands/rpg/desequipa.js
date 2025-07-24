const { SlashCommandBuilder } = require('discord.js');
const { getUserData, getUserInventory } = require('../../utils/db.js');
const { unequip } = require('../../functions/EquipEvent.js');
const { info, eq } = require('../../data/locale.js');
const block = require('../../utils/block.js');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('unequip')
    .setDescription('Unequip something you are wearing')
    .setNameLocalizations({ "pt-BR": "desequipar", })
    .setDescriptionLocalizations({ "pt-BR": "Remove um item atualmente equipado", })
    .addIntegerOption(option =>
    option.setName('item')
    .setDescription('Choose the item you want to remove')
    .setDescriptionLocalizations({ "pt-BR": "Escolha um item equipado para remover", })
    .setAutocomplete(true)
    .setRequired(true)
    ),

    async autocomplete(interaction) {
        const user = getUserData(interaction.user.id);
        //function blockAutocomplete(message) {
        //    return [{ name: `🚫 ${message}`, value: -1 }];
        //}
        //if (!user) return interaction.respond(blockAutocomplete(eq.no_char));
        //if (user.EVENT !== 'none') return interaction.respond(blockAutocomplete(eq.on_event));

        if (!user) return interaction.respond([{ name: `🚫 ${eq.no_char}`, value: -1 }]);

        const inv = getUserInventory(user.id);
        const focused = interaction.options.getFocused().toLowerCase();

        const options = inv
        .filter(i => i.tipo === 'equip' && Number(i.equipado) === 1)
        .filter(i => i.nome.toLowerCase().includes(focused))
        .map(i => ({ name: i.nome, value: i.id }));

        await interaction.respond(options.slice(0, 25));
    },

    async execute(interaction) {
        const user = getUserData(interaction.user.id);

        const blocks = block.noChar(user) || block.onEvent(user) || block.Resting(user);
        if (blocks) return interaction.reply({ content: blocks , ephemeral: true });

        const id = interaction.options.getInteger('item');
        if (typeof id !== 'number' || id <= 0) {
            return interaction.reply({ content: eq.inv_opt , ephemeral: true });
        }
        const itemId = interaction.options.getInteger('item');
        const inv = getUserInventory(user.id);
        const item = inv.find(i => i.id === itemId && i.equipado === 1);

        if (!item) {
            return interaction.reply('❌ Item not found.');
        }

        try {
            unequip(user.id, itemId);
            return interaction.reply(`${eq.off} **${item.nome}**`);
        } catch (err) {
            console.error(err);
            return interaction.reply(`❌ Equip error: ${err.message}`);
        }
    }
};
