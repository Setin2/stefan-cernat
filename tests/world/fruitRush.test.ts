import { createFruitRush, createFruitRushButton } from "../../src/scenes/world/fruitRush";
import { createMinigameTest } from "../helpers/minigame";

/** Where the fruit lands (see FIELD in fruitRush.ts). */
const FIELD = { x: -118, z: 14 };

async function setup() {
    const test = createMinigameTest();
    const button = createFruitRushButton(test.scene);
    test.tank.position.set(FIELD.x, 5.6, FIELD.z);
    await createFruitRush(test.context, button);
    const fruitInFlight = () => test.scene.meshes.filter((mesh) => /^fruit-rush-(apple|orange|pear|golden)-\d+$/.test(mesh.name)).length;
    return { ...test, shoot: () => button.onHit.notifyObservers(), fruitInFlight };
}

describe("Fruit Rush", () => {
    beforeEach(() => window.localStorage.clear());
    afterEach(() => jest.restoreAllMocks());

    it("starts throwing fruit when PLAY is shot", async () => {
        const { shoot, advance, fruitInFlight, soundsPlayed } = await setup();
        advance(2);
        expect(fruitInFlight()).toBe(0);
        shoot();
        expect(soundsPlayed()).toEqual(["start"]);
        advance(3);
        expect(fruitInFlight()).toBeGreaterThan(0);
    });

    it("collects fruit the tank drives into, and saves the score when time is up", async () => {
        const { shoot, advance, sounds, soundsPlayed, fruitInFlight } = await setup();
        shoot();
        advance(41);
        // Parked in the middle of the field, it catches whatever lands close by.
        expect(sounds.pickup).toHaveBeenCalled();
        expect(soundsPlayed()).toContain("end");
        expect(Number(window.localStorage.getItem("fruit-rush-best"))).toBeGreaterThan(0);
        // Leftover fruit is cleared away.
        expect(fruitInFlight()).toBe(0);
    });

    it("lets fruit nobody collects spoil away", async () => {
        const { scene, shoot, advance, tank, sounds, fruitInFlight } = await setup();
        let thrown = 0;
        scene.onNewMeshAddedObservable.add((mesh) => {
            thrown += mesh.name.startsWith("fruit-rush-") ? 1 : 0;
        });
        // Just outside the field: close enough to keep playing, too far to catch anything.
        tank.position.x = FIELD.x + 30;
        shoot();
        advance(20);
        expect(sounds.pickup).not.toHaveBeenCalled();
        expect(thrown).toBeGreaterThan(25);
        // Each lasts about 7 s once down, so most of what was thrown is gone again.
        expect(fruitInFlight()).toBeLessThan(thrown / 2);
        expect(fruitInFlight()).toBeGreaterThan(0);
    });

    it("calls the round off when the tank drives away", async () => {
        const { shoot, advance, tank, soundsPlayed, fruitInFlight } = await setup();
        shoot();
        advance(3);
        tank.position.x = FIELD.x + 200;
        advance(3);
        expect(fruitInFlight()).toBe(0);
        expect(soundsPlayed()).not.toContain("end");
        expect(window.localStorage.getItem("fruit-rush-best")).toBeNull();
    });
});
