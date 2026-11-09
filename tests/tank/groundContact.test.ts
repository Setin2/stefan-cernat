import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { createGroundContact } from "../../src/scenes/tank/groundContact";
import { getPlaygroundHeight, RAMPS } from "../../src/scenes/world/playground";

const BASE_Y = 5.6;
const DT = 1 / 60;
const kicker = RAMPS.find((ramp) => ramp.name === "stunt-kicker")!;
const landing = RAMPS.find((ramp) => ramp.name === "stunt-landing")!;

/** A stand-in for the tank holder: only its position is used. */
function createTank(x: number, z: number) {
    const tank = { position: new Vector3(x, BASE_Y, z) };
    const model = { rotation: new Vector3() } as unknown as TransformNode;
    const onLand = jest.fn();
    const contact = createGroundContact(tank as never, model, onLand);
    return { tank, model, contact, onLand };
}

/** Drives along +x (yaw PI/2) at `speed` for `seconds`. */
function driveEast(setup: ReturnType<typeof createTank>, speed: number, seconds: number, each?: () => void) {
    for (let t = 0; t < seconds; t += DT) {
        setup.tank.position.x += speed * DT;
        setup.contact.update(DT, Math.PI / 2, speed);
        each?.();
    }
}

describe("getPlaygroundHeight", () => {
    it("is 0 on open ground and rises along a ramp to its top", () => {
        expect(getPlaygroundHeight(0, 0)).toBe(0);
        // The kicker rises towards +x.
        const low = getPlaygroundHeight(kicker.x - (kicker.length / 2) + 0.5, kicker.z);
        const middle = getPlaygroundHeight(kicker.x, kicker.z);
        const high = getPlaygroundHeight(kicker.x + (kicker.length / 2) - 0.5, kicker.z);
        expect(low).toBeLessThan(middle);
        expect(middle).toBeCloseTo(kicker.height / 2);
        expect(high).toBeGreaterThan(middle);
        expect(high).toBeLessThanOrEqual(kicker.height);
    });
});

describe("createGroundContact", () => {
    it("keeps the tank level on flat ground", () => {
        const setup = createTank(0, 0);
        for (let i = 0; i < 60; i++) {
            setup.contact.update(DT, 0, 0);
        }
        expect(setup.tank.position.y).toBeCloseTo(BASE_Y);
        expect(setup.contact.isAirborne()).toBe(false);
        expect(setup.model.rotation.x).toBeCloseTo(0);
        expect(setup.model.rotation.z).toBeCloseTo(0);
    });

    it("climbs a ramp with its nose up and never sinks into it", () => {
        const setup = createTank(kicker.x - 20, kicker.z);
        let maxPitch = 0;
        driveEast(setup, 8, 2.4, () => {
            const surface = getPlaygroundHeight(setup.tank.position.x, setup.tank.position.z);
            // The centre never ends up below the surface under it.
            expect(setup.tank.position.y - BASE_Y).toBeGreaterThanOrEqual(surface - 0.05);
            maxPitch = Math.max(maxPitch, -setup.model.rotation.x);
        });
        expect(setup.tank.position.y).toBeGreaterThan(BASE_Y + 1);
        // rotation.x is minus the pitch: the nose points up the ramp.
        expect(maxPitch).toBeGreaterThan(0.1);
    });

    it("at full speed, jumps the gap from the kicker and lands once on the landing ramp", () => {
        const setup = createTank(kicker.x - 20, kicker.z);
        let wasAirborne = false;
        // 38 is the tank's top speed (movement.ts).
        driveEast(setup, 38, 2, () => {
            wasAirborne ||= setup.contact.isAirborne();
        });
        expect(wasAirborne).toBe(true);
        expect(setup.contact.isAirborne()).toBe(false);
        expect(setup.onLand).toHaveBeenCalledTimes(1);
        expect(setup.onLand.mock.calls[0][0]).toBeGreaterThan(10);
    });

    it("rests steadily when parked across the gap between the stunt ramps", () => {
        // Regression: tipping over an edge used to flicker between grounded and airborne every
        // few frames (the tank shook, and the engine and landing sounds fluttered).
        const setup = createTank(kicker.x - 20, kicker.z);
        driveEast(setup, 8, (kicker.x + 20 - setup.tank.position.x) / 8);
        for (let i = 0; i < 60; i++) {
            setup.contact.update(DT, Math.PI / 2, 0);
        }
        setup.onLand.mockClear();
        const heights: number[] = [];
        for (let i = 0; i < 120; i++) {
            setup.contact.update(DT, Math.PI / 2, 0);
            expect(setup.contact.isAirborne()).toBe(false);
            heights.push(setup.tank.position.y);
        }
        expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.01);
        expect(setup.onLand).not.toHaveBeenCalled();
    });

    it("rolls slowly over the lip of a ramp without bouncing all the way", () => {
        const setup = createTank(kicker.x - 18, kicker.z);
        driveEast(setup, 3, 38 / 3);
        // A few real drops as it tips over and its back leaves the edge, not a landing every few frames.
        expect(setup.onLand.mock.calls.length).toBeLessThan(12);
        expect(setup.contact.isAirborne()).toBe(false);
    });

    it("never sinks into a ramp, at any speed", () => {
        for (const speed of [5, 15, 25, 38]) {
            const setup = createTank(kicker.x - 20, kicker.z);
            driveEast(setup, speed, 60 / speed, () => {
                const surface = getPlaygroundHeight(setup.tank.position.x, setup.tank.position.z);
                expect(setup.tank.position.y - BASE_Y).toBeGreaterThanOrEqual(surface - 0.01);
            });
        }
    });

    it("treats the high back of a ramp as a wall, but not its gentle front", () => {
        const { contact } = createTank(0, 0);
        // The landing ramp rises towards -x, so its high back faces the kicker side: driving at
        // it from the -x side (heading +x) hits a wall once the front of the tracks reaches it.
        const backX = landing.x - (landing.length / 2);
        expect(contact.isBlocked(backX - 6.5, landing.z, Math.PI / 2, 1)).toBe(true);
        // ... and reversing into it, too.
        expect(contact.isBlocked(backX - 6.5, landing.z, -Math.PI / 2, -1)).toBe(true);
        // Driving onto the kicker from its low end is fine.
        expect(contact.isBlocked(kicker.x - (kicker.length / 2) - 6.5, kicker.z, Math.PI / 2, 1)).toBe(false);
        // Nothing to hit on open ground.
        expect(contact.isBlocked(0, 0, 0, 1)).toBe(false);
    });
});
