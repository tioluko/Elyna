module.exports = {
    name: 'additem',
    description: 'Adiciona/remover itens para um jogador (admin)',
    adminOnly: true,
    execute(message, args) {
        const db = require('../../utils/db.js');
        const { addItem } = require('../../functions/EquipEvent.js');

        const [userId, itemIdRaw, quantidadeRaw] = args;
        const itemId = parseInt(itemIdRaw);
        const quantidade = parseInt(quantidadeRaw);

        if (!userId || isNaN(itemId) || isNaN(quantidade)) {
            return message.reply('Uso correto: `!additem <userId> <itemId> <quantidade>`');
        }

        const exists = db.getUserInventory(userId).find(p => p.item_id === itemId);

        if (quantidade > 0) {
            if (exists) {
                addItem(userId, itemId, quantidade);
                /*db.db.prepare(`
                UPDATE user_inventory SET quantidade = quantidade + ?
                WHERE user_id = ? AND item_id = ?
                `).run(quantidade, userId, itemId);*/
            } else {
                db.db.prepare(`
                INSERT INTO user_inventory (user_id, item_id, quantidade)
                VALUES (?, ?, ?)
                `).run(userId, itemId, quantidade);
            }

            return message.reply(`Item **${itemId}** adicionado ao usuário ${userId} (+${quantidade})`);
        }

        if (quantidade < 0 && exists) {
            const novaQtd = exists.quantidade + quantidade;
            if (novaQtd <= 0) {
                db.db.prepare(`DELETE FROM user_inventory WHERE user_id = ? AND item_id = ?`)
                .run(userId, itemId);
                return message.reply(`Item **${itemId}** removido do usuário ${userId}`);
            } else {
                db.db.prepare(`
                UPDATE user_inventory SET quantidade = ?
                WHERE user_id = ? AND item_id = ?
                `).run(novaQtd, userId, itemId);
                return message.reply(`➖ Item **${itemId}** reduzido para ${novaQtd}`);
            }
        }

        return message.reply('Usuário não tem esse item para remover.');
    }
};
/*
const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/db.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Adiciona ou remove um item do jogador')
    .addUserOption(opt =>
    opt.setName('jogador').setDescription('Usuário alvo').setRequired(true))
    .addIntegerOption(opt =>
    opt.setName('item_id').setDescription('ID do item').setRequired(true))
    .addIntegerOption(opt =>
    opt.setName('quantidade').setDescription('Quantidade (+ = adiciona, - = remove)').setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Comando restrito', ephemeral: true });
        }
        const user = interaction.options.getUser('jogador');
        const itemId = interaction.options.getInteger('item_id');
        const quantidade = interaction.options.getInteger('quantidade');

        const exists = db.prepare(`
        SELECT * FROM user_inventory WHERE user_id = ? AND item_id = ?
        `).get(user.id, itemId);

        if (quantidade > 0) {
            if (exists) {
                db.prepare(`
                UPDATE user_inventory SET quantidade = quantidade + ?
                WHERE user_id = ? AND item_id = ?
                `).run(quantidade, user.id, itemId);
            } else {
                db.prepare(`
                INSERT INTO user_inventory (user_id, item_id, quantidade)
                VALUES (?, ?, ?)
                `).run(user.id, itemId, quantidade);
            }

            return interaction.reply(`Item **${itemId}** adicionado ao ${user.username} (+${quantidade})`);
        } else if (quantidade < 0 && exists) {
            const novaQtd = exists.quantidade + quantidade;
            if (novaQtd <= 0) {
                db.prepare(`DELETE FROM user_inventory WHERE user_id = ? AND item_id = ?`)
                .run(user.id, itemId);
                return interaction.reply(`Item **${itemId}** removido de ${user.username}`);
            } else {
                db.prepare(`UPDATE user_inventory SET quantidade = ? WHERE user_id = ? AND item_id = ?`)
                .run(novaQtd, user.id, itemId);
                return interaction.reply(`➖ Item **${itemId}** reduzido para ${novaQtd}`);
            }
        } else {
            return interaction.reply(`O usuário não tinha esse item.`);
        }
    }
};
*/
