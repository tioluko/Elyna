const { SlashCommandBuilder } = require('discord.js');
const { getUserData, getUserInventory } = require('../../utils/db.js');
const { equip } = require('../../functions/EquipEvent.js'); // <- função separada

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('equipar')
    .setDescription('Equipa um item do inventário')
    .addIntegerOption(option =>
    option.setName('item')
    .setDescription('Escolha um item para equipar')
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
            return interaction.reply({ content: 'Opção inválida.', ephemeral: true });
        }
        const invId = interaction.options.getInteger('item');
        const inv = getUserInventory(user.id);
        const item = inv.find(i => i.id === invId);

        if (!item) {
            return interaction.reply('❌ Item não encontrado.');
        }

        try {
            equip(user.id, invId);
            return interaction.reply(`Você se equipou com **${item.nome}**`);
        } catch (err) {
            console.error(err);
            return interaction.reply(`❌ Erro ao equipar: ${err.message}`);
        }
    }
};

/*
const { SlashCommandBuilder } = require('discord.js');
const stats = require('../../functions/stats.js');
const { getUserData, getUserInventory, updateUserData } = require('../../utils/db.js');

const equipChoices = [];

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('equipar')
    .setDescription('Se veste com um item equipavel')
    .addIntegerOption(option =>
    option.setName('item')
    .setDescription('Escolha um item para equipar')
    .setRequired(true)
    .setAutocomplete(true)
    ),
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const userId = interaction.user.id;
        const inv = getUserInventory(userId);

        const filtered = inv
        .filter(i => i.tipo === 'equip' && Number(i.equipado) !== 1)
        .filter(i => i.nome.toLowerCase().includes(focused.toLowerCase()))
        .map(i => ({
            name: i.nome,
            value: i.item_id
        }));
        console.log("Filtered:", filtered);
        console.log("Itens no inventário:", inv.map(i => ({ nome: i.nome, equipado: i.equipado, tipo: i.tipo })));

        await interaction.respond(filtered.slice(0, 25));
    },

    async execute(interaction){
        const user = getUserData(interaction.user.id);
        if (!user) {
            return interaction.reply(':star: Você ainda não tem um personagem, use /criarficha para criar um! :star:');
        }

        const itemId = interaction.options.getInteger('item');
        const inv = getUserInventory(user.id);
        const item = inv.find(i => i.item_id === itemId);
        console.log("Recebido:", interaction.options.get('item'));
        try {
            stats.equip(user.id, itemId);
            return interaction.reply(`Você se equipou com ${item.nome}`);
        } catch (err) {
            console.error(err);
            return interaction.reply(`❌ Erro ao equipar: ${err.message}`);
        }
    }
};
*/
