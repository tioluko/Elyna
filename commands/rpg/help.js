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
            `**/newcharacter**  Create and register your character.(Tied to your Discord user ID)\n`+
            `**/profile**  Display your character sheet.(Base/Secondary stats, Skills, Perks, Equipment/Moves, Inventory)\n\n`+
            `*--Character Customization--*\n`+
            `**/name**  Change your character's name.\n`+
            `**/avatar**  Change your character's image.(Need a valid image url)\n`+
            `**/bp**  Invest your character's base points (BPs) into your base stats.\n`+
            `**/pp**  Invest your character's profession skill points (PPs) into your skills.\n`+
            `->use  the "multi" option to increase more than one at once)\n\n`+
            `*--Character Management--*\n`+
            `**/equip**  Put on an equipment from your inventory.\n`+
            `**/unequip**  Remove an equipped item and put it back into your inventory.\n`+
            `**/use**  Use a consumable from your inventory.\n`+
            `**/drop**  Drop an item from your inventory.(Irreversible)\n`+
            `**/craft**  Attempt to create an item. It costs 2 SPs and you're get XP upon success.\n`+
            `->use the "recipe" option to only show the required items to create it.\n`+
            `(The autocomplete will show only what you can do with your Skills)\n\n`+
            `*--Actions--*\n`+
            `**/area**  Look at the area you are in, what you know about it and the surrounding areas.\n`+
            `**/move**  Travel towards the chosen direction. Costs 1 or more SPs depending of the terrain type.\n`+
            `**/explore**  Explore the area you are currently in. You may find resources, information or trouble.\n`+
            `**/rest**  Set up a camp so your character can recover passivelly.(Your stats affect the recovery rates/minute)\n`+
            `**/quest** Look for a mission/job in a populated area. (You can only have one at time)\n`+
            `->use the "Report" option in the place you took the quest to complete it.(If you met it's requirements)\n`+
            `->use the "Cancel" option to abandon the current quest.\n`+
            `**/act**  If you are in combat, that is how you will select your combat moves.\n`+
            `->use the "rp" option to spend 1 RP to add an extra d10 to your hit chance.\n`+
            `->use the "focus" option to aim your action at a specific enemy body part.(if possible)`
        , ephemeral: true });
    }
};
