import * as BABYLON from "@babylonjs/core";

import { createLumpyBall, createRandom, createTemplate, createToyMaterial } from "../core/toyStyle";
import { addStaticBox } from "../core/staticBodies";
import { GROUND_Y } from "../core/constants";

/**
 * Toy-style cherry blossom trees: a smooth tapered trunk with a root flare and two branches, a
 * canopy made of soft lumpy "puffs" in a few pinks dotted with blossoms, a gentle sway, and petals
 * drifting down.
 *
 * Only the trunk ("tree-trunk-*") has a physics body and is used by the tank's tree collision, and
 * its size matches the previous trees, so gameplay is unchanged. Other parts must not be named
 * "tree-trunk*".
 */

type TreeContext = {
    scene: BABYLON.Scene;
};

type TreeTemplates = {
    trunk: BABYLON.Mesh;
    rootFlare: BABYLON.Mesh;
    branch: BABYLON.Mesh;
    puffs: BABYLON.Mesh[];
    blossom: BABYLON.Mesh;
};

const TRUNK_HEIGHT = 15;
const TRUNK_BOTTOM_DIAMETER = 5;
const TRUNK_TOP_DIAMETER = 3;
/** Height of the canopy's sway pivot (top of the trunk), relative to the tree's origin. */
const CANOPY_PIVOT_Y = 6;

// Natural sakura tones: pale blush blossoms rather than candy pink, on dark bark.
/** Trunk centers; the trunk is centered vertically on these points. */
export const TREE_POSITIONS = [
    new BABYLON.Vector3(78.3985, 5.1848, -11.2018),
    new BABYLON.Vector3(47.5043, 5.1848, -36.9549),
    new BABYLON.Vector3(-39.5430, 5.1848, -44.9435),
    new BABYLON.Vector3(-54.0394, 5.1848, -22.0382),
    new BABYLON.Vector3(57.1332, 5.1848, 77.0256),
    // A few more towards the edges of the play area, away from the paths.
    new BABYLON.Vector3(-72, 5.1848, 98),
    new BABYLON.Vector3(-136, 5.1848, 40),
    new BABYLON.Vector3(100, 5.1848, 72),
    new BABYLON.Vector3(162, 5.1848, -58),
];

/** Trees further than this from the tank stop swaying and dropping petals (nobody sees them). */
const ANIMATION_DISTANCE = 160;

const PALETTE = {
    bark: "#5E4436",
    barkDark: "#47332A",
    puffs: ["#F3C6D1", "#E9AFBF", "#F8DCE3"],
    blossom: "#FFF7F8",
    petal: "#F6CFD9",
};

export function instantiateTrees(_this: TreeContext): void {
    const scene = _this.scene;

    const treeCoordinates = TREE_POSITIONS;

    const templates = createTreeTemplates(scene);
    const petalTexture = createPetalTexture(scene);
    const swayingCanopies: { node: BABYLON.TransformNode; phase: number; position: BABYLON.Vector3; petals: BABYLON.ParticleSystem; active: boolean }[] = [];

    treeCoordinates.forEach((position, index) => {
        const canopy = instantiateTree(templates, position, index, scene);
        const petals = createFallingPetals(scene, petalTexture, position, index);
        swayingCanopies.push({ node: canopy, phase: index * 1.7, position, petals, active: true });
    });

    // A slow breeze. The canopies pivot at the top of the trunk. Only trees near the tank are
    // animated; far ones keep still and stop dropping petals.
    const tank = scene.getMeshByName("tank_holder");
    let time = 0;
    let lastDistanceCheck = -1;
    scene.onBeforeRenderObservable.add(() => {
        time += scene.getEngine().getDeltaTime() / 1000;
        if (tank && time - lastDistanceCheck > 0.5) {
            lastDistanceCheck = time;
            for (const tree of swayingCanopies) {
                const near = Math.hypot(tree.position.x - tank.position.x, tree.position.z - tank.position.z) < ANIMATION_DISTANCE;
                if (near !== tree.active) {
                    tree.active = near;
                    if (near) {
                        tree.petals.start();
                    } else {
                        tree.petals.stop();
                    }
                }
            }
        }
        for (const { node, phase, active } of swayingCanopies) {
            if (!active) {
                continue;
            }
            node.rotation.z = Math.sin((time * 0.7) + phase) * 0.018;
            node.rotation.x = Math.sin((time * 0.53) + (phase * 1.3)) * 0.012;
        }
    });
}

