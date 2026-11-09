import * as BABYLON from "@babylonjs/core";

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
    position: CannonVec3;
    addEventListener: (type: string, listener: (event: { contact: CannonContact }) => void) => void;
};

export type ImpactSounds = {
    /** Makes a physics body play impact sounds as `material` (for bodies created later, like shots). */
    track: (impostor: BABYLON.PhysicsImpostor | null | undefined, material: SoundMaterial) => void;
};

export function createImpactSounds(scene: BABYLON.Scene, sounds: SoundBoard, tank: BABYLON.AbstractMesh): ImpactSounds {
    const position = new BABYLON.Vector3();
    let lastContact: CannonContact | null = null;

    // Both bodies get the event for the same contact, one right after the other: play it once.
    const onCollide = (event: { contact: CannonContact }) => {
        const contact = event.contact;
        if (contact === lastContact) {
            return;
        }
        lastContact = contact;
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
        const name = (impostor.object as { name?: string }).name ?? "";
        const material: SoundMaterial | null = name.startsWith("brick") ? "brick"
            : name.startsWith("cone-") ? "cone"
            : name.endsWith("-collider") ? "trophy"
            // Big props imported with the scene (the desk, the sword and symbol).
            : impostor.mass === 0 && impostor.object !== ground ? "solid"
            : null;
        if (material) {
            track(impostor, material);
        }
    }

    return { track };
}
