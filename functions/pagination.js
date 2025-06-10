const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = async (interaction, pages, time = 30 * 1000) => {
  
  try {
    if (!interaction | !pages | !pages > 0) throw new Error('[pagination.js] Invalid args');

    await interaction.deferReply();

    if (pages.length === 1) {
      return await interaction.editReply({ embeds: pages, components: [], fetchReply: true});
    }

    var index = 0;

    const first = new ButtonBuilder()
    .setCustomId('pagefirst')
    .setEmoji('⏪')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);

    const previous = new ButtonBuilder()
    .setCustomId('pageprev')
    .setEmoji('⬅️')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);

    const pageCount = new ButtonBuilder()
    .setCustomId('pagecount')
    .setLabel(`${index + 1}/${pages.length}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

    const next = new ButtonBuilder()
    .setCustomId('pagenext')
    .setEmoji('➡️')
    .setStyle(ButtonStyle.Primary)

    const last = new ButtonBuilder()
    .setCustomId('pagelast')
    .setEmoji('⏩')
    .setStyle(ButtonStyle.Primary)

    const buttons = new ActionRowBuilder().addComponents([first, previous, pageCount, next, last]);

    const msg = await interaction.editReply({ embeds: [pages[index]], components: [buttons], fetchReply: true });

    const collector = await msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time
    });

    collector.on('collect', async i =>{
      if (i.user.id !== interaction.user.id) return await i.reply({ content: `Only ${interaction.user.username} can interact with these buttons`, ephemeral: true});

      await i.deferUpdate();

      if (i.customId === 'pagefirst') index = 0;

      if (i.customId === 'pageprev') {
        if (index > 0) index--;

      } else if (i.customId === 'pagenext') {
        if (index < pages.length - 1) index++;
      
      } else if (i.customId === 'pagelast') {
        index = pages.length -1;
      }
      first.setDisabled(index === 0);
      previous.setDisabled(index === 0);
      next.setDisabled(index === pages.length - 1);
      last.setDisabled(index === pages.length - 1);

      pageCount.setLabel(`${index + 1}/${pages.length}`);

      await msg.edit({ embeds: [pages[index]], components: [buttons] }).catch(err => {});
      collector.resetTimer();
    });

    collector.on("end", async () => {
      //await msg.edit({ embeds: [pages[index]], components: [] }).catch(err => {});
      await msg.delete();
    });

    return msg;
  } catch (error) {
    console.error(`[ERROR] ${error}`);
  }
}
