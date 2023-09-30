export interface AssetsListingMetadataAsset {
    type: string;
}

export interface AssetsListingMetadataAssetHat extends AssetsListingMetadataAsset {
    type: "HAT";
    chip_offset: { x: number; y: number; };
    product_id: string;
    main?: string;
    back?: string;
    left_main?: string;
    left_back?: string;
    climb?: string;
    floor?: string;
    left_climb?: string;
    left_floor?: string;
    thumb?: string;
}

export interface AssetsListingMetadata {
    assets: AssetsListingMetadataAssetHat[];
}

export interface LoadedBaseCosmeticImages {
    asset: AssetsListingMetadataAsset;
}

export interface LoadedHatCosmeticImages extends LoadedBaseCosmeticImages {
    asset: AssetsListingMetadataAssetHat;
    main?: HTMLImageElement;
    back?: HTMLImageElement;
    left_main?: HTMLImageElement;
    left_back?: HTMLImageElement;
    climb?: HTMLImageElement;
    floor?: HTMLImageElement;
    left_climb?: HTMLImageElement;
    left_floor?: HTMLImageElement;
    thumb?: HTMLImageElement;
}

export type SomeLoadedCosmeticImages = LoadedHatCosmeticImages;