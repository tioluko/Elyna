const { SlashCommandBuilder } = require('discord.js');
const { db, updateUserData, getUserData, getUserInventory } = require('../../utils/db.js');
const { info, eq, st } = require('../../data/locale.js');
const block = require('../../utils/block.js');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use a consumable item')
    .setNameLocalizations({ "pt-BR": "usar", })
    .setDescriptionLocalizations({ "pt-BR": "Use um item consumível", })
    .addIntegerOption(option =>
    option.setName('item')
    .setDescription('Choose the item you want to use')
    .setDescriptionLocalizations({ "pt-BR": "Escolha um item para utilizar", })
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
        .filter(i => i.tipo === 'consumable')
        .filter(i => i.nome.toLowerCase().includes(focused))
        .map(i => ({ name: i.nome, value: i.id }));
        console.log(inv);

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
        const invId = interaction.options.getInteger('item');
        const inv = getUserInventory(user.id);
        const item = inv.find(i => i.id === invId && i.tipo === 'consumable');

        if (!item) {
            return interaction.reply('❌ Item not found.');
        }

        // Parse mods
        let mods;
        try {
            mods = JSON.parse(item.mods || '{}');
        } catch (err) {
            return interaction.reply('❌ Error reading item effects.');
        }

        const updatedUser = { ...user };
        const log = [];

        // Aplica modificadores com segurança
        for (const [key, value] of Object.entries(mods)) {
            if (typeof updatedUser[key] !== 'number') continue;

            const maxKey = 'M' + key; // MPV, MPM, MPE etc.
            const max = typeof updatedUser[maxKey] === 'number' ? updatedUser[maxKey] : Infinity;

            updatedUser[key] += value;

            if (updatedUser[key] < 0) updatedUser[key] = 0;
            if (updatedUser[key] > max) updatedUser[key] = max;

            const sinal = value >= 0 ? '+' : '';
            log.push(`${akey(key)}: ${sinal}${value}`);
        }

        // Atualiza a ficha
        const fieldsToUpdate = {};
        for (const [key, value] of Object.entries(mods)) {
            if (typeof updatedUser[key] !== 'number') continue;
            fieldsToUpdate[key] = updatedUser[key];
        }

        updateUserData(user.id, fieldsToUpdate);

        // Remove 1 unidade do item
        const row = db.prepare(`
        SELECT id, quantidade FROM user_inventory
        WHERE user_id = ? AND id = ? AND equipado = 0
        `).get(user.id, item.id);

        if (row && row.quantidade > 1) {
            db.prepare(`UPDATE user_inventory SET quantidade = quantidade - 1 WHERE id = ?`).run(row.id);
        } else {
            db.prepare(`DELETE FROM user_inventory WHERE id = ?`).run(row.id);
        }

        console.log(`${eq.use} **${item.nome}**\n${log.map(e => `• ${e}`).join('\n')}`); // log
        return interaction.reply(`${eq.use} **${item.nome}**\n${log.map(e => `• ${e}`).join('\n')}`).then(() =>
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
        }, 10_000));
    }
};

function akey(key){
    switch(key){
        case "PV": return(`❤️**${st.hp}**`);
        case "PM": return(`💧**${st.mp}**`);
        case "PE": return(`🧩**${st.sp}**`);
    }
}
