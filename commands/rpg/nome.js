const { SlashCommandBuilder } = require('discord.js');

const { getUserData, updateUserData } = require('../../utils/db.js');

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('nome')
    .setDescription('Muda o nome do seu personagem')
    .addStringOption(option =>
    option.setName('nome')
    .setDescription('novo nome')
    .setRequired(true)
    ),

    async execute(interaction){
        const user = getUserData(interaction.user.id);
        let nome = interaction.options.getString('nome');

        if (!user) {
            return interaction.reply(':star: Você ainda não tem um personagem, use **/criarficha** para criar um! :star:');
        }
        updateUserData(user.id, { nome: nome });

        //const update = {nome: nome};
        // Atualiza os valores derivados
        //updateUserData(user.id, update);
        interaction.reply(`:star: O nome do seu personagem é **${nome}** :star:`);
    }
}
