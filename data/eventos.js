//Tipos
//0-deeps sea
//1-sea
//2-beach
//3-green plains
//4-forest
//5-swamp
//6-dry plains
//7-mountain
//8-artic plains
//9-desert

const events = [{
//////////Naturais/Genericos/////////////
    id: 'fruit_trees',
    tipos: [2, 3, 4, 5],
    contMin: 0,ocupMin: 0,
    reward: [9],special: '',
    msg: `:star: Found fruit bearing trees :star: \n\n You managed to collect {x} fruits from them! :apple:`
},{
    id: 'mushrooms',
    tipos: [4, 5, 8],
    contMin: 0,ocupMin: 0,rankMin: 0,
    reward: [10],special: '',
    msg: `:star: Found some edible mushrooms :star: \n\n You managed to collect {x} mushrooms! :mushroom:`
},{
    id: 'herbs',
    tipos: [3, 4, 5, 6, 7],
    contMin: 0,ocupMin: 0,rankMin: 0,
    reward: [12],special: '',
    msg: `:star: Found some medicinal herbs :star: \n\n You magaged to harvest {x} of them! :herb:`
},{
    id: 'roots',
    tipos: [4, 5],
    contMin: 0,ocupMin: 0,rankMin: 0,
    reward: [13],special: '',
    msg: `:star: Found some medicinal roots :star: \n\n You magaged to harvest {x} of them! :ginger_root:`
},{
    id: 'flowers',
    tipos: [7, 8],
    contMin: 0,ocupMin: 0,rankMin: 0,
    reward: [14],special: '',
    msg: `:star: Found some rare medicinal flowers :star: \n\n You magaged to harvest {x} of them! :blossom:`
},{
    id: 'animal_corpse',
    tipos: [2, 3, 4, 5, 6, 7, 8],
    contMin: 0,ocupMin: 0,rankMin: 0,
    reward: [2,3,4,5,6,7],special: '',
    msg: `:star: Found a recently deceased creature corpse :star: \n\n You magaged to harvest {x} {y} out of it! :skull:`
},{
    id: 'animal_bones',
    tipos: [2, 6, 7, 9],
    contMin: 0,ocupMin: 0,rankMin: 0,
    reward: [4],special: '',
    msg: `:star: Found preserved remains of some creature :star: \n\n You magaged to harvest {x} bones out of it! :skull:`
},
//////////Com Ocupação/////////////
{
    id: 'abandoned_camp',
    tipos: [2, 3, 4, 5, 6, 8],
    contMin: 0,ocupMin: 1,rankMin: 0,
    reward: [4, 9, 10, 11],special: '',
    msg: `:star: Found an abandoned camp :star: \n\n You found {x} {y} left in here! :package:`
}/*,{
    id: 'adventurer_corpse',
    tipos: [2, 3, 4, 5, 6, 7, 8],
    contMin: 0,ocupMin: 1,rankMin: 0,
    reward: [4, 9, 10, 11],
    msg: `:star: Found an abandoned camp :star: \n\n You found {x} {y} left in here! :package:`*/
// Adicione mais eventos...
];
module.exports = { events };
//`:star: Found fruit bearing trees :star: \n\n You magaged to collect X fruits from it! :apple:`
//`:star: Found some edible mushrooms :star: \n\n You magaged to collect X mushrooms! :brown_mushroom:`
//`:star: Found some medicinal herbs :star: \n\n You magaged to harvest X of them! :herb:`
//`:star: Found some medicinal roots :star: \n\n You magaged to harvest X of them! :ginger_root:`
//`:star: Found some rare medicinal flowers :star: \n\n You magaged to harvest X of them! :blossom:`
