const sharp = require("sharp");
const fs = require("fs/promises");
const path = require("path");

const BASE_PATH = path.resolve(__dirname, "../public/CosmeticOfficial");

/**
 * @param {string} imagePath 
 * @param {{ x: number; y: number; }} pivot 
 * @param {{ x: number; y: number; }} pivotCentre 
 * @param {sharp.Metadata} referenceDimensions 
 */
async function formatImage(imagePath, pivot, pivotCentre, referenceDimensions) {
    const newImage = sharp({
        create: {
            width: referenceDimensions.width,
            height: referenceDimensions.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    });

    const imageSharp = sharp(await fs.readFile(imagePath));
    const imageDimensions = await imageSharp.metadata();

    const resizedImage = imageSharp
        .extend({
            left: Math.floor((referenceDimensions.width - imageDimensions.width) / 2) + pivotCentre.x + Math.floor(imageDimensions.width / 2) - Math.floor(pivot.x),
            right: Math.ceil((referenceDimensions.width - imageDimensions.width) / 2) - pivotCentre.x - Math.floor(imageDimensions.width / 2) + Math.floor(pivot.x),
            top: Math.floor((referenceDimensions.height - imageDimensions.height) / 2) - pivotCentre.y - Math.floor(imageDimensions.height / 2) + Math.floor(pivot.y),
            bottom: Math.ceil((referenceDimensions.height - imageDimensions.height) / 2) + pivotCentre.y + Math.floor(imageDimensions.height / 2) - Math.floor(pivot.y),
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        });
    await fs.writeFile(path.resolve(path.dirname(imagePath), imagePath), await resizedImage.png().toBuffer());
}

/**
 * @param {string} baseAssetPath 
 * @param {any} assetMetadata 
 * @param {sharp.Metadata} referenceDimensions 
 */
async function formatHatCosmetic(baseAssetPath, assetMetadata, referenceDimensions) {
    if (assetMetadata.main) await formatImage(path.resolve(baseAssetPath, assetMetadata.main.file), assetMetadata.main.pivot, { x: -12, y: 4 }, referenceDimensions);
    if (assetMetadata.back) await formatImage(path.resolve(baseAssetPath, assetMetadata.back.file), assetMetadata.back.pivot, { x: -12, y: 4 }, referenceDimensions);
    if (assetMetadata.left_main) await formatImage(path.resolve(baseAssetPath, assetMetadata.left_main.file), assetMetadata.left_main.pivot, { x: -12, y: 4 }, referenceDimensions);
    if (assetMetadata.left_back) await formatImage(path.resolve(baseAssetPath, assetMetadata.left_back.file), assetMetadata.left_back.pivot, { x: -12, y: 4 }, referenceDimensions);
    if (assetMetadata.climb) await formatImage(path.resolve(baseAssetPath, assetMetadata.climb.file), assetMetadata.climb.pivot, { x: -12, y: 4 }, referenceDimensions);
    if (assetMetadata.floor) await formatImage(path.resolve(baseAssetPath, assetMetadata.floor.file), assetMetadata.floor.pivot, { x: -12, y: 4 }, referenceDimensions);
    if (assetMetadata.left_climb) await formatImage(path.resolve(baseAssetPath, assetMetadata.left_climb.file), assetMetadata.left_climb.pivot, { x: -12, y: 4 }, referenceDimensions);
    if (assetMetadata.left_floor) await formatImage(path.resolve(baseAssetPath, assetMetadata.left_floor.file), assetMetadata.left_floor.pivot, { x: -12, y: 4 }, referenceDimensions);
    if (assetMetadata.thumb) await formatImage(path.resolve(baseAssetPath, assetMetadata.thumb.file), assetMetadata.thumb.pivot, { x: -12, y: 4 }, referenceDimensions);
}

(async () => {
    const referenceImagePath = path.resolve(__dirname, "../public/Color_Rose.png");
    const referenceImageBytes = await fs.readFile(referenceImagePath);
    const referenceDimensions = await sharp(referenceImageBytes).metadata();

    const metadataFilePath = path.resolve(BASE_PATH, "metadata.json");
    const metadataFileText = await fs.readFile(metadataFilePath, "utf8");
    const metadataJson = JSON.parse(metadataFileText);

    for (let i = 0; i < metadataJson.assets.length; i++) {
        const assetMetadata = metadataJson.assets[i];
        const baseAssetPath = path.resolve(BASE_PATH, i.toString());

        if (assetMetadata.type === "HAT") {
            console.log("[#%s] Formatting %s (%s)", i.toString().padStart(3, "0"), assetMetadata.product_id, assetMetadata.type);
            try {
                await formatHatCosmetic(baseAssetPath, assetMetadata, referenceDimensions);
            } catch (e) {
                console.log("|- FAILED");
                console.log(e.message);
            }
        }
    }
})();