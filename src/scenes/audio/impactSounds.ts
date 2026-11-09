import * as BABYLON from "../babylon";

import type { SoundBoard } from "./soundBoard";
import { getSoundMaterial, isSurface, setSoundMaterial, type SoundMaterial } from "./soundMaterials";

/**
 * Plays a sound whenever two physics bodies hit each other. cannon.js fires a "collide" event on
 * both bodies when they first touch (not while they rest on each other), with the contact's
 * impact speed, so resting objects stay quiet and every new hit is as loud as it was hard.
 */

type CannonVec3 = { x: number; y: number; z: number };
type CannonContact = {
    bi: CannonBody;
    bj: CannonBody;
    ri: CannonVec3;
    getImpactVelocityAlongNormal: () => number;
};
type CannonBody = {
    id: number;
    world?: { stepnumber: number } | null;
    position: CannonVec3;
    addEventListener: (type: string, listener: (event: { contact: CannonContact }) => void) => void;
};

export type ImpactSounds = {
    /** Makes a physics body play impact sounds as `material` (for bodies created later, like shots). */
    track: (impostor: BABYLON.PhysicsImpostor | null | undefined, material: SoundMaterial) => void;
};

export function createImpactSounds(scene: BABYLON.Scene, sounds: SoundBoard, tank: BABYLON.AbstractMesh): ImpactSounds {
    const position = new BABYLON.Vector3();
    // Pairs of bodies already played this physics step. Both bodies get the event for each
    // contact, and a box landing flat touches down at up to four corners at once (one contact
    // each): it's still one hit.
    const playedThisStep = new Set<string>();
    let step = -1;

    const onCollide = (event: { contact: CannonContact }) => {
        const contact = event.contact;
        const currentStep = contact.bi.world?.stepnumber ?? contact.bj.world?.stepnumber ?? 0;
        if (currentStep !== step) {
            step = currentStep;
            playedThisStep.clear();
        }
        const pair = contact.bi.id < contact.bj.id ? `${contact.bi.id}:${contact.bj.id}` : `${contact.bj.id}:${contact.bi.id}`;
        if (playedThisStep.has(pair)) {
            return;
        }
        playedThisStep.add(pair);
        const a = getSoundMaterial(contact.bi) ?? "static";
        const b = getSoundMaterial(contact.bj) ?? "static";
        position.set(contact.bi.position.x + contact.ri.x, contact.bi.position.y + contact.ri.y, contact.bi.position.z + contact.ri.z);
        sounds.impact(a, b, Math.abs(contact.getImpactVelocityAlongNormal()), position);
    };

    const listening = new WeakSet<object>();
    const track = (impostor: BABYLON.PhysicsImpostor | null | undefined, material: SoundMaterial) => {
        const body = impostor?.physicsBody as CannonBody | null | undefined;
        if (!body) {
            return;
        }
        setSoundMaterial(body, material);
        // Scenery never moves into anything, so it only needs a material: whatever hits it plays.
        if (!isSurface(material) && !listening.has(body)) {
            listening.add(body);
            body.addEventListener("collide", onCollide);
        }
    };

    // Everything with a physics body in the scene so far, by what it is.
    const engine = scene.getPhysicsEngine();
    const ground = scene.getMeshByName("ground");
    track(ground && (ground.physicsImpostor ?? engine?.getImpostorForPhysicsObject(ground)), "ground");
    track(tank.physicsImpostor, "tank");
    for (const impostor of engine?.getImpostors() ?? []) {
        const material = materialFor((impostor.object as { name?: string }).name ?? "", impostor.mass === 0 && impostor.object !== ground);
        if (material) {
            track(impostor, material);
        }
    }

    return { track };
}

/** What a body from the scene sounds like, by its name; `isProp` for other static bodies. */
function materialFor(name: string, isProp: boolean): SoundMaterial | null {
    if (name.startsWith("brick")) {
        return "brick";
    }
    if (name.startsWith("cone-")) {
        return "cone";
    }
    if (name.endsWith("-collider")) {
        return "trophy";
    }
    // Big props imported with the scene (the desk, the sword and symbol).
    return isProp ? "solid" : null;
}
