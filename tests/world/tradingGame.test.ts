import { createTradingGame } from "../../src/scenes/world/tradingGame";
import { createWorkCorner, type WorkCorner } from "../../src/scenes/world/workCorner";
import { createMinigameTest } from "../helpers/minigame";

async function setup() {
    const test = createMinigameTest();
    const corner = createWorkCorner(test.scene) as WorkCorner;
    test.tank.position.set(corner.center.x, 5.6, corner.center.z);
    await createTradingGame(test.context, corner);
    const screen = test.scene.getMeshByName("work-screen")!;
    const shoot = (button: "buy" | "sell") => corner.buttons[button].onHit.notifyObservers();
    return { ...test, corner, screen, shoot };
}

describe("Quantum Trader", () => {
    beforeEach(() => window.localStorage.clear());
    afterEach(() => jest.restoreAllMocks());

    it("builds the work corner with its buttons, board and core", async () => {
        const { scene, screen } = await setup();
        expect(scene.getMeshByName("work-button-buy-face")).not.toBeNull();
        expect(scene.getMeshByName("work-button-sell-face")).not.toBeNull();
        expect(scene.getMeshByName("work-core-sphere")).not.toBeNull();
        // The live screen only shows during a round.
        expect(screen.isEnabled()).toBe(false);
    });

    it("starts a round when a button is shot, and trades on the next shots", async () => {
        const { shoot, advance, screen, soundsPlayed } = await setup();
        shoot("buy");
        expect(soundsPlayed()).toEqual(["start"]);
        expect(screen.isEnabled()).toBe(true);

        advance(1);
        shoot("buy");
        advance(2);
        shoot("sell");
        const played = soundsPlayed();
        expect(played[1]).toBe("buy");
        expect(["profit", "loss"]).toContain(played[2]);
    });

    it("ignores a shot bouncing off a button and hitting it again straight away", async () => {
        const { shoot, advance, soundsPlayed } = await setup();
        shoot("buy");
        advance(1);
        shoot("sell");
        advance(0.1);
        shoot("sell");
        expect(soundsPlayed()).toEqual(["start", "sell"]);
    });

    it("ends after 45 seconds, remembers the best result, then goes back to the 3D chart", async () => {
        const { shoot, advance, screen, soundsPlayed } = await setup();
        shoot("buy");
        advance(1);
        shoot("buy");
        advance(45);
        expect(soundsPlayed()).toContain("end");
        expect(window.localStorage.getItem("quantum-trader-best")).not.toBeNull();
        // The results stay up for a while.
        expect(screen.isEnabled()).toBe(true);
        advance(9);
        expect(screen.isEnabled()).toBe(false);
    });

    it("calls the round off a couple of seconds after the tank leaves", async () => {
        const { shoot, advance, screen, tank, corner, soundsPlayed } = await setup();
        shoot("buy");
        advance(1);
        tank.position.x = corner.center.x + 100;
        advance(1);
        // Still in the grace period.
        expect(screen.isEnabled()).toBe(true);
        advance(1.5);
        expect(screen.isEnabled()).toBe(false);
        expect(soundsPlayed()).not.toContain("end");
        expect(window.localStorage.getItem("quantum-trader-best")).toBeNull();
    });

    it("lights the quantum core up with its forecasts during a round", async () => {
        const { shoot, advance, scene } = await setup();
        const core = scene.getMeshByName("work-core-sphere")!.material as unknown as { emissiveColor: { r: number; g: number; b: number } };
        const idle = { ...core.emissiveColor };
        shoot("buy");
        let changed = false;
        for (let i = 0; i < 20 && !changed; i++) {
            advance(1);
            changed = Math.abs(core.emissiveColor.g - idle.g) > 0.02 || Math.abs(core.emissiveColor.r - idle.r) > 0.02;
        }
        expect(changed).toBe(true);
    });
});
