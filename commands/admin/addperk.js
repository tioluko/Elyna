module.exports = {
    name: 'addperk',
    description: 'Adiciona/remover perks para um jogador (admin)',
    adminOnly: true,
    execute(message, args) {
        const db = require('../../utils/db.js');

        const [userId, perkIdRaw, quantidadeRaw] = args;
        const perkId = parseInt(perkIdRaw);
        const quantidade = parseInt(quantidadeRaw);

        if (!userId || isNaN(perkId) || isNaN(quantidade)) {
            return message.reply('Uso correto: `!addperk <userId> <perkId> <quantidade>`');
        }

        const exists = db.getUserPerks(userId).find(p => p.perk_id === perkId);

        if (quantidade > 0) {
            if (exists) {
                db.db.prepare(`
                UPDATE user_perks SET quantidade = quantidade + ?
                WHERE user_id = ? AND perk_id = ?
                `).run(quantidade, userId, perkId);
            } else {
                db.db.prepare(`
                INSERT INTO user_perks (user_id, perk_id, quantidade)
                VALUES (?, ?, ?)
                `).run(userId, perkId, quantidade);
            }

            return message.reply(`Perk **${perkId}** adicionado ao usuário ${userId} (+${quantidade})`);
        }

        if (quantidade < 0 && exists) {
            const novaQtd = exists.quantidade + quantidade;
            if (novaQtd <= 0) {
                db.db.prepare(`DELETE FROM user_perks WHERE user_id = ? AND perk_id = ?`)
                .run(userId, perkId);
                return message.reply(`Perk **${perkId}** removido do usuário ${userId}`);
            } else {
                db.db.prepare(`
                UPDATE user_perks SET quantidade = ?
                WHERE user_id = ? AND perk_id = ?
                `).run(novaQtd, userId, perkId);
                return message.reply(`➖ Perk **${perkId}** reduzido para ${novaQtd}`);
            }
        }

        return message.reply('Usuário não tem esse perk para remover.');
    }
};
/*const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/db.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('addperk')
    .setDescription('Adiciona ou remove um perk do jogador')
    .addUserOption(opt =>
    opt.setName('jogador').setDescription('Usuário alvo').setRequired(true))
    .addIntegerOption(opt =>
    opt.setName('perk_id').setDescription('ID do perk').setRequired(true))
    .addIntegerOption(opt =>
    opt.setName('quantidade').setDescription('Quantidade (+ = adiciona, - = remove)').setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Comando restrito', ephemeral: true });
        }
        const user = interaction.options.getUser('jogador');
        const perkId = interaction.options.getInteger('perk_id');
        const quantidade = interaction.options.getInteger('quantidade');

        const exists = db.prepare(`
        SELECT * FROM user_perks WHERE user_id = ? AND perk_id = ?
        `).get(user.id, perkId);

        if (quantidade > 0) {
            if (exists) {
                db.prepare(`
                UPDATE user_perks SET quantidade = quantidade + ?
                WHERE user_id = ? AND perk_id = ?
                `).run(quantidade, user.id, perkId);
            } else {
                db.prepare(`
                INSERT INTO user_perks (user_id, perk_id, quantidade)
                VALUES (?, ?, ?)
                `).run(user.id, perkId, quantidade);
            }

            return interaction.reply(`Perk **${perkId}** adicionado ao ${user.username} (+${quantidade})`);
        } else if (quantidade < 0 && exists) {
            const novaQtd = exists.quantidade + quantidade;
            if (novaQtd <= 0) {
                db.prepare(`DELETE FROM user_perks WHERE user_id = ? AND perk_id = ?`)
                .run(user.id, perkId);
                return interaction.reply(`Perk **${perkId}** removido de ${user.username}`);
            } else {
                db.prepare(`UPDATE user_perks SET quantidade = ? WHERE user_id = ? AND perk_id = ?`)
                .run(novaQtd, user.id, perkId);
                return interaction.reply(`➖ Perk **${perkId}** reduzido para ${novaQtd}`);
            }
        } else {
            return interaction.reply(`O usuário não tinha esse perk.`);
        }
    }
};
*/
