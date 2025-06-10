const { SlashCommandBuilder } = require('discord.js');
const oi = ['Oi', 'Olá', 'Alô', 'Fala ai!', 'E ai?', 'Coé', 'Opa!', 'Oe', 'Hi~', 'Hello~', 'Hey~', 'העלא' ];


module.exports = {
  data: new SlashCommandBuilder()
  .setName('oi')
  .setDescription('Fala oi com o robô'),

  async execute(interaction){

    let i = Math.floor(Math.random() * oi.length);
    let r = oi[i];
    interaction.reply(`:star: **Alegre-se** ${interaction.user} :star: \n  Responderei o seu oi \n \n:star: **${r}** :star:`);
  }
}
