import * as BABYLON from "@babylonjs/core";

/**
 * Sunlight and shadows for the world.
 *
 * The scene's own directional light ("dir_light") is the sun: it gets a slightly lower, angled
 * direction so shadows fall away from the camera and a little to the side, which shows them
 * behind every object. A weak second light from the opposite side keeps the shaded faces from
 * going flat, without casting shadows of its own (two shadow directions look muddy).
 *
 * Shadows come from one high-resolution shadow map that follows the area the camera looks at.
 */

/** Sun direction: from behind the camera's right, about 50 degrees above the horizon. */
export const SUN_DIRECTION = new BABYLON.Vector3(0.14, -1.3, -0.99).normalize();
const SUN_INTENSITY = 1.2;
const FILL_DIRECTION = new BABYLON.Vector3(1, -1.2, 0.4).normalize();
const FILL_INTENSITY = 0.3;

/** Shadow map coverage: a square this many units either side of its centre. */
const SHADOW_HALF_SIZE = 150;
const SHADOW_MAP_SIZE = 4096;
/** How far ahead of the tank (in the camera's view direction) the map is centred. */
const SHADOW_AHEAD = 60;
/** How far back along the sun direction the shadow camera sits. */
const SUN_DISTANCE = 200;

/** Meshes that never cast: effects, overlays and flat decals. */
const NO_CAST = ["ball", "splatter", "ffdescription", "monitor", "ground", "road-slab", "ground-petal", "collider", "cloud"];

/** Meshes thinner than this (world units) lie flat on the ground and only receive. */
const MIN_CASTER_HEIGHT = 0.3;
/** Meshes smaller than this in every direction don't cast (their shadow would be a speck). */
const MIN_CASTER_SIZE = 1.3;

export type ShadowOptions = {
    camera: BABYLON.Camera;
    /** Point the fallback shadow map is centred on (the camera's focus, i.e. the tank). */
    focus: () => BABYLON.Vector3;
};

export function initializeShadows(scene: BABYLON.Scene, options: ShadowOptions): BABYLON.ShadowGenerator | null {
    const sun = setUpLights(scene);
    const generator = createGenerator(scene, sun, options);
    /** Every mesh that casts a shadow; see refreshCasters below for which are drawn. */
    const casters: BABYLON.AbstractMesh[] = [];

    const isCaster = (mesh: BABYLON.AbstractMesh): boolean => {
        // Physics colliders are hidden with visibility 0, which still renders into shadow maps.
        if (!mesh.isEnabled() || !mesh.isVisible || mesh.visibility <= 0) {
            return false;
        }
        const name = `${mesh.name} ${mesh instanceof BABYLON.InstancedMesh ? mesh.sourceMesh.name : ""}`.toLowerCase();
        if (NO_CAST.some((keyword) => name.includes(keyword))) {
            return false;
        }
        const box = mesh.getBoundingInfo().boundingBox;
        const size = box.maximumWorld.subtract(box.minimumWorld);
        // Flat things only receive; tiny things (pebbles, blossoms, rivets, cleats) would cost a
        // draw in the shadow map every frame for a shadow a few pixels wide.
        return size.y >= MIN_CASTER_HEIGHT && Math.max(size.x, size.y, size.z) >= MIN_CASTER_SIZE;
    };

    const register = (mesh: BABYLON.AbstractMesh) => {
        if (mesh instanceof BABYLON.Mesh && mesh.material) {
            mesh.receiveShadows = true;
        } else if (mesh instanceof BABYLON.InstancedMesh && mesh.sourceMesh.material) {
            mesh.sourceMesh.receiveShadows = true;
        }
        if (isCaster(mesh)) {
            casters.push(mesh);
        }
    };

    scene.meshes.forEach((mesh) => {
        mesh.computeWorldMatrix(true);
        register(mesh);
    });

    // Shots and anything else created during play cast shadows too (they are small and move, so
    // they only cast; receiving would need their materials recompiled).
    const added = scene.onNewMeshAddedObservable.add((mesh) => {
        // Wait a frame: the mesh gets its material, position and visibility after creation.
        scene.onAfterRenderObservable.addOnce(() => {
            if (!mesh.isDisposed() && isCaster(mesh)) {
                casters.push(mesh);
                refreshCasters();
            }
        });
    });
    scene.onDisposeObservable.addOnce(() => scene.onNewMeshAddedObservable.remove(added));

    // Only the casters inside (or near) the area the shadow map currently covers are drawn into
    // it; the rest of the world is skipped. The list is refreshed a few times a second as the map
    // follows the camera.
    const map = generator.getShadowMap();
    const point = new BABYLON.Vector3();
    const refreshCasters = () => {
        if (!map) {
            return;
        }
        const transform = generator.getTransformMatrix();
        const visible: BABYLON.AbstractMesh[] = [];
        for (let i = casters.length - 1; i >= 0; i--) {
            const mesh = casters[i];
            if (mesh.isDisposed()) {
                casters.splice(i, 1);
                continue;
            }
            const sphere = mesh.getBoundingInfo().boundingSphere;
            BABYLON.Vector3.TransformCoordinatesToRef(sphere.centerWorld, transform, point);
            const margin = 1 + (sphere.radiusWorld / SHADOW_HALF_SIZE) + 0.05;
            if (Math.abs(point.x) <= margin && Math.abs(point.y) <= margin) {
                visible.push(mesh);
            }
        }
        map.renderList = visible;
    };
    let sinceRefresh = 0;
    const refreshObserver = scene.onBeforeRenderObservable.add(() => {
        sinceRefresh += scene.getEngine().getDeltaTime();
        if (sinceRefresh >= 250) {
            sinceRefresh = 0;
            refreshCasters();
        }
    });
    scene.onDisposeObservable.addOnce(() => scene.onBeforeRenderObservable.remove(refreshObserver));
    refreshCasters();

    return generator;
}

