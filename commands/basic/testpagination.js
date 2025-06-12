const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const pagination = require("../../functions/pagination.js");

module.exports = {
  data: new SlashCommandBuilder().setName("tpag").setDescription("test"),

  async execute(interaction) {
    const embeds = [];
    for (var i = 0; i < 4; i++) {
      embeds.push(new EmbedBuilder().setDescription(`Page ${i + 1}`));
    }

    await pagination(interaction, embeds);
  },
};
