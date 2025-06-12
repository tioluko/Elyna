const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserData, updateUserData } = require('../utils/db');
const stats = require('../functions/stats');
const { info, st, pc } = require('../data/locale.js');

function createPCbuttons(user) {
    const noPC = user.PC < 3;

    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('FOR').setLabel(`${st.for}: ${user.FOR}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_FOR').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC),
            new ButtonBuilder().setCustomId('CAR').setLabel(`${st.car}: ${user.CAR}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_CAR').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('AGI').setLabel(`${st.agi}: ${user.AGI}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_AGI').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC),
            new ButtonBuilder().setCustomId('ESS').setLabel(`${st.ess}: ${user.ESS}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_ESS').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('RES').setLabel(`${st.res}: ${user.RES}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_RES').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC),
            new ButtonBuilder().setCustomId('SIN').setLabel(`${st.sin}: ${user.SIN}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_SIN').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('INT').setLabel(`${st.int}: ${user.INT}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('pc_INT').setLabel('+1').setStyle(ButtonStyle.Primary).setDisabled(noPC)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('PC').setLabel(`${pc.pcs}: ${user.PC}`).setStyle(ButtonStyle.Secondary).setDisabled(true)
        )
    ];
}

function handlePCinteraction(interaction, ogid) {
    const userId = interaction.user.id;
    const user = getUserData(userId);

    if (userId !== interaction.message.interaction.user.id) {
        return interaction.reply({ content: pc.wrong_menu , ephemeral: true });
    }

    if (!user || user.id <= 0) {
        return interaction.reply({ content: info.no_character , ephemeral: true });
    }

    const attribute = interaction.customId.replace('pc_', '');
    if (!['FOR', 'AGI', 'RES', 'INT', 'CAR', 'ESS', 'SIN'].includes(attribute)) {
        return interaction.reply({ content: 'Invalid Stat', ephemeral: true });
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
