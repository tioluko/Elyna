const { SlashCommandBuilder } = require('discord.js');
const { getUserData, updateUserData } = require('../../utils/db.js');
const { info } = require('../../data/locale.js');
const block = require('../../utils/block.js');

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('name')
    .setDescription('Change the name of your character')
    .setNameLocalizations({"pt-BR": "nome",})
    .setDescriptionLocalizations({"pt-BR": "Muda o nome do seu personagem",})
    .addStringOption(option =>
    option.setName('nome')
    .setDescription('new name')
    .setDescriptionLocalizations({"pt-BR": "novo nome",})
    .setRequired(true)
    ),

    async execute(interaction){
        const user = getUserData(interaction.user.id);

        const blocks = block.noChar(user) || block.onEvent(user);
        if (blocks) return interaction.reply({ content: blocks , ephemeral: true });

        let nome = interaction.options.getString('nome');

        if (!user) {
            return interaction.reply(':star: Você ainda não tem um personagem, use **/criarficha** para criar um! :star:');
        }
        updateUserData(user.id, { nome: nome });

        console.log(`${user.nome}->${nome}`); // log
        interaction.reply(`:star: O nome do seu personagem é **${nome}** :star:`);
    }
}
