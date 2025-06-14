const { SlashCommandBuilder } = require("discord.js");
const { getUserData, updateUserData } = require("../../utils/db.js");
const { createPCbuttons } = require("../../functions/pointMenus");
const { info, pc } = require("../../data/locale.js");

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
    if (!user) {
      return interaction.reply(info.no_character);
    }

    const components = createPCbuttons(user);

    await interaction.reply({
      content: `:star: ${user.nome}, ${pc.pc_menu} :star:`,
      components,
      ephemeral: false,
    });
  },
};
