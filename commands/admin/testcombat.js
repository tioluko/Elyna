module.exports = {
    name: 'combate',
    description: 'Inicia um combate de teste com um NPC (admin)',
    adminOnly: true,
    execute(message, args) {
        const npcId = parseInt(args[0]);
        if (isNaN(npcId)) {
            return message.reply('Uso: `!combate <npcId>`');
        }

        const { createCombat } = require('../../functions/CombatEvent.js');
        try {
            const combateId = createCombat(message.author.id, npcId);
            return message.reply(`Combate iniciado contra NPC ${npcId}! Evento: \`combate:${combateId}\``);
        } catch (e) {
            console.error('Erro ao criar combate:', e);
            return message.reply('Erro ao iniciar combate.');
        }
    }
};
