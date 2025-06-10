const sharp = require('sharp');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const avatarCache = new (require('../utils/TTLCache.js'))(60_000); // 60s TTL
const mapCache = new (require('../utils/TTLCache.js'))(30_000); // 30s TTL

async function generateCombatImageBuffer(userImageUrl, npcImageUrl, userDead, npcDead) {
    const cacheKey = `${userImageUrl}|${npcImageUrl}|${userDead}|${npcDead}`;
    const cached = avatarCache.get(cacheKey);
    if (cached) return cached;

    const [userRes, npcRes] = await Promise.all([
        fetch(userImageUrl),
        fetch(npcImageUrl)
    ]);
    const [userBuffer, npcBuffer] = await Promise.all([
        userRes.arrayBuffer(),
        npcRes.arrayBuffer()
    ]);

    const [userImg, npcImg] = await Promise.all([
        userDead ? sharp(Buffer.from(userBuffer)).resize(128, 128,{position: 'north'}).grayscale().toBuffer()
        : sharp(userBuffer).resize(128, 128,{position: 'north'}).toBuffer(),
        npcDead ? sharp(Buffer.from(npcBuffer)).resize(128, 128,{position: 'north'}).grayscale().toBuffer()
        : sharp(npcBuffer).resize(128, 128,{position: 'north'}).toBuffer()
    ]);

    const result = await sharp({
        create: {
            width: 256,
            height: 128,
            channels: 4,
            background: '#00000000'
        }
    })
    .composite([
        { input: userImg, top: 0, left: 0 },
        { input: npcImg, top: 0, left: 128 }
    ])
    .jpeg({ quality: 80 })
    .toBuffer();

    avatarCache.set(cacheKey, result);
    return result;
}

async function generateMiniMapImage(centerX, centerY, mapData) {
    const cacheKey = `${centerX},${centerY}|${JSON.stringify(mapData.tipo)}`;
    const cached = mapCache.get(cacheKey);
    if (cached) return cached;

    const tileSize = 16;
    const gridSize = 3;
    const canvasSize = tileSize * gridSize;

    const canvas = sharp({
        create: {
            width: canvasSize,
            height: canvasSize,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    });

    const composites = [];

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const x = centerX + dx;
            const y = centerY + dy;

            if (
                y >= 0 && y < mapData.tipo.length &&
                x >= 0 && x < mapData.tipo[0].length
            ) {
                const tipo = mapData.tipo[y][x];
                const tilePath = path.join(__dirname, '..', 'media', 'map', `${tipo}.png`);
                if (fs.existsSync(tilePath)) {
                    composites.push({
                        input: tilePath,
                        top: (dy + 1) * tileSize,
                                    left: (dx + 1) * tileSize
                    });
                }
            }
        }
    }

    const playerIcon = path.join(__dirname, '..', 'media', 'map', 'p.png');
    if (fs.existsSync(playerIcon)) {
        composites.push({
            input: playerIcon,
            top: tileSize,
            left: tileSize
        });
    }

    const finalImage = await canvas
    .composite(composites)
    .png()
    .toBuffer();

    const upscaled = await sharp(finalImage)
    .resize({
        width: canvasSize * 3,
        height: canvasSize * 3,
        kernel: sharp.kernel.nearest
    })
    .toBuffer();

    mapCache.set(cacheKey, upscaled);
    return upscaled;
}

    /*const [userRes, npcRes] = await Promise.all([
        fetch(userImageUrl),
        fetch(npcImageUrl)
    ]);

    const [userBuffer, npcBuffer] = await Promise.all([
        userRes.arrayBuffer(),
        npcRes.arrayBuffer()
    ]);

    // Processa as duas imagens paralelamente com redimensionamento embutido
    const [userImg, npcImg] = await Promise.all([
        //sharp(Buffer.from(userBuffer)).resize(128, 128).toBuffer(),
        //sharp(Buffer.from(npcBuffer)).resize(128, 128).toBuffer()

        userDead ? sharp(Buffer.from(userBuffer)).resize(128, 128).grayscale().toBuffer()
        : sharp(userBuffer).resize(128, 128).toBuffer(),
        npcDead ? sharp(Buffer.from(npcBuffer)).resize(128, 128).grayscale().toBuffer()
        : sharp(npcBuffer).resize(128, 128).toBuffer()
    ]);

    // Composita em uma única operação
    return await sharp({
        create: {
            width: 256,
            height: 128,
            channels: 4,
            background: '#00000000'
        }
    })
    .composite([
        { input: userImg, top: 0, left: 0 },
        { input: npcImg, top: 0, left: 128 }
    ])
    .jpeg({ quality: 80 })
    .toBuffer(); // Apenas 1x toBuffer!
}

async function generateMiniMapImage(centerX, centerY, mapData) {
    const tileSize = 16;
    const gridSize = 3;
    const canvasSize = tileSize * gridSize;

    const canvas = sharp({
        create: {
            width: canvasSize,
            height: canvasSize,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    });

    const composites = [];

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const x = centerX + dx;
            const y = centerY + dy;

            if (
                y >= 0 && y < mapData.tipo.length &&
                x >= 0 && x < mapData.tipo[0].length
            ) {
                const tipo = mapData.tipo[y][x];
                const tilePath = path.join(__dirname, '..', 'media', 'map', `${tipo}.png`);
                if (fs.existsSync(tilePath)) {
                    composites.push({
                        input: tilePath,
                        top: (dy + 1) * tileSize,
                        left: (dx + 1) * tileSize
                    });
                }
            }
        }
    }

    // Adiciona ícone do jogador no centro
    const playerIcon = path.join(__dirname, '..', 'media', 'map', 'p.png');
    if (fs.existsSync(playerIcon)) {
        composites.push({
            input: playerIcon,
            top: tileSize, // centro
            left: tileSize
        });
    }

    // Monta a imagem final
    const finalImage = await canvas
    .composite(composites)
    .png()
    .toBuffer();

    // Ampliar imagem 3x com pixel-perfect (sem blur)
    const upscaled = await sharp(finalImage)
    .resize({
        width: canvasSize * 3,
        height: canvasSize * 3,
        kernel: sharp.kernel.nearest // 🔍 pixel perfect!
    })
    .toBuffer();

    return upscaled;
}*/

module.exports = { generateCombatImageBuffer, generateMiniMapImage };
