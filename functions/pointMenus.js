const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserData, updateUserData } = require('../utils/db');
const stats = require('../functions/stats');

function createPCbuttons(user) {
    const noPC = user.PC < 3;

    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('FOR').setLabel(`Força: ${user.FOR}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_FOR').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC),
            new ButtonBuilder().setCustomId('CAR').setLabel(`Carisma: ${user.CAR}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_CAR').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('AGI').setLabel(`Agilidade: ${user.AGI}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_AGI').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC),
            new ButtonBuilder().setCustomId('ESS').setLabel(`Essência: ${user.ESS}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_ESS').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('RES').setLabel(`Resistência: ${user.RES}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_RES').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC),
            new ButtonBuilder().setCustomId('SIN').setLabel(`Sintonia: ${user.SIN}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_SIN').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('INT').setLabel(`Inteligência: ${user.INT}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_INT').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('PC').setLabel(`PCs disponíveis: ${user.PC}`).setStyle(ButtonStyle.Secondary).setDisabled(true)
        )
    ];
}

function handlePCinteraction(interaction, ogid) {
    const userId = interaction.user.id;
    const user = getUserData(userId);

    if (userId !== interaction.message.interaction.user.id) {
        return interaction.reply({
            content: `:star: Esse menu não é para o seu personagem :star:`, ephemeral: true
        });
    }

    if (!user || user.id <= 0) {
        return interaction.reply({ content: `:star: Isso custa **3 PC**s, você só tem **${user.PC}** :star:`, ephemeral: true });
    }

    const attribute = interaction.customId.replace('pc_', '');
    if (!['FOR', 'AGI', 'RES', 'INT', 'CAR', 'ESS', 'SIN'].includes(attribute)) {
        return interaction.reply({ content: 'Atributo inválido.', ephemeral: true });
    }

    user.PC -= 3;
    user[attribute] ++;
    updateUserData(user.id, user);
    /*updateUserData(user.id, {
        PC: user.PC,
        [attribute]: user[attribute]
    });*/
    if (attribute === 'RES') updateUserData(user.id, { PV: user.PV+(user.NV + 2) });//user.PV += (user.NV + 2);
    if (attribute === 'ESS') updateUserData(user.id, { PM: user.PM+(user.NV + 2) });//user.PM += (user.NV + 2);
    if (attribute === 'CAR') updateUserData(user.id, { PE: user.PE+(user.NV + 2) });//user.PE += (user.NV + 2);
    stats.update(user);

    const components = createPCbuttons(user);

    return interaction.update({
        components
    });
}

module.exports = {
    createPCbuttons,
    handlePCinteraction,
    // outros menus...
};
