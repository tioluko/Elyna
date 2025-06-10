const { DEBUG } = require('../../config.js');
const { SlashCommandBuilder } = require('discord.js');
const { getUserData, getUserMoves, getCombatState, updateCombat, updateCombatUserData } = require('../../utils/db');
const { processCombatAction } = require('../../functions/CombatEvent');
const { processNarrativeAction } = require('../../functions/NarrativeEvent');
const stats = require('../../functions/stats');

module.exports = {
    //cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('ação')
    .setDescription('Escolha sua ação para um evento ou combate')
    .addStringOption(option =>
    option.setName('action')
    .setDescription('Ação')
    .setRequired(true)
    .setAutocomplete(true)
     )
    .addBooleanOption(option =>
    option.setName('pr')
    .setDescription('Consumir Ponto de Ritmo pra somar 1d10 no teste dessa ação?')
     ),

    async autocomplete(interaction) {
        const user = getUserData(interaction.user.id);
        function blockAutocomplete(message) {
            return [{ name: `🚫 ${message}`, value:'__BLOCK__'}];
        }
        if (!user) return interaction.respond(blockAutocomplete('Você ainda não tem um personagem, use /criarficha para criar um!'));
        if (user.EVENT === 'none') return interaction.respond(blockAutocomplete('Você não está em nenhum evento que requer ação'));

        const focused = interaction.options.getFocused();
        const userId = interaction.user.id;

        if (user.EVENT?.startsWith('combate:')) {
            const moves = getUserMoves(userId);
            const results = moves
            .filter(m => m.nome.toLowerCase().includes(focused.toLowerCase()))
            .sort((ma, mb) => ma.move_id - mb.move_id)
            .map(m => ({ name: m.nome, value: `move:${m.move_id}` }));

            await interaction.respond([...results].slice(0, 25));
        }
        if (user.EVENT?.startsWith('event:')){
            const event = getEventDefinition(user.EVENT); // sua função de eventos
            const results = event.actions
            .filter(a => a.name.toLowerCase().includes(focused.toLowerCase()))
            .map(a => ({ name: a.name, value: `event:${a.value}` }));

            await interaction.respond(results.slice(0, 25));
        }else return;
    },

    async execute(interaction) {

        const user = getUserData(interaction.user.id);
        const id = interaction.options.getString('action');
        if (!id || id.startsWith('__BLOCK')) {
            return interaction.reply({ content: 'Opção inválida.', ephemeral: true });
        }
        const evento = user.EVENT;
        const pr = interaction.options.getBoolean('pr');
        //const selected = interaction.options.getString('action');

        if (evento.startsWith('combate:')) {

            const combateId = parseInt(evento.split(':')[1]);
            const combat = getCombatState(user.id);
;
            // Pegar ação do jogador
            const moveId = parseInt(interaction.options.getString('action').split(':')[1]);
            const userMoves = getUserMoves(user.id);
            const selected = userMoves.find(m => m.move_id === moveId);
            const player = JSON.parse(combat.user_data); //Tentar recarregar os dados do user pra atualizar esse troço...

            const can_use = stats.handleSkillCost(player, selected, pr);
            if (DEBUG) console.log("PM/PR antes>",player.PM, player.PR, can_use);
            if (!can_use){
                return interaction.reply(`:star: Aw, parece que você não pode pagar o custo dessa ação... :star:`);
            }

            updateCombatUserData(combat.id, player);
            if (DEBUG) console.log("PM/PRdepois>",player.PM, player.PR);
            if (DEBUG) console.log("pr usado?",pr);

            await interaction.deferReply();
            //await interaction.editReply('⌛ Processando ação...');
            const result = await processCombatAction(player, selected, pr, combateId);
            //return interaction.editReply(result);
            //return interaction.editReply(result);
            return result;
        }

        if (evento.startsWith('evento:')) {
            // Evento narrativo
            if (pr) {
                return interaction.reply(`:star: Você não pode usar Ponto de Ritmo fora de combate. :star:`);
            }
            const result = await processNarrativeAction(user, selected);
            return interaction.reply(result);

        }
    }
}