function setUpLights(scene: BABYLON.Scene): BABYLON.DirectionalLight {
    let sun = scene.getLightByName("dir_light");
    if (!(sun instanceof BABYLON.DirectionalLight)) {
        sun = new BABYLON.DirectionalLight("dir_light", SUN_DIRECTION.clone(), scene);
    }
    const directional = sun as BABYLON.DirectionalLight;

    // The scene file comes with an empty shadow generator on this light; replace it.
    directional.getShadowGenerator()?.dispose();

    directional.direction.copyFrom(SUN_DIRECTION);
    directional.intensity = SUN_INTENSITY;
    directional.diffuse = BABYLON.Color3.FromHexString("#FFF4E3");
    directional.specular = BABYLON.Color3.FromHexString("#FFF4E3");

    const fill = new BABYLON.DirectionalLight("fill_light", FILL_DIRECTION.clone(), scene);
    fill.intensity = FILL_INTENSITY;
    fill.diffuse = BABYLON.Color3.FromHexString("#D6E4F5");
    fill.specular = BABYLON.Color3.Black();

    return directional;
}

function createGenerator(scene: BABYLON.Scene, sun: BABYLON.DirectionalLight, options: ShadowOptions): BABYLON.ShadowGenerator {
    // One high-resolution map covering the area around what the camera looks at. (Cascaded
    // shadow maps would be sharper close up, but they split the camera's view range, and this
    // camera's far plane is effectively infinite, which breaks them.)
    sun.autoUpdateExtends = false;
    sun.autoCalcShadowZBounds = false;
    sun.orthoLeft = -SHADOW_HALF_SIZE;
    sun.orthoRight = SHADOW_HALF_SIZE;
    sun.orthoTop = SHADOW_HALF_SIZE;
    sun.orthoBottom = -SHADOW_HALF_SIZE;
    sun.shadowMinZ = SUN_DISTANCE - 120;
    sun.shadowMaxZ = SUN_DISTANCE + 120;

    const generator = new BABYLON.ShadowGenerator(SHADOW_MAP_SIZE, sun);
    applyCommonSettings(generator);
    // Fade shadows out towards the edge of the map. Without it, a tall object touching the edge
    // smears its shadow across everything beyond the map (the ground there keeps sampling the
    // edge pixels), which shows up as long dark streaks in the distance.
    generator.frustumEdgeFalloff = 0.25;

    // Centre the map a little ahead of the focus point, in the direction the camera looks, and
    // snap it to whole texels so shadow edges don't shimmer while driving.
    const texel = (SHADOW_HALF_SIZE * 2) / SHADOW_MAP_SIZE;
    const forward = new BABYLON.Vector3();
    const center = new BABYLON.Vector3();
    const observer = scene.onBeforeRenderObservable.add(() => {
        options.camera.getDirectionToRef(BABYLON.Axis.Z, forward);
        forward.y = 0;
        if (forward.lengthSquared() > 0.0001) {
            forward.normalize().scaleInPlace(SHADOW_AHEAD);
        }
        center.copyFrom(options.focus()).addInPlace(forward);
        center.set(Math.round(center.x / texel) * texel, 0, Math.round(center.z / texel) * texel);
        center.subtractToRef(SUN_DIRECTION.scale(SUN_DISTANCE), sun.position);
    });
    scene.onDisposeObservable.addOnce(() => scene.onBeforeRenderObservable.remove(observer));

    return generator;
}

function applyCommonSettings(generator: BABYLON.ShadowGenerator): void {
    generator.usePercentageCloserFiltering = true;
    generator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
    generator.bias = 0.001;
    generator.normalBias = 0.02;
    // Full shadow from the sun: shaded areas still get the sky and fill light (and the toy
    // materials their reflections), so they read as soft blue shade, not black. Any lighter and
    // the shadows all but disappear, since the sun is only part of the ground's light.
    generator.setDarkness(0);
}
