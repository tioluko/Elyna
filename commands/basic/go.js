const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
  .setName('go')
  .setDescription('Go to somewhere else')
  .addStringOption(option =>
        option.setName('direction')
            .setDescription('The move destination')
            .setRequired(true)
            .addChoices(
                { name: 'North', value: 'north' },
                { name: 'South', value: 'south' },
                { name: 'West', value: 'west' },
                { name: 'East', value: 'east' },
                { name: 'Center', value: 'center' },
    )
  ),

  async execute(interaction){/*
    
    const north = interaction.guild.roles.cache.find(r => r.name === "north");
    const south = interaction.guild.roles.cache.find(r => r.name === "south");
    const east = interaction.guild.roles.cache.find(r => r.name === "east");
    const west = interaction.guild.roles.cache.find(r => r.name === "west");
    const center = interaction.guild.roles.cache.find(r => r.name === "center");
    let member = interaction.member;
    let direction = interaction.options.getString('direction'); 
    let zone = interaction.guild.roles.cache.find(r => r.name === direction);

    if (member.roles.cache.has(zone.id)) {
      interaction.reply({ content: `You are already on ${direction} zone`, ephemeral: true });
    }
    else {
      if(direction!='north')member.roles.remove(north);
      if(direction!='south')member.roles.remove(south);
      if(direction!='west')member.roles.remove(west);
      if(direction!='east')member.roles.remove(east);
      if(direction!='center')member.roles.remove(center);  
      interaction.reply({ content: `You are moving into the ${direction} zone`, ephemeral: true });
      member.roles.add(zone); 
    }*/
    interaction.reply({ content: `:star: LALALA WIP :star:`, ephemeral: true });
  }
} 
