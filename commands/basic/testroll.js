const { SlashCommandBuilder } = require('discord.js');
const roll = require('../../functions/stat_checks.js');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('rola 2d20 com bonus contra um DT')
    .addIntegerOption(option =>
    option.setName('bonus')
    .setDescription('Bonus')
    )
    .addIntegerOption(option =>
    option.setName('dt')
    .setDescription('Dificuldade')
    ),

    async execute(interaction){
        let bonus = interaction.options.getInteger('bonus') ?? 0;
        let DT = interaction.options.getInteger('dt') ?? 1;
        let result = roll.r2d10(bonus);
        let resp = (result >= DT) ? ':white_check_mark: SUCESSO' :':x: FALHA';

        interaction.reply(`Rolou *2d10+${bonus}* e deu **${result}** \n **${resp}** *(DT:${DT})*`);
    }
}
