import * as BABYLON from "@babylonjs/core";

/**
 * Compiles every shader the game will need while the loading screen is still up.
 *
 * Babylon compiles a material's shader the first time a mesh using it is drawn, which happens in
 * the middle of play: when something first comes into view, or a cloud first fades. On Windows
 * (where browsers translate shaders to Direct3D) each compile can freeze the game for a moment,
 * which showed up as stutter while driving around. Compiling them up front moves that cost into
 * the loading screen. Browsers that support it compile in parallel, so it adds little to loading.
 */

/** Gives up waiting after this long, rather than keep the loading screen up. */
const MAX_WAIT_MS = 10000;

const pending: Promise<unknown>[] = [];

/** Things still being set up after the scene loads (e.g. the target HUD), to wait for first. */
export function registerLoadingTask(task: Promise<unknown>): void {
    pending.push(task.catch(() => undefined));
}

export async function warmUpShaders(scene: BABYLON.Scene): Promise<void> {
    await withTimeout(Promise.all(pending.splice(0)));
    if (scene.isDisposed) {
        return;
    }

    const tasks: Promise<unknown>[] = [];
    const casters: BABYLON.AbstractMesh[] = [];
    for (const mesh of scene.meshes) {
        if (!(mesh instanceof BABYLON.Mesh) || !mesh.isEnabled() || !mesh.material || mesh.getTotalVertices() === 0) {
            continue;
        }
        // Hidden templates only matter when instances of them are drawn.
        const hasInstances = mesh.instances.length > 0 || mesh.hasThinInstances;
        if (!mesh.isVisible && !hasInstances) {
            continue;
        }
        casters.push(mesh);
        const material = mesh.material;
        // Babylon can't compile these up front correctly (per-instance attributes like the tread
        // prints' fading colours are left out), so they compile when first drawn, as before.
        if (material instanceof BABYLON.MultiMaterial || hasPerInstanceAttributes(mesh)) {
            continue;
        }
        tasks.push(material.forceCompilationAsync(mesh, { useInstances: mesh.instances.length > 0 }).catch(() => undefined));
    }

    // The shadow map's own (depth) shaders, for everything that may cast a shadow at some point.
    for (const light of scene.lights) {
        const generator = light.getShadowGenerator() as BABYLON.ShadowGenerator | null;
        const shadowMap = generator?.getShadowMap();
        if (!generator || !shadowMap) {
            continue;
        }
        const renderList = shadowMap.renderList;
        shadowMap.renderList = casters;
        tasks.push(generator.forceCompilationAsync().catch(() => undefined).then(() => {
            shadowMap.renderList = renderList;
        }));
    }

    await withTimeout(Promise.all(tasks));
}

function hasPerInstanceAttributes(mesh: BABYLON.Mesh): boolean {
    const thinInstanceBuffers = (mesh as unknown as { _userThinInstanceBuffersStorage?: { data?: object } })._userThinInstanceBuffersStorage?.data;
    return Object.keys(mesh.instancedBuffers ?? {}).length > 0 || Object.keys(thinInstanceBuffers ?? {}).length > 0;
}

function withTimeout(task: Promise<unknown>): Promise<unknown> {
    return Promise.race([task, new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS))]);
}
