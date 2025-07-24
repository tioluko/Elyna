const { SlashCommandBuilder } = require("discord.js");
const { getUserData, updateUserData } = require("../../utils/db.js");
const { createPCbuttons } = require("../../functions/pointMenus");
const { info, pc } = require("../../data/locale.js");
const block = require('../../utils/block.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bp")
    .setDescription("Distribute your Base Points (BPs) into base stats")
    .setNameLocalizations({
      "pt-BR": "pc",
    })
    .setDescriptionLocalizations({
      "pt-BR":
        "Distribua seus Pontos de Crescimento (PCs) nos atributos primários",
    }),

  async execute(interaction) {
    const user = getUserData(interaction.user.id);

    const blocks = block.noChar(user) || block.onEvent(user) || block.Resting(user);
    if (blocks) return interaction.reply({ content: blocks , ephemeral: true });

    const components = createPCbuttons(user);

    await interaction.reply({
      content: `:star: ${user.nome}, ${pc.pc_menu} :star:`,
      components,
      ephemeral: false,
    });
  },
};
