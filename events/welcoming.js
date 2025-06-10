//module.exports = {
//  name: 'welcoming',
//  async execute(member) {
//    const welcomeRole = await member.guild.roles.cache.find(r => r.name === 'human');
//    await member.roles.add(welcomeRole);
//
//    const welcomeChannel = await member.guild.channels.cache.find(c => c.name ==='geral');
//    await welcomeChannel.fetch();
//    welcomeChannel.send(`Ayo Humie ${member.user}:star:`)
//  }
//}