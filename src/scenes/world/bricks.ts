import * as BABYLON from "@babylonjs/core";

import { createRoundedBox, createTemplate, createToyMaterial } from "../core/toyStyle";

type BrickContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
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
    brickImpostors.length = 0;
    context.scene.onDisposeObservable.addOnce(() => {
        brickImpostors.length = 0;
    });
    for (const build of BRICK_BUILDS) {
        instantiateBricks(context, build.x, 8, build.z, build.rows, build.rotationY);
    }
    keepBricksCalm(context.scene, context.tank);
}

type BrickBody = {
    sleepState: number;
    wakeUp: () => void;
    position: { x: number; z: number };
    velocity: { length: () => number; scale: (factor: number, target: unknown) => void };
};

/** Bricks within this distance of the tank are kept awake (the tank is 12 wide). */
const WAKE_DISTANCE = 16;
/** Above anything natural: the tank drives at 38, and a brick falling off a wall reaches ~34. */
const MAX_BRICK_SPEED = 50;

/**
 * Resting bricks fall asleep, and cannon.js treats a sleeping body as immovable for the step in
 * which something first touches it. The tank (whose speed is forced every frame) then drives into
 * bricks that can't move, and once they wake, the solver pushes them apart violently, sometimes
 * shooting a brick off at well over 100 units/s. So bricks near the tank are woken up before it
 * reaches them, and as a safety net brick speeds are capped after every physics step.
 */
function keepBricksCalm(scene: BABYLON.Scene, tank: BABYLON.AbstractMesh): void {
    const SLEEPING = 2;
    const allBodies = brickImpostors
        .map((impostor) => impostor.physicsBody as BrickBody | null)
        .filter((body): body is BrickBody => !!body);

    const wakeObserver = scene.onBeforePhysicsObservable.add(() => {
        const x = tank.position.x;
        const z = tank.position.z;
        for (const body of allBodies) {
            if (body.sleepState === SLEEPING && Math.abs(body.position.x - x) < WAKE_DISTANCE && Math.abs(body.position.z - z) < WAKE_DISTANCE) {
                body.wakeUp();
            }
        }
    });

    const world = (scene.getPhysicsEngine()?.getPhysicsPlugin() as unknown as { world?: { addEventListener: (event: string, listener: () => void) => void; removeEventListener: (event: string, listener: () => void) => void } } | undefined)?.world;
    const capSpeeds = () => {
        for (const body of allBodies) {
            if (body.sleepState !== SLEEPING) {
                const speed = body.velocity.length();
                if (speed > MAX_BRICK_SPEED) {
                    body.velocity.scale(MAX_BRICK_SPEED / speed, body.velocity);
                }
            }
        }
    };
    world?.addEventListener("postStep", capSpeeds);

    scene.onDisposeObservable.addOnce(() => {
        scene.onBeforePhysicsObservable.remove(wakeObserver);
        world?.removeEventListener("postStep", capSpeeds);
    });
}

/**
 * Toy-block physics: grippy against each other and the ground (so stacks stand and knocked
 * bricks tumble and stop instead of skating away), barely bouncy, and only lightly damped so
 * they fall at full speed.
 */
const BRICK_PHYSICS = { mass: 2, friction: 0.8, restitution: 0.1 };
const BRICK_LINEAR_DAMPING = 0.1;
const BRICK_ANGULAR_DAMPING = 0.2;

/** Every brick's physics body (see keepBricksCalm). Their sounds are in audio/impactSounds.ts. */
const brickImpostors: BABYLON.PhysicsImpostor[] = [];

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
    const brickScaleFactor = 1.1;
    const brickLength = 6 * brickScaleFactor;
    const brickDepth = 3 * brickScaleFactor;
    const brickHeight = brickLength * 0.5 * brickScaleFactor;
    const groundY = getGroundHeight(x, y, z);
    const initialY = groundY + brickHeight / 2;

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
            positionBrick(brickInstance, localX, localY, 0);
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
    function positionBrick(brick: BABYLON.Mesh | BABYLON.InstancedMesh, x: number, y: number, z: number): void {
        brick.position.set(x, y, z);
        const impostor = new BABYLON.PhysicsImpostor(brick, BABYLON.PhysicsImpostor.BoxImpostor, BRICK_PHYSICS, _this.scene);
        brickImpostors.push(impostor);

        const body = impostor.physicsBody as { linearDamping: number; angularDamping: number; sleep: () => void } | null;
        if (body) {
            body.linearDamping = BRICK_LINEAR_DAMPING;
            body.angularDamping = BRICK_ANGULAR_DAMPING;
            // Walls are built resting on the ground, so they start asleep: no settling jitter on
            // load, and no simulation cost until the tank or a shot wakes them up.
            body.sleep();
        }
    }

    function getGroundHeight(x: number, fallbackY: number, z: number): number {
        const rayOrigin = new BABYLON.Vector3(x, fallbackY + 200, z);
        const ray = new BABYLON.Ray(rayOrigin, BABYLON.Vector3.Down(), 400);
        const hit = _this.scene.pickWithRay(ray, (mesh) => mesh.isEnabled() && mesh.isVisible);

        return hit?.pickedPoint?.y ?? fallbackY;
    }
}
