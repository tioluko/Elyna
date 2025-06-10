const { SlashCommandBuilder } = require('discord.js');
const stats = require('../../functions/stats.js');
const { userExists, insertUser, initUserMoves, initUserPerks, initUserInventory, updateUserData, getUserData } = require('../../utils/db.js');
const { info } = require('../../data/locale.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('criarficha')
    .setDescription('cria um personagem'),

    async execute(interaction) {
        try {
            /*if (userExists(interaction.user.id)) {
                return interaction.reply(':star: Você já tem um personagem! :star:');
            }*/
            const userId = interaction.user.id;

            if (userExists(userId)) {
                return interaction.reply(info.has_character);//(':star: Você já tem um personagem! :star:');
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

            //(`:star: Seu personagem nasceu! :star: \n\n`+
            //`Agora você pode usar os seguintes comandos para customiza-lo: \n`+
            //`**/nome** Altera o seu nome. \n`+
            //`**/avatar** Altera a sua imagem. \n`+
            //`**/pc** Investe seus pontos de atributos (PCs) \n`+
            //`**/pp** Investe seus pontos de perícias (PPs) \n`+
            //`**/ficha** exibe sua ficha completa`);
        } catch (err) {
            console.error('Erro no comando /criarficha:', err);
            return interaction.reply(info._command_error_);
        }
    }
}
