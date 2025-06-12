const { SlashCommandBuilder } = require('discord.js');
const { getUserData, getUserInventory } = require('../../utils/db.js');
const { equip } = require('../../functions/EquipEvent.js'); // <- função separada
const { info, eq } = require('../../data/locale.js');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('equip')
    .setDescription('Put a gear from your inventory on')
    .setNameLocalizations({ "pt-BR": "equipar", })
    .setDescriptionLocalizations({ "pt-BR": "Equipa um item do inventório", })
    .addIntegerOption(option =>
    option.setName('item')
    .setDescription('Choose the item you want to wear')
    .setDescriptionLocalizations({ "pt-BR": "Escolha um item para se equipar", })
    .setAutocomplete(true)
    .setRequired(true)
    ),

    async autocomplete(interaction) {
        const user = getUserData(interaction.user.id);
        function blockAutocomplete(message) {
            return [{ name: `🚫 ${message}`, value: -1 }];
        }
        if (!user) return interaction.respond(blockAutocomplete(eq.no_char));
        if (user.EVENT !== 'none') return interaction.respond(blockAutocomplete(eq.on_event));

        const inv = getUserInventory(user.id);
        const focused = interaction.options.getFocused().toLowerCase();

        const options = inv
        .filter(i => i.tipo === 'equip' && Number(i.equipado) !== 1)
        .filter(i => i.nome.toLowerCase().includes(focused))
        .map(i => ({ name: i.nome, value: i.id }));
        console.log(inv);

        await interaction.respond(options.slice(0, 25));
    },

    async execute(interaction) {
        const user = getUserData(interaction.user.id);
        const id = interaction.options.getInteger('item');
        if (typeof id !== 'number' || id <= 0) {
            return interaction.reply({ content: eq.inv_opt , ephemeral: true });
        }
        const invId = interaction.options.getInteger('item');
        const inv = getUserInventory(user.id);
        const item = inv.find(i => i.id === invId);

        if (!item) {
            return interaction.reply('❌ Item not found.');
        }

        try {
            equip(user.id, invId);
            return interaction.reply(`${eq.put} **${item.nome}**`);
        } catch (err) {
            console.error(err);
            return interaction.reply(`❌ Equip error: ${err.message}`);
        }
    }
};
