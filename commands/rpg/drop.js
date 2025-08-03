const { SlashCommandBuilder } = require('discord.js');
const { getUserData, getUserInventory } = require('../../utils/db.js');
const { info, eq } = require('../../data/locale.js');
const { db } = require('../../utils/db.js');
const block = require('../../utils/block.js');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('drop')
    .setDescription('Throw away an item  (This is Irreversible)')
    .setNameLocalizations({ "pt-BR": "descartar", })
    .setDescriptionLocalizations({ "pt-BR": "Joga fora um item", })
    .addIntegerOption(option =>
    option.setName('item')
    .setDescription('Choose the item you want to discard')
    .setDescriptionLocalizations({ "pt-BR": "Escolha um item para descartar  (Isso é Irreversível)", })
    .setAutocomplete(true)
    .setRequired(true)
    )
    .addIntegerOption(option =>
    option.setName('multi')
    .setDescription('Ammount to discard')
    .setDescriptionLocalizations({ "pt-BR": "Quantidade a ser descartada", })
    ),

    async autocomplete(interaction) {
        const user = getUserData(interaction.user.id);

        if (!user) return interaction.respond([{ name: `🚫 ${eq.no_char}`, value: -1 }]);

        const inv = getUserInventory(user.id);
        const focused = interaction.options.getFocused().toLowerCase();

        const options = inv
        .filter(i => Number(i.equipado) === 0)
        .filter(i => i.nome.toLowerCase().includes(focused))
        .map(i => ({ name: `${i.nome} x${i.quantidade}`,value: i.id}));

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

        const amt = interaction.options.getInteger('multi') ?? 1;
        if (amt <= 0) {
            return interaction.reply({ content: `❌ Quantidade inválida.`, ephemeral: true });
        }

        const itemId = interaction.options.getInteger('item');
        const inv = getUserInventory(user.id);
        const item = inv.find(i => i.id === itemId && i.equipado === 0);

        if (!item) {
            return interaction.reply('❌ Item not found.');
        }

        try {
            drop(user.id, itemId, amt);
                console.log(` -${amt}x ${item.nome}`); // log
            return interaction.reply(`${eq.drop} **x${Math.min(amt,item.quantidade)} ${item.nome}**`);
        } catch (err) {
            console.error(err);
            return interaction.reply({ content:`❌ ${err.message}`, ephemeral: true });
        }
    }
};

function drop(userId, itemId, amount) {
    const item = db.prepare(`
    SELECT * FROM user_inventory
    WHERE user_id = ? AND id = ?
    `).get(userId, itemId);

    if (!item || item.equipado) throw new Error('❌ Item not found.');

    if (item.quantidade > amount) {
        db.prepare(`
        UPDATE user_inventory SET quantidade = quantidade - ?
        WHERE id = ?
        `).run(amount, itemId);
    } else {
        db.prepare(`DELETE FROM user_inventory WHERE id = ?`).run(itemId);
    }
}