function createTreeTemplates(scene: BABYLON.Scene): TreeTemplates {
    const bark = createToyMaterial(scene, "toy-tree-bark", PALETTE.bark, { roughness: 0.75, clearCoat: 0.1 });
    const barkDark = createToyMaterial(scene, "toy-tree-bark-dark", PALETTE.barkDark, { roughness: 0.8, clearCoat: 0.1 });
    const blossom = createToyMaterial(scene, "toy-tree-blossom", PALETTE.blossom, { roughness: 0.45, clearCoat: 0.4 });

    const trunk = BABYLON.MeshBuilder.CreateCylinder("tree-trunk", {
        height: TRUNK_HEIGHT,
        diameterTop: TRUNK_TOP_DIAMETER,
        diameterBottom: TRUNK_BOTTOM_DIAMETER,
        tessellation: 24,
    }, scene);
    trunk.material = bark;
    trunk.isPickable = false;
    // The first tree uses this mesh directly; the others are clones (each needs its own physics body).

    const rootFlare = createTemplate(BABYLON.MeshBuilder.CreateCylinder("tree-root-flare", {
        height: 2.6,
        diameterTop: TRUNK_BOTTOM_DIAMETER - 0.3,
        diameterBottom: TRUNK_BOTTOM_DIAMETER + 2.6,
        tessellation: 24,
    }, scene), barkDark);

    const branchMesh = BABYLON.MeshBuilder.CreateCylinder("tree-branch", {
        height: 7.5,
        diameterTop: 0.9,
        diameterBottom: 1.6,
        tessellation: 12,
    }, scene);
    // Put the branch's base at its origin so it can be rotated around where it leaves the trunk.
    branchMesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 3.75, 0));
    const branch = createTemplate(branchMesh, bark);

    const random = createRandom(7);
    const puffs = PALETTE.puffs.map((hex, i) => {
        const material = createToyMaterial(scene, `toy-tree-puff-${i}`, hex, { roughness: 0.65, clearCoat: 0.15 });
        return createTemplate(createLumpyBall(`tree-puff-${i}`, scene, random), material);
    });

    const blossomMesh = BABYLON.MeshBuilder.CreateSphere("tree-blossom", { diameter: 1, segments: 6 }, scene);
    const blossomTemplate = createTemplate(blossomMesh, blossom);

    return { trunk, rootFlare, branch, puffs, blossom: blossomTemplate };
}

/**
 * Builds one tree and returns its canopy node (for the sway animation).
 */
function instantiateTree(templates: TreeTemplates, position: BABYLON.Vector3, index: number, scene: BABYLON.Scene): BABYLON.TransformNode {
    const random = createRandom(1000 + index * 97);
    const tree = new BABYLON.TransformNode(`tree-${index}`, scene);
    tree.position.copyFrom(position);
    tree.rotation.y = random() * Math.PI * 2;

    // Don't clone the first trunk's physics body along with the mesh: the copy would stay behind
    // as an invisible obstacle. Each trunk gets its own body at the end of this function.
    const trunk = index === 0 ? templates.trunk : templates.trunk.clone(`tree-trunk-${index}`, null, true, false);
    trunk.parent = tree;

    const rootFlare = templates.rootFlare.createInstance(`tree-root-flare-${index}`);
    rootFlare.parent = tree;
    // Sit the flare on the ground (y = -0.5), just sinking into it.
    rootFlare.position.y = (GROUND_Y - 0.1) - position.y + 1.3;

    // Everything above the trunk sways together around the top of the trunk.
    const canopy = new BABYLON.TransformNode(`tree-canopy-${index}`, scene);
    canopy.parent = tree;
    canopy.position.y = CANOPY_PIVOT_Y;

    const branchAngles = [-0.55, 0.6];
    branchAngles.forEach((angle, i) => {
        const branch = templates.branch.createInstance(`tree-branch-${index}-${i}`);
        branch.parent = canopy;
        branch.position.y = -1.5 - i;
        branch.rotation.z = angle;
        branch.rotation.y = (i * 1.9) + (random() * 0.6);
    });

    // Canopy: one big central puff, a ring of medium ones and a couple on top.
    const canopyCenterY = 8.6;
    const puffLayout: { x: number; y: number; z: number; r: number }[] = [{ x: 0, y: canopyCenterY, z: 0, r: 8.2 }];
    const ringCount = 5;
    for (let i = 0; i < ringCount; i++) {
        const angle = ((i / ringCount) * Math.PI * 2) + (random() * 0.5);
        const distance = 6.2 + (random() * 1.4);
        puffLayout.push({
            x: Math.cos(angle) * distance,
            y: canopyCenterY - 1.8 + (random() * 2.6),
            z: Math.sin(angle) * distance,
            r: 4.8 + (random() * 1.6),
        });
    }
    for (let i = 0; i < 2; i++) {
        const angle = random() * Math.PI * 2;
        puffLayout.push({
            x: Math.cos(angle) * 2.5,
            y: canopyCenterY + 4.6 + (random() * 0.8),
            z: Math.sin(angle) * 2.5,
            r: 4.4 + (random() * 1.0),
        });
    }

    puffLayout.forEach((layout, i) => {
        const template = templates.puffs[Math.floor(random() * templates.puffs.length)];
        const puff = template.createInstance(`tree-leaves-${index}-${i}`);
        puff.parent = canopy;
        puff.position.set(layout.x, layout.y, layout.z);
        puff.scaling.set(layout.r, layout.r * 0.86, layout.r);
        puff.rotation.y = random() * Math.PI * 2;
    });

    // Little blossoms sitting on the outside of the canopy.
    const blossomCount = 26;
    for (let i = 0; i < blossomCount; i++) {
        const layout = puffLayout[Math.floor(random() * puffLayout.length)];
        const theta = random() * Math.PI * 2;
        const upness = (random() * 1.3) - 0.3;
        const horizontal = Math.sqrt(Math.max(0, 1 - (upness * upness)));
        const direction = new BABYLON.Vector3(Math.cos(theta) * horizontal, upness, Math.sin(theta) * horizontal).normalize();

        const blossom = templates.blossom.createInstance(`tree-blossom-${index}-${i}`);
        blossom.parent = canopy;
        blossom.position.set(
            layout.x + (direction.x * layout.r * 0.98),
            layout.y + (direction.y * layout.r * 0.86 * 0.98),
            layout.z + (direction.z * layout.r * 0.98),
        );
        blossom.scaling.setAll(0.9 + (random() * 0.7));
    }

    tree.getChildMeshes().forEach((mesh) => {
        mesh.isPickable = false;
        // The canopy moves, so the scene optimizer must not freeze these meshes.
        mesh.metadata = { ...(mesh.metadata ?? {}), keepUnfrozen: true };
        mesh.computeWorldMatrix(true);
    });

    // Solid trunk (a plain static body: it never moves).
    trunk.computeWorldMatrix(true);
    const trunkBox = trunk.getBoundingInfo().boundingBox;
    const trunkSize = trunkBox.maximumWorld.subtract(trunkBox.minimumWorld);
    addStaticBox(scene, trunkBox.centerWorld, trunkSize.x, trunkSize.y, trunkSize.z);

    return canopy;
}

