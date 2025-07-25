const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Command/Game guide')
    .setNameLocalizations({ "pt-BR": "ajuda", })
    .setDescriptionLocalizations({ "pt-BR": "Mini guia de Comandos/Jogo", }),

    async execute(interaction) {
        return interaction.reply({ content:
            `# Commands\n\n`+
            `*--Beginning--*\n`+
            `**/newcharacter**  Create and register your character. (It is tied to your Discord user ID)\n`+
            `**/profile**  Display your entire character sheet. (Base/Secondary stats, Skills, Perks, Equipment/Moves, Inventory )\n\n`+
            `*--Character Customization--*\n`+
            `**/name**  Change your character's name.\n`+
            `**/avatar**  Change your character's image. (You need a valid image url)\n`+
            `**/bp**  Invest your character's base points (BPs) into your base stats.\n`+
            `**/pp**  Invest your character's profession skill points (PPs) into your skills.\n`+
            `->use  the "multi" option to increase more than one at once)\n\n`+
            `*--Character Management--*\n`+
            `**/equip**  Put on an equipment from your inventory.\n`+
            `**/unequip**  Remove an equipped item and put it back into your inventory.\n`+
            `**/use**  Use a consumable item in your inventory.\n`+
            `~~**/drop**  Throw away an item from your inventory. (Irreversible)~~ <Disabled>\n`+
            `**/craft**  Attempt to create an item. It costs 2 SPs and you're awarded some XP if you're successful.\n`+
            `->use the "recipe" option to only show the required items to create it.\n`+
            `(The autocomplete will show only what you can do with your Skill, but you will still need the required items)\n\n`+
            `*--Actions--*\n`+
            `**/area**  Look at the area you are in, what you know about it, and the surrounding areas.\n`+
            `**/move**  Travel towards the chosen direction. Costs 1 or more SPs depending of the terrain type.\n`+
            `**/explore**  Explore the area you are currently in. You may find resources, information or even trouble.\n`+
            `**/rest**  Set up a camp so your character can recover passively. (Your base stats affect the recovery rates/minute)\n`+
            `**/act**  If you are in combat, that is how you will select your battle actions.\n`+
            `->use the "rp" option to spend 1 RP to add an extra d10 to your hit chance.\n`+
            `->use the "focus" option to aim your action at a specific enemy body part (if possible to do so).`
        , ephemeral: true });
    }
};
