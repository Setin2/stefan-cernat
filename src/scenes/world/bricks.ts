import * as BABYLON from "@babylonjs/core";

import { createRoundedBox, createTemplate, createToyMaterial } from "../core/toyStyle";

type BrickContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    brickSound: BABYLON.Sound;
};

/** Earthy toy-block colours (brick red, mustard, teal, slate blue, sand); neighbours differ. */
const BRICK_COLORS = ["#B9553F", "#D9A13B", "#3F8C84", "#456F99", "#DCC9A8"];

/**
 * The brick builds placed around the world: (x, z) centre, bricks per row from the bottom up,
 * and the rotation around their own centre.
 */
const BRICK_BUILDS: { x: number; z: number; rows: number[]; rotationY: number }[] = [
    { x: -5, z: -30, rows: [6, 6, 4], rotationY: 0 },
    // Centre and angle match where this wall has always been placed (it was previously built at
    // (130, -50) and then rotated 300 rad around the world origin).
    { x: 47.1152, z: 131.0731, rows: [6, 6, 6, 4], rotationY: 4.6903 },
    // A pyramid south of the start and a tower in the north-west to knock over.
    { x: 25, z: -100, rows: [5, 4, 3, 2, 1], rotationY: 0.3 },
    { x: -64, z: 76, rows: [1, 1, 1, 1, 1, 1], rotationY: 0.4 },
];

/** Builds every brick wall, pyramid and tower in BRICK_BUILDS. */
export function createBrickBuilds(context: BrickContext): void {
    for (const build of BRICK_BUILDS) {
        instantiateBricks(context, build.x, 8, build.z, build.rows, build.rotationY);
    }
}

/** Shared by every wall, since they all play the same sound. */
const brickSoundCooldownMs = 150;
let lastBrickSoundTime = 0;

/**
 * Set up a wall of bricks centered at (x, z) and rotated around its own center.
 * @param y fallback ground height used if no ground is found below the wall.
 * @param rotationY rotation of the wall around its own vertical axis, in radians.
 */
function instantiateBricks(
    _this: BrickContext,
    x: number,
    y: number,
    z: number,
    numColumnsPerRow: number[],
    rotationY: number = 0
): void {
    const brickMass = 2;
    const brickScaleFactor = 1.1;
    const brickLength = 6 * brickScaleFactor;
    const brickDepth = 3 * brickScaleFactor;
    const brickHeight = brickLength * 0.5 * brickScaleFactor;
    const groundY = getGroundHeight(x, y, z);
    const initialY = groundY + brickHeight / 2;
    const tankImpostor = _this.tank.physicsImpostor;

    if (!tankImpostor) {
        console.warn("Tank physics impostor is missing. Skipping brick collision audio setup.");
        return;
    }

    // One hidden template per colour; the visible bricks are instances of these.
    const brickTemplates = createBrickTemplates(_this, brickLength, brickHeight, brickDepth);
    const colorOffset = Math.abs(Math.round(x + z)) % BRICK_COLORS.length;
    
    // Define a small buffer to prevent collision
    const buffer = 0; // Adjust this value as needed

    // The wall is built in the parent's local space (centered on x = 0, z = 0) so that
    // rotating the parent turns the wall around its own center.
    const wallParent = new BABYLON.TransformNode("wallParent", _this.scene);
    wallParent.position.set(x, 0, z);
    wallParent.rotation.y = rotationY;
    wallParent.computeWorldMatrix(true);

    // Create the wall of bricks
    for (let j = 0; j < numColumnsPerRow.length; j++) {
        // Number of bricks in the current row
        const numBricksInRow = numColumnsPerRow[j] ?? 0;
        
        // Calculate the total width of the current row
        const totalRowWidth = numBricksInRow * (brickLength + buffer);
        
        // Start placing bricks so the row is centered on the wall's center
        let localX = -(totalRowWidth / 2);
        const localY = initialY + j * (brickHeight + buffer);

        for (let i = 0; i < numBricksInRow; i++) {
            // Stepping by 2 per brick and 3 per row keeps side-by-side and stacked bricks different.
            const template = brickTemplates[(colorOffset + (i * 2) + (j * 3)) % brickTemplates.length];
            const brickInstance = template.createInstance(`brick${j}-${i}`);
            positionBrick(_this, brickInstance, localX, localY, 0, brickMass);
            // Parent only after the impostor exists: Babylon skips creating the physics
            // body for meshes that already have a parent.
            brickInstance.parent = wallParent;
            localX += brickLength + buffer; // Increment x position with buffer
        }
    }

    /**
     * Create the hidden, rounded toy-block templates (one per colour).
     */
    function createBrickTemplates(
        _this: BrickContext,
        length: number,
        height: number,
        depth: number
    ): BABYLON.Mesh[] {
        return BRICK_COLORS.map((hex, i) => {
            const material = createToyMaterial(_this.scene, `toy-brick-${i}`, hex, { roughness: 0.5, clearCoat: 0.4 });
            return createTemplate(createRoundedBox(`brick-template-${i}`, length, height, depth, 0.38, _this.scene, 3), material);
        });
    }

    /**
     * Position a brick mesh and set up its physics.
     */
    function positionBrick(
        _this: BrickContext,
        brick: BABYLON.Mesh | BABYLON.InstancedMesh,
        x: number,
        y: number,
        z: number,
        mass: number
    ): void {
        brick.position.set(x, y, z);
        brick.physicsImpostor = new BABYLON.PhysicsImpostor(
            brick,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: mass, friction: 1 },
            _this.scene
        );

        // Play sound on collision with the tank. Driving into a wall makes many bricks touch the
        // tank in the same moment, and they all share one sound, so throttle it to avoid
        // restarting it many times in a row.
        brick.physicsImpostor.registerOnPhysicsCollide(
            tankImpostor,
            () => {
                const now = performance.now();
                if (now - lastBrickSoundTime < brickSoundCooldownMs) {
                    return;
                }

                lastBrickSoundTime = now;
                _this.brickSound.play();
            }
        );

        const physicsBody = brick.physicsImpostor.physicsBody;
        if (physicsBody) {
            physicsBody.linearDamping = 0.95;
        }
    }

    function getGroundHeight(x: number, fallbackY: number, z: number): number {
        const rayOrigin = new BABYLON.Vector3(x, fallbackY + 200, z);
        const ray = new BABYLON.Ray(rayOrigin, BABYLON.Vector3.Down(), 400);
        const hit = _this.scene.pickWithRay(ray, (mesh) => mesh.isEnabled() && mesh.isVisible);

        return hit?.pickedPoint?.y ?? fallbackY;
    }
}
