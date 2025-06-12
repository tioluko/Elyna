const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { getUserData, updateUserData } = require('../../utils/db.js');
const { isValidURL, checkImage } = require('../../functions/urlcheck.js');
const { info, ava } = require('../../data/locale.js');

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Change your character image')
    .setDescriptionLocalizations({
        "pt-BR": "Muda a imagem do seu personagem",
    })
    .addStringOption(option =>
    option.setName('url')
    .setDescription('Image url')
    .setDescriptionLocalizations({
        "pt-BR": "Url da imagem",
    })
    .setRequired(true)
    ),

    async execute(interaction){
        const user = getUserData(interaction.user.id);
        let url = interaction.options.getString('url');

        if (!user) {
            return interaction.reply(info.no_character);
        }
        if (!isValidURL(url)) {  //Checa se é um url valido
            interaction.reply(ava.invalid_url);
        } else {
            checkImage(url).then(isValidImage => {
                if (!isValidImage) {  //Checa se é uma imagem
                    interaction.reply(ava.no_img);
                } else {
                    updateUserData(user.id, { image: url });
                    //interaction.reply(`:star: Esse é o seu personagem: ${url} :star:`);
                    const embed = new EmbedBuilder()
                    .setDescription(`:star: ${ava.this_is} ${user.nome}: :star:`)
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
