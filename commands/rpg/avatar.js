const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { getUserData, updateUserData } = require('../../utils/db.js');
const { isValidURL, checkImage } = require('../../functions/urlcheck.js');

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Muda a imagem do seu personagem')
    .addStringOption(option =>
    option.setName('url')
    .setDescription('url da imagem')
    .setRequired(true)
    ),

    async execute(interaction){
        const user = getUserData(interaction.user.id);
        let url = interaction.options.getString('url');

        if (!user) {
            return interaction.reply(':star: Você ainda não tem um personagem, use **/criarficha** para criar um! :star:');
        }
        if (!isValidURL(url)) {
            interaction.reply(`:star: Isso nem é uma url... :star:`);
        } else {
            checkImage(url).then(isValidImage => {
                if (!isValidImage) {
                    interaction.reply(`:star: Não vejo imagem nessa url :star:`);
                } else {
                    updateUserData(user.id, { image: url });
                    //interaction.reply(`:star: Esse é o seu personagem: ${url} :star:`);
                    const embed = new EmbedBuilder()
                    .setDescription(`:star: Esse é o visual de ${user.nome}: :star:`)
                    .setImage(url);
                    interaction.reply({ embeds: [embed] }).then(() =>
                    setTimeout(
                        () => interaction.deleteReply(),
                               10_000 // not sure if you wanted 2000 (2s) or 20000 (20s)
                        )
                    )
                }
            });
        }
    }
}
