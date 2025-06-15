const { DEBUG } = require('../../config.js');
const { SlashCommandBuilder } = require('discord.js');
const { getUserData, getUserMoves, getCombatState, updateCombat, updateCombatUserData } = require('../../utils/db');
const { processCombatAction } = require('../../functions/CombatEvent');
const { processNarrativeAction } = require('../../functions/NarrativeEvent');
const stats = require('../../functions/stats');
const { info, act } = require('../../data/locale.js');
const lastCombatMessages = new Map();

module.exports = {
    //cooldown: 5,
    data: new SlashCommandBuilder()
    .setName('act')
    .setDescription('Choose a combat/event action')
    .setNameLocalizations({ "pt-BR": "ação", })
    .setDescriptionLocalizations({ "pt-BR": "Escolha sua ação para um evento ou combate", })
    .addStringOption(option =>
    option.setName('action')
    .setDescription('Action')
    .setDescriptionLocalizations({ "pt-BR": "Ação", })
    .setRequired(true)
    .setAutocomplete(true)
     )
    .addBooleanOption(option =>
    option.setName('rp')
    .setDescription('Pay a Rythm Point to add an extra d10 to your next roll?')
    .setNameLocalizations({ "pt-BR": "pr", })
    .setDescriptionLocalizations({ "pt-BR": "Consumir Ponto de Ritmo pra somar 1d10 no teste dessa ação?", })
     )
    .addStringOption(option =>
    option.setName('foco')
    .setDescription('Focus')
    .setDescriptionLocalizations({ "pt-BR": "Foco", })
    .setAutocomplete(true)
    ),

    async autocomplete(interaction) {

        const user = getUserData(interaction.user.id);
        if (DEBUG) console.log("running autocomplete for", interaction.user.id);
        function blockAutocomplete(message) {
            return [{ name: `🚫 ${message}`, value:'__BLOCK__'}];
        }
        if (!user) return interaction.respond(blockAutocomplete(act.no_char));
        if (user.EVENT === 'none') return interaction.respond(blockAutocomplete(act.on_event));

        const focused = interaction.options.getFocused();
        const userId = interaction.user.id;
        if (DEBUG) console.log(focused);

        if (user.EVENT?.startsWith('combate:')) {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'action') {
                const moves = getUserMoves(userId);
                const choices = moves
                .filter(m => m.nome.toLowerCase().includes(focused.toLowerCase()))
                .sort((ma, mb) => ma.move_id - mb.move_id)
                .map(m => ({ name: m.nome, value: `move:${m.move_id}` }));
                await interaction.respond([...choices].slice(0, 25));
            }
            if (focusedOption.name === 'foco') {

                const combat = getCombatState(user.id);
                const npc = JSON.parse(combat.npc_data);
                const parts = [
                    ["cb",act.cb,2],
                    ["tr",act.tr,1],
                    ["bd",act.bd,1],
                    ["be",act.be,1],
                    ["pd",act.pd,1],
                    ["pe",act.pe,1]
                ].filter(Boolean);

                if (npc.exBdpart1 !== "none") parts.push(["e1",npc.exBdpart1,1]);
                if (npc.exBdpart2 !== "none") parts.push(["e2",npc.exBdpart2,1]);

                //if (u.exBdpart3 !== "none") options.push("e3");
                //if (u.exBdpart4 !== "none") options.push("e4");//just in case....
                const choices = parts
                .filter(p => npc["RD" + p] !== null)
                .map(p => ({ name: `${p[1]} (cost: ${p[2]}RP)`, value: p[0] }));
                await interaction.respond([...choices].slice(0, 25));
            }
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

        if (DEBUG) console.time('action setup');
        const startMem3 = process.memoryUsage().heapUsed;

        const user = getUserData(interaction.user.id);
        const id = interaction.options.getString('action');
        if (!id || id.startsWith('__BLOCK')) {
            return interaction.reply({ content: act.inv_opt, ephemeral: true });
        }
        const evento = user.EVENT;
        const pr = interaction.options.getBoolean('rp');
        const fc = interaction.options.getString('foco');

        if (evento.startsWith('combate:')) {

            const combateId = parseInt(evento.split(':')[1]);
            const combat = getCombatState(user.id);

            // Pegar ação do jogador
            const moveId = parseInt(interaction.options.getString('action').split(':')[1]);
            const userMoves = getUserMoves(user.id);
            const selected = userMoves.find(m => m.move_id === moveId);
            const player = JSON.parse(combat.user_data); //Tentar recarregar os dados do user pra atualizar esse troço...

            const can_use = stats.handleSkillCost(player, selected, pr, fc);
            if (DEBUG) console.log("PM/PR antes>",player.PM, player.PR, can_use);
            if (!can_use){
                return interaction.reply(act.cant_pay);
            }

            if (DEBUG) console.log(fc);
            if (fc || pr){
                const status = typeof player.STATUS === 'string' ? JSON.parse(player.STATUS) : player.STATUS || [];
                if (DEBUG) console.log(status);
                if (fc)status.push(["FOCUS"+fc, 1]);
                if (pr)status.push(["PR_BOOST", 1]);
                player.STATUS = JSON.stringify(status);
            }

            await interaction.deferReply();

            updateCombatUserData(combat.id, player);
            if (DEBUG) console.log(JSON.parse(getCombatState(user.id).user_data).STATUS);
            if (DEBUG) console.log("PM/PRdepois>",player.PM, player.PR);
            if (DEBUG) console.log("pr usado?",pr);

            if (DEBUG) console.timeEnd('action setup'),console.log(`Memória usada: ${((process.memoryUsage().heapUsed - startMem3) / 1024 / 1024).toFixed(2)}MB`);


            const result = await processCombatAction(player, selected, combateId);

            //////Solução temporaria pra evitar o spam.
            const lastMsgId = lastCombatMessages.get(player.id);
            let updated = false;
            if (lastMsgId) {
                try {
                    const msg = await interaction.channel.messages.fetch(lastMsgId);
                    if (msg) {
                        await msg.edit(result); // result = { embeds, files }
                        updated = true;
                    }
                } catch (err) {
                    console.warn(`Falha ao editar mensagem antiga: ${err.message}`);
                }
            }
            if (!updated) {
                const sent = await interaction.editReply(result);
                lastCombatMessages.set(player.id, sent.id);
            } else {
                // Finaliza a interação de forma silenciosa
                await interaction.deleteReply();
            }

            ///////////////////////////////////////

            //return interaction.editReply(result);
            //return interaction.editReply(result);
            //await interaction.editReply(result);
            //return result;
        }

        if (evento.startsWith('evento:')) {
            // Evento narrativo
            if (pr) {
                return interaction.reply(act.no_combat_pr);
            }
            const result = await processNarrativeAction(user, selected);
            return interaction.reply(result);

        }
    }
}
