const { SlashCommandBuilder } = require('discord.js');
const { getUserData, getUserInventory } = require('../../utils/db.js');
const { unequip } = require('../../functions/EquipEvent.js');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('desequipar')
    .setDescription('Remove um item atualmente equipado')
    .addIntegerOption(option =>
    option.setName('item')
    .setDescription('Escolha um item equipado para remover')
    .setAutocomplete(true)
    .setRequired(true)
    ),

    async autocomplete(interaction) {
        const user = getUserData(interaction.user.id);
        function blockAutocomplete(message) {
            return [{ name: `🚫 ${message}`, value: -1 }];
        }
        if (!user) return interaction.respond(blockAutocomplete('Você ainda não tem um personagem, use /criarficha para criar um!'));
        if (user.EVENT !== 'none') return interaction.respond(blockAutocomplete('Impossível, resolva sua situação atual antes ( /ação )'));

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
        const id = interaction.options.getInteger('item');
        if (typeof id !== 'number' || id <= 0) {
            return interaction.reply({ content: 'Opção inválida.', ephemeral: true });
        }
        const itemId = interaction.options.getInteger('item');
        const inv = getUserInventory(user.id);
        const item = inv.find(i => i.id === itemId && i.equipado === 1);

        if (!item) {
            return interaction.reply('❌ Item não encontrado');
        }

        try {
            unequip(user.id, itemId);
            return interaction.reply(`Você removeu **${item.nome}**`);
        } catch (err) {
            console.error(err);
            return interaction.reply(`❌ Erro ao desequipar: ${err.message}`);
        }
    }
};
/*const { SlashCommandBuilder } = require('discord.js');
const { db, getUserData, getUserInventory, updateUserData  } = require('../../utils/db.js');
const stats = require('../../functions/stats.js');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('desequipar')
    .setDescription('Remove um item atualmente equipado')
    .addIntegerOption(option =>
    option.setName('item')
    .setDescription('Escolha um item equipado para remover')
    .setRequired(true)
    .setAutocomplete(true)
    ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const userId = interaction.user.id;
        const inv = getUserInventory(userId);

        const equippedItems = inv
        .filter(i => i.tipo === 'equip' && Number(i.equipado) === 1)
        .filter(i => i.nome.toLowerCase().includes(focused.toLowerCase()))
        .map(i => ({
            name: i.nome,
            value: i.item_id
        }));

        await interaction.respond(equippedItems.slice(0, 25));
    },

    async execute(interaction) {
        const user = getUserData(interaction.user.id);
        const itemId = interaction.options.getInteger('item');

        if (!user) {
            return interaction.reply(':star: Você ainda não tem um personagem, use /criarficha para criar um! :star:');
        }

        const inv = getUserInventory(user.id);
        const item = inv.find(i => i.item_id === itemId && Number(i.equipado) === 1);

        if (!item) {
            return interaction.reply('❌ Item não encontrado ou não está equipado.');
        }

        // Marca como desequipado
        db.prepare(`UPDATE user_inventory SET equipado = 0 WHERE user_id = ? AND item_id = ?`)
        .run(user.id, itemId);

        // Atualiza stats
        //const updated = stats.equip(user.id); // reusa o método existente
        const updated = stats.modApply(user);
        updateUserData(user.id, stats.calculateStats(updated));
        return interaction.reply(`Você removeu **${item.nome}**`);
    }
};*/
