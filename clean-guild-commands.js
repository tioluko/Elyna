const { REST, Routes } = require('discord.js');
const { clientId, guildId, guildId1, guildId2, guildId3, token } = require('./config.json');

const rest = new REST().setToken(token);

// ...

// for guild-based commands
rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
    .then(() => console.log('Successfully deleted all guild commands.'))
    .catch(console.error);
/*
rest.put(Routes.applicationGuildCommands(clientId, guildId1), { body: [] })
    .then(() => console.log('Successfully deleted all guild commands.'))
    .catch(console.error);

rest.put(Routes.applicationGuildCommands(clientId, guildId2), { body: [] })
    .then(() => console.log('Successfully deleted all guild commands.'))
    .catch(console.error);

rest.put(Routes.applicationGuildCommands(clientId, guildId3), { body: [] })
    .then(() => console.log('Successfully deleted all guild commands.'))
    .catch(console.error);*/
