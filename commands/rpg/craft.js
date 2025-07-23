const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db, updateUserData, getUserData, getUserInventory } = require('../../utils/db.js');
const { recipes } = require('../../data/recipes.js');
const { barCreate, addxp } = require('../../functions/stats.js');
const { info, eq, st, cft } = require('../../data/locale.js');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Create a item')
    .setNameLocalizations({ "pt-BR": "criar", })
    .setDescriptionLocalizations({ "pt-BR": "Cria um item", })
    .addIntegerOption(option =>
    option.setName('item')
    .setDescription('Choose the item you want to craft')
    .setDescriptionLocalizations({ "pt-BR": "Escolha o item a ser criado", })
    .setAutocomplete(true)
    .setRequired(true)
    )
    .addBooleanOption(option =>
    option.setName('recipe')
    .setDescription('Only show the item recipe')
    .setNameLocalizations({ "pt-BR": "receita", })
    .setDescriptionLocalizations({ "pt-BR": "Apenas mostra a receita do item", })
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

        const options = recipes
        .filter(recipe => {
            const [skillName, requiredLevel] = recipe.req_skills;
            const userSkillLevel = user[`${skillName}`];

            // Garante que o usuário tenha o nível necessário
            return typeof userSkillLevel === 'number' && userSkillLevel >= requiredLevel;
        })
        .filter(recipe => recipe.name.toLowerCase().includes(focused)) // busca textual
        .map(recipe => ({
            name: recipe.name,
            value: recipe.result // ou outro identificador, dependendo do uso
        }));

        await interaction.respond(options.slice(0, 25));
    },

    async execute(interaction) {
        let user = getUserData(interaction.user.id);
        const id = interaction.options.getInteger('item');
        if (typeof id !== 'number' || id <= 0) {
            return interaction.reply({ content: eq.inv_opt , ephemeral: true });
        }

        const inv = getUserInventory(user.id);
        const itemId = interaction.options.getInteger('item');
        const showOnlyRecipe = interaction.options.getBoolean('recipe');

        // Localiza a receita com base no resultado
        const recipe = recipes.find(r => r.result === itemId);


        if (!recipe) {
            return interaction.reply({ content: '❌ Item not found.', ephemeral: true });
        }
        // Descrição da receita
        if (showOnlyRecipe) {
            const items = recipe.req_items.map(([id, qty]) => {
                const item = db.prepare('SELECT nome FROM items WHERE id = ?').get(id);
                return `• ${item?.nome || 'Desconhecido'} x${qty}`;
            }).join('\n');

            const [skill, lvl] = recipe.req_skills;
            console.log(`consulta receita: ${recipe.name}`);
            return interaction.reply({
                content: `⭐ **Recipe for ${recipe.name}** ⭐\nDifficulty: **${recipe.dt}**`+
                `\nRequired Skills: **${st[skill.toLowerCase()]} ${lvl}**\nItens:\n${items}`
            });
        }

        //checa PE
        if (user.PE < 2) {
            console.log(`Faltou PE`)
            return interaction.reply(`:star: ${cft.youneed} 2 ${st.sp} ${cft.onlyhave} ${user.PE} :star:`);
        }

        // Pagar o custo e mover
        updateUserData(user.id, {PE: user.PE - 2});
        user = getUserData(interaction.user.id);

        // Verifica se o usuário tem os itens necessários
        const missingItems = [];
        for (const [itemId, qty] of recipe.req_items) {
            const owned = inv.find(i => i.item_id === itemId && i.quantidade >= qty);
            if (!owned) {
                missingItems.push({ itemId, qty });
            }
        }

        if (missingItems.length > 0) {
            const msg = missingItems.map(({ itemId, qty }) => {
                const item = db.prepare('SELECT nome FROM items WHERE id = ?').get(itemId);
                return `❌ ${item?.nome || 'Item desconhecido'} x${qty}`;
            }).join('\n');
            console.log(`Faltou items`)
            return interaction.reply({ content: `You do not have the required items:\n${msg}` });
        }

        // Deduz itens do inventário
        for (const [itemId, qty] of recipe.req_items) {
            db.prepare(`
            UPDATE user_inventory
            SET quantidade = quantidade - ?
            WHERE user_id = ? AND item_id = ? AND equipado = 0
            `).run(qty, user.id, itemId);

            // Remove linha se a quantidade chegou a 0
            db.prepare(`
            DELETE FROM user_inventory
            WHERE user_id = ? AND item_id = ? AND quantidade <= 0
            `).run(user.id, itemId);
        }

        const [skill, _] = recipe.req_skills;
        const userSkill = user[skill] || 0;
        const roll = roll2d10();
        const totalCheck = roll.total + userSkill + user.INT;
        const passed = totalCheck >= recipe.dt;

        let resultMsg = `🎲 Craft Roll: ** ${totalCheck} ** \u2003 *2d10* {[${roll.d1}, ${roll.d2}] + ${userSkill+user.INT}} \u2003 DT:**${recipe.dt}**\n\n`;
        resultMsg += passed ? `:star: ${cft.success} **x1 ${recipe.name}** :star:` : `❌ ${cft.fail}`;

        if (passed) {
            addxp(user, Math.ceil(recipe.dt/10));
            const existing = db.prepare(`
            SELECT id, quantidade FROM user_inventory
            WHERE user_id = ? AND item_id = ? AND equipado = 0
            `).get(user.id, recipe.result);

            if (existing) {
                db.prepare(`
                UPDATE user_inventory SET quantidade = quantidade + 1
                WHERE id = ?
                `).run(existing.id);
            } else {
                db.prepare(`
                INSERT INTO user_inventory (user_id, item_id, quantidade, equipado)
                VALUES (?, ?, 1, 0)
                `).run(user.id, recipe.result);
            }
        }

        user = getUserData(interaction.user.id);
        console.log(`Receita: ${recipe.req_items} Resultado: ${recipe.name}`, passed ? '(SUCESSO)' : '(FALHA)');

        //return interaction.reply(resultMsg);
        const embed = new EmbedBuilder()
        .setDescription(`**${user.nome}**`)
        .addFields(
            {name: "\u200B", value: resultMsg},
            {name: "\u200B", value: `${barCreate(user,"PE")} **${st.sp}: **${user.PE} / ${user.MPE}`}
        )
        .setFooter({text: interaction.user.username,iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`,});
        return interaction.reply({ embeds: [embed] })
    }
};

function roll2d10() {
    let d1 = Math.floor(Math.random() * 10) + 1;
    let d2 = Math.floor(Math.random() * 10) + 1;
    let total = d1 + d2;
    return { d1, d2, total };
}
