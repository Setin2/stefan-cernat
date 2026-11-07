/**
 * What each physics body sounds like when something hits it. Bodies register here when they're
 * created (see staticBodies.ts and impactSounds.ts); collision sounds look them up.
 */

/** Things that move around. */
export type LooseMaterial = "brick" | "ball" | "cone" | "trophy" | "tank";
/** Scenery that stays put. "static" is anything solid without a material of its own. */
export type SurfaceMaterial = "ground" | "trunk" | "bush" | "rock" | "post" | "ramp" | "solid" | "static";
export type SoundMaterial = LooseMaterial | SurfaceMaterial;

const SURFACES = new Set<SoundMaterial>(["ground", "trunk", "bush", "rock", "post", "ramp", "solid", "static"]);

export function isSurface(material: SoundMaterial): material is SurfaceMaterial {
    return SURFACES.has(material);
}

const materials = new WeakMap<object, SoundMaterial>();

export function setSoundMaterial(body: object, material: SoundMaterial): void {
    materials.set(body, material);
}

export function getSoundMaterial(body: object): SoundMaterial | undefined {
    return materials.get(body);
}
