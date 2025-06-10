const { SlashCommandBuilder } = require('discord.js');
const stats = require('../../functions/stats.js');
const { getUserData, updateUserData } = require('../../utils/db.js');

const perkChoices = [
    { name: 'Armas de fogo', value: 'Adf' },
    { name: 'Arquearia', value: 'Arq' },
    { name: 'Desarmado', value: 'Des' },
    { name: 'Armas Brancas', value: 'Arb' },
    { name: 'Atletismo', value: 'Atl' },
    { name: 'Artes Performáticas', value: 'Art' },
    { name: 'Biológicas', value: 'Bio' },
    { name: 'Exatas', value: 'Exa' },
    { name: 'Humanas', value: 'Hum' },
    { name: 'Ocultismo', value: 'Ocu' },
    { name: 'Engenharia', value: 'Eng' },
    { name: 'Infiltração', value: 'Inf' },
    { name: 'Informática', value: 'Ifm' },
    { name: 'Investigação', value: 'Inv' },
    { name: 'Magia', value: 'Mag' },
    { name: 'Medicina', value: 'Med' },
    { name: 'Politica', value: 'Pol' },
    { name: 'Subterfúgio', value: 'Sub' },
    { name: 'Veículos', value: 'Vei' },
];

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('pp')
    .setDescription('Investe seus PPs em perícias')
    .addStringOption(option =>
    option.setName('pericia')
    .setDescription('Cada ponto em Perícia custa **3 PP**s')
    .setRequired(true)
    .addChoices(...perkChoices)
    )
    .addIntegerOption(option =>
    option.setName('multi')
    .setDescription('Quantidade')
    ),

    async execute(interaction){
        const user = getUserData(interaction.user.id);
        let choice = interaction.options.getString('pericia');
        let choicename = perkChoices.find(attr => attr.value === choice)?.name; //I need that because Discord.js wont let me pick an option choice name directly u.u
        let multi = interaction.options.getInteger('multi') ?? 1;

        if (!user) {
            return interaction.reply(':star: Você ainda não tem um personagem, use **/criarficha** para criar um! :star:');
        }
        if (user.PP < (multi*3)) interaction.reply(`:star: Isso custa **${multi*3} PP**s, você só tem **${user.PP}** :star:`);
        else if (user[choice] >= (user.NV+3)||user[choice]+multi > (user.NV+3)) {
            interaction.reply(`:star: Sua perícia em ${choicename} vai passar do limite assim *(O valor máximo de uma perícia é equivalente ao seu Nivel+3)* :star:`);
        }
        else {
            user.PP -= (multi*3);
            user[choice] += multi;
            updateUserData(user.id, user);
            if (choice === 'Adf'||choice === 'Arq'||choice === 'Des'||choice === 'Arb'||choice === 'Atl') {
                user.PR = Math.max(user.Adf,user.Arq,user.Des,user.Arb,user.Atl,user.Mag) + user.modPR;
                updateUserData(user.id, { PR: user.PR });
            }
            stats.update(user);
            interaction.reply(`:star: ${user.nome} aumentou sua perícia em **${choicename}** para **${user[choice]}** pagando **${multi*3} PP**s (Restam ${user.PP}) :star:`);
        }
    }
}
