const { Events, Collection, MessageFlags } = require('discord.js');
const { getUserData, updateUserData, getUserMoves } = require('../utils/db');
const pointMenus = require('../functions/pointMenus');
const { info } = require('../data/locale.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isAutocomplete() && !interaction.isButton()) console.log(`---${ interaction.commandName } (${interaction.user.id})`); // log

		//  Suporte ao autocomplete do comando /ação
		/*if (interaction.isAutocomplete()) {
			const focused = interaction.options.getFocused();
			const userId = interaction.user.id;
			const user = getUserData(userId);/*

			if (user.EVENT?.startsWith('combate:')) {
				const moves = getUserMoves(userId);
				const results = moves
				.filter(m => m.nome.toLowerCase().includes(focused.toLowerCase()))
				.map(m => ({ name: m.nome, value: `move:${m.move_id}` }));

				return interaction.respond([...results].slice(0, 25));
			} /*else {
				const event = getEventDefinition(user.EVENT); // sua função de eventos
				const results = event.actions
				.filter(a => a.name.toLowerCase().includes(focused.toLowerCase()))
				.map(a => ({ name: a.name, value: `event:${a.value}` }));

				return interaction.respond(results.slice(0, 25));
			}*/
		if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (command && typeof command.autocomplete === 'function') {
				return command.autocomplete(interaction);
			}
		}

		//  Interações de botões
		if (interaction.isButton()) {
			const customId = interaction.customId;

			if (customId.startsWith('pc_')) {
				return pointMenus.handlePCinteraction(interaction);
			}
			//if (customId.startsWith('pp_')) {
			//	return pointMenus.handlePPinteraction(interaction);
			//}
		}


		//  Lógica para comandos
		if (!interaction.isChatInputCommand()) return;

		// bloqueia comandos em DM
		if (!interaction.guild) {
			return interaction.reply({
				content: '⚠️ Commands are not usable in private.',
				ephemeral: true
			});
		}
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

    const { cooldowns } = interaction.client;

	  if (!cooldowns.has(command.data.name)) {
	  	cooldowns.set(command.data.name, new Collection());
	  }

	  const now = Date.now();
	  const timestamps = cooldowns.get(command.data.name);
	  const defaultCooldownDuration = 1;
	  const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

	  if (timestamps.has(interaction.user.id)) {
	  	const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

	  	if (now < expirationTime) {
		  	const expiredTimestamp = Math.round(expirationTime / 1000);
		  	return interaction.reply({ content: info.spam, flags: MessageFlags.Ephemeral });
	  	}
	  }

	  timestamps.set(interaction.user.id, now);
	  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

		try {
			const result = await command.execute(interaction);
			if (result && interaction.deferred && !interaction.replied) {
				await interaction.editReply(result);
			}

		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	},
};
