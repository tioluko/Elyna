const { SlashCommandBuilder} = require('discord.js');
const { getUserData, updateUserData } = require('../../utils/db.js');
const { createPCbuttons } = require('../../functions/pointMenus');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('pc')
    .setDescription('Distribua seus Pontos de Crescimento (PCs) nos atributos'),

    async execute(interaction) {
        const user = getUserData(interaction.user.id);
        if (!user) {
            return interaction.reply(`:star: Voce ainda não tem um personagem, use o comando **/criarficha** para criar um! :star:`);
        }

        const components = createPCbuttons(user);

        await interaction.reply({
            content: `:star: ${user.nome}, Esse é o seu Menu de distribuição de PCs :star:`,
            components, ephemeral: false
        })
    }
};

/*const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder ,ButtonStyle} = require('discord.js');

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Investe seus PCs em atributos'),

    async execute(interaction){
        const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_attr')
        .setPlaceholder('Escolha um atributo para aumentar')
        .addOptions([
            { label: 'Força', value: 'FOR' },
            { label: 'Agilidade', value: 'AGI' },
            { label: 'Resistência', value: 'RES' },
            { label: 'Inteligência', value: 'INT' },
            { label: 'Carisma', value: 'CAR' },
            { label: 'Essência', value: 'ESS' },
            { label: 'Sintonia', value: 'SIN' },
        ]);

        const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_attr')
        .setLabel('Confirmar +1')
        .setStyle(ButtonStyle.Primary);

        await interaction.reply({
            content: 'Selecione o atributo que deseja aumentar:',
            components: [
                new ActionRowBuilder().addComponents(selectMenu),
                new ActionRowBuilder().addComponents(confirmButton)
            ]
        });
    }
}
*/
