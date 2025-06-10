const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with "pong!"'),

  async execute(interaction){
    var n = Math.floor(Math.random() * 5);
    if(n > 0){
      interaction.reply(":star: pong :star:");
    } else {
      interaction.reply("**PONG CARAI!**");
    }
  }
}
