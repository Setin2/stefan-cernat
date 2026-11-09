import { canCollect, FLIGHT, launchVelocity, spoilage, stepFruit, type FlyingFruit } from "../../src/scenes/world/fruitFlight";

const REST_Y = 1;
const DT = 1 / 240;

function throwFruit(from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }, seconds: number): FlyingFruit {
    return { position: { ...from }, velocity: launchVelocity(from, to, seconds), groundTime: -1 };
}

describe("launchVelocity", () => {
    it("lands the fruit on the chosen spot after the chosen time", () => {
        const from = { x: -96, y: 20, z: -6 };
        const to = { x: -118, y: REST_Y, z: 14 };
        const fruit = throwFruit(from, to, 1.4);
        let time = 0;
        while (fruit.groundTime < 0) {
            stepFruit(fruit, DT, REST_Y);
            time += DT;
        }
        expect(time).toBeCloseTo(1.4, 1);
        // Where it first touched down (it has only just started to bounce).
        expect(Math.hypot(fruit.position.x - to.x, fruit.position.z - to.z)).toBeLessThan(0.6);
    });

    it("throws upwards first when the target is level with the start", () => {
        const velocity = launchVelocity({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, 1);
        expect(velocity.x).toBeCloseTo(10);
        expect(velocity.y).toBeCloseTo(FLIGHT.gravity / 2);
    });
});

describe("stepFruit", () => {
    it("bounces lower each time and comes to rest on the ground", () => {
        const fruit = throwFruit({ x: 0, y: 20, z: 0 }, { x: 10, y: REST_Y, z: 0 }, 1.2);
        const peaks: number[] = [];
        let rising = false;
        let peak = 0;
        for (let i = 0; i < 4 / DT; i++) {
            stepFruit(fruit, DT, REST_Y);
            if (fruit.groundTime < 0) {
                continue;
            }
            if (fruit.velocity.y > 0) {
                rising = true;
                peak = Math.max(peak, fruit.position.y);
            } else if (rising) {
                peaks.push(peak);
                rising = false;
                peak = 0;
            }
            expect(fruit.position.y).toBeGreaterThanOrEqual(REST_Y);
        }
        expect(peaks.length).toBeGreaterThanOrEqual(1);
        for (let i = 1; i < peaks.length; i++) {
            expect(peaks[i]).toBeLessThan(peaks[i - 1]);
        }
        expect(fruit.position.y).toBe(REST_Y);
        expect(Math.hypot(fruit.velocity.x, fruit.velocity.z)).toBeLessThan(0.1);
    });

    it("stays fresh for its lifetime on the ground, then spoils away", () => {
        const fruit: FlyingFruit = { position: { x: 0, y: REST_Y, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, groundTime: -1 };
        let spoil = 0;
        let time = 0;
        while (spoil < 1 && time < 20) {
            spoil = stepFruit(fruit, 0.05, REST_Y);
            time += 0.05;
            if (time < FLIGHT.lifetime - 0.1) {
                expect(spoil).toBe(0);
            }
        }
        expect(time).toBeCloseTo(FLIGHT.lifetime + FLIGHT.spoilSeconds, 1);
    });
});

describe("spoilage", () => {
    it("ramps from 0 to 1 after the lifetime", () => {
        expect(spoilage(-1)).toBe(0);
        expect(spoilage(FLIGHT.lifetime)).toBe(0);
        expect(spoilage(FLIGHT.lifetime + (FLIGHT.spoilSeconds / 2))).toBeCloseTo(0.5);
        expect(spoilage(FLIGHT.lifetime + 10)).toBe(1);
    });
});

describe("canCollect", () => {
    it("picks up fruit near the tank, but not fruit flying overhead or far away", () => {
        expect(canCollect({ x: 3, y: REST_Y, z: 4 }, 0, 0, REST_Y, 7.5)).toBe(true);
        expect(canCollect({ x: 3, y: REST_Y + 10, z: 4 }, 0, 0, REST_Y, 7.5)).toBe(false);
        expect(canCollect({ x: 8, y: REST_Y, z: 0 }, 0, 0, REST_Y, 7.5)).toBe(false);
    });
});
