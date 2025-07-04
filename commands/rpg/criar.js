const { SlashCommandBuilder } = require("discord.js");
const stats = require("../../functions/stats.js");
const {
  userExists,
  insertUser,
  initUserMoves,
  initUserPerks,
  initUserInventory,
  updateUserData,
  getUserData,
} = require("../../utils/db.js");
const { info } = require("../../data/locale.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("newcharacter")
    .setDescription("Create your character")
    .setNameLocalizations({
      "pt-BR": "criarficha",
    })
    .setDescriptionLocalizations({
      "pt-BR": "Cria o seu personagem",
    }),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;

      if (userExists(userId)) {
        return interaction.reply(info.has_character); //(':star: Você já tem um personagem! :star:');
      }

      const userObject = stats.createNewUser(interaction.user);

      insertUser(userObject);
      initUserMoves(userId);
      initUserPerks(userId);
      initUserInventory(userId);
      const ficha = getUserData(userId);
      //stats.modApply(userObject);
      //stats.update(userObject);
      updateUserData(userId, stats.freshstats(ficha));

      return interaction.reply(info.character_created);
    } catch (err) {
      console.error("Erro no comando /criarficha:", err);
      return interaction.reply(info._command_error_);
    }
  },
};
