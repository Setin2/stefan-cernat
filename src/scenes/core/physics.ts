import * as BABYLON from "@babylonjs/core";

import { collideWithRamps } from "../world/playground";

/** cannon.js internals reached through Babylon's (legacy) cannon plugin. */
type CannonPlugin = {
    world?: { allowSleep: boolean; broadphase: unknown };
    BJSCANNON?: { SAPBroadphase?: new (world: unknown) => unknown };
};

const GRAVITY = new BABYLON.Vector3(0, -40, 0);
const MAX_SUB_STEP_SECONDS = 1 / 120;
/** cannon.js Body.SLEEPING */
const SLEEPING = 2;

/**
 * Turns on physics and tunes cannon.js for this scene:
 *
 * - Performance: resting bodies (bricks, trophies, spent shots) fall asleep and stop being
 *   simulated until something hits them, and the broadphase sorts bodies along an axis instead
 *   of testing every pair against every other. The tank never sleeps, since it's moved by
 *   setting its velocity.
 * - Stability: by default Babylon advances cannon.js with one step per frame, sized to the frame
 *   time. At 60 fps a shot (200 units/s) moves ~3.3 units per step, about the thickness of a
 *   brick, so it can pass straight through; at lower frame rates it gets worse. Splitting each
 *   frame into equal sub-steps of at most 1/120s keeps the simulation stable at any frame rate
 *   while still advancing exactly the frame's time, so motion stays smooth.
 */
export function enablePhysics(scene: BABYLON.Scene): void {
    scene.enablePhysics();
    scene.getPhysicsEngine()?.setGravity(GRAVITY);
    const plugin = scene.getPhysicsEngine()?.getPhysicsPlugin();
    if (!plugin) {
        return;
    }

    const cannonPlugin = plugin as unknown as CannonPlugin;
    const world = cannonPlugin.world;
    if (world) {
        world.allowSleep = true;
        const SAPBroadphase = cannonPlugin.BJSCANNON?.SAPBroadphase;
        if (SAPBroadphase) {
            world.broadphase = new SAPBroadphase(world);
        }
    }

    const executeStep = plugin.executeStep.bind(plugin);
    plugin.executeStep = (delta, impostors) => {
        const subSteps = Math.max(1, Math.ceil(delta / MAX_SUB_STEP_SECONDS - 1e-6));
        const subStepSeconds = delta / subSteps;
        for (let i = 0; i < subSteps; i++) {
            executeStep(subStepSeconds, impostors);
        }
    };
}

/**
 * Gives the tank holder its physics body. Movement sets the tank's velocity every frame, so
 * linear damping isn't needed; strong angular damping keeps knocks from bricks from spinning it
 * between frames.
 */
export function createTankBody(scene: BABYLON.Scene, tank: BABYLON.AbstractMesh): void {
    tank.physicsImpostor = new BABYLON.PhysicsImpostor(tank, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1000, restitution: 0 }, scene);
    const body = tank.physicsImpostor.physicsBody as { angularDamping: number; allowSleep: boolean } | null;
    if (body) {
        body.angularDamping = 0.98;
        body.allowSleep = false;
    }
}

/**
 * Run once every loose object exists. Babylon copies every physics body's transform to its mesh
 * (and back) on every physics step. Bodies that cannon.js has put to sleep (settled bricks,
 * cones, trophies) don't move, so that work is skipped for them until something wakes them up.
 * Loose objects also land on and bump into the ramps here (the tank rides them instead).
 */
export function prepareLooseBodies(scene: BABYLON.Scene, tank: BABYLON.AbstractMesh): void {
    for (const impostor of scene.getPhysicsEngine()?.getImpostors() ?? []) {
        const body = impostor.physicsBody as { sleepState?: number } | null;
        if (!body || impostor.mass === 0 || impostor.object === tank) {
            continue;
        }
        collideWithRamps(impostor);
        const beforeStep = impostor.beforeStep;
        const afterStep = impostor.afterStep;
        // The two always run as a pair (a body can fall asleep during the step).
        let synced = false;
        impostor.beforeStep = () => {
            synced = body.sleepState !== SLEEPING;
            if (synced) {
                beforeStep();
            }
        };
        impostor.afterStep = () => {
            if (synced) {
                afterStep();
            }
        };
    }
}