/**
 * A few petals drifting down from each canopy.
 */
function createFallingPetals(scene: BABYLON.Scene, texture: BABYLON.Texture, treePosition: BABYLON.Vector3, index: number): BABYLON.ParticleSystem {
    const petals = new BABYLON.ParticleSystem(`tree-petals-${index}`, 40, scene);
    petals.particleTexture = texture;
    petals.emitter = treePosition.add(new BABYLON.Vector3(0, CANOPY_PIVOT_Y + 8, 0));
    petals.minEmitBox = new BABYLON.Vector3(-8, -3, -8);
    petals.maxEmitBox = new BABYLON.Vector3(8, 1, 8);

    const petal = BABYLON.Color3.FromHexString(PALETTE.petal);
    petals.color1 = new BABYLON.Color4(petal.r, petal.g, petal.b, 1);
    petals.color2 = new BABYLON.Color4(1, 0.93, 0.96, 1);
    petals.colorDead = new BABYLON.Color4(petal.r, petal.g, petal.b, 0);

    petals.minSize = 0.7;
    petals.maxSize = 1.2;
    petals.minLifeTime = 5;
    petals.maxLifeTime = 7;
    petals.emitRate = 3;
    petals.gravity = new BABYLON.Vector3(0, -1.1, 0);
    petals.direction1 = new BABYLON.Vector3(-1, -0.6, -1);
    petals.direction2 = new BABYLON.Vector3(1, -0.2, 1);
    petals.minEmitPower = 0.5;
    petals.maxEmitPower = 1.5;
    petals.minAngularSpeed = -1.5;
    petals.maxAngularSpeed = 1.5;
    petals.minInitialRotation = 0;
    petals.maxInitialRotation = Math.PI * 2;
    petals.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    petals.preWarmCycles = 120;
    petals.preWarmStepOffset = 5;
    petals.start();
    return petals;
}

/** Soft petal shape drawn once into a small texture. */
function createPetalTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
    const size = 64;
    const texture = new BABYLON.DynamicTexture("tree-petal-texture", { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    const context = texture.getContext() as CanvasRenderingContext2D;
    context.clearRect(0, 0, size, size);
    context.fillStyle = "#FFFFFF";
    context.beginPath();
    context.ellipse(size / 2, size / 2, size * 0.42, size * 0.24, Math.PI / 5, 0, Math.PI * 2);
    context.fill();
    texture.update();
    return texture;
}
