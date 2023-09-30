export interface AssetsListingMetadataAsset {
    type: string;
}

export interface SpriteFileReference {
    file: string;
    pivot: { x: number; y: number; };
}

export interface AssetsListingMetadataAssetHat extends AssetsListingMetadataAsset {
    type: "HAT";
    chip_offset: { x: number; y: number; };
    product_id: string;
    in_front: boolean;
    main?: SpriteFileReference|null;
    back?: SpriteFileReference|null;
    left_main?: SpriteFileReference|null;
    left_back?: SpriteFileReference|null;
    climb?: SpriteFileReference|null;
    floor?: SpriteFileReference|null;
    left_climb?: SpriteFileReference|null;
    left_floor?: SpriteFileReference|null;
    thumb?: SpriteFileReference|null;
}

export interface AssetsListingMetadata {
    assets: AssetsListingMetadataAssetHat[];
}

export interface LoadedCosmeticImage {
    img: HTMLImageElement;
    pivot: { x: number; y: number; };
    scale: number;
}

export interface LoadedBaseCosmeticImages {
    asset: AssetsListingMetadataAsset;
}

export interface LoadedHatCosmeticImages extends LoadedBaseCosmeticImages {
    asset: AssetsListingMetadataAssetHat;
    main?: LoadedCosmeticImage;
    back?: LoadedCosmeticImage;
    left_main?: LoadedCosmeticImage;
    left_back?: LoadedCosmeticImage;
    climb?: LoadedCosmeticImage;
    floor?: LoadedCosmeticImage;
    left_climb?: LoadedCosmeticImage;
    left_floor?: LoadedCosmeticImage;
    thumb?: LoadedCosmeticImage;
}

export type SomeLoadedCosmeticImages = LoadedHatCosmeticImages;