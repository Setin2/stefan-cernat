import { createTankInput } from "../../src/scenes/tank/input";
import { createTouchControls } from "../../src/scenes/ui/touchControls";

/** jsdom has no PointerEvent: a mouse event with a pointer id does the same job here. */
function pointer(target: Element, type: string, x: number, y: number, pointerId = 1): void {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
    Object.defineProperty(event, "pointerId", { value: pointerId });
    target.dispatchEvent(event);
}

function setTouchScreen(touch: boolean): void {
    window.matchMedia = ((query: string) => ({ matches: touch && query.includes("coarse") })) as unknown as typeof window.matchMedia;
}

describe("touch controls", () => {
    // The stick is 132 px wide at (0, 0) here, so its centre is (66, 66); the knob moves up to 46 px.
    const CENTRE = 66;

    beforeEach(() => {
        Element.prototype.setPointerCapture = jest.fn();
        Element.prototype.getBoundingClientRect = function () {
            return { left: 0, top: 0, width: 132, height: 132, right: 132, bottom: 132, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
        };
    });

    function setup(touch = true) {
        setTouchScreen(touch);
        const input = createTankInput();
        const controls = createTouchControls(input);
        const root = document.querySelector(".touch-controls") as HTMLElement;
        const stick = document.querySelector(".touch-stick")!;
        const fire = document.querySelector(".touch-fire")!;
        return { input, controls, root, stick, fire };
    }

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("drives forwards when the stick is pushed up, and turns when it's pushed sideways", () => {
        const { input, stick } = setup();
        pointer(stick, "pointerdown", CENTRE, CENTRE - 46);
        expect(input.move).toBeCloseTo(1);
        expect(input.turn).toBeCloseTo(0);
        pointer(stick, "pointermove", CENTRE + 46, CENTRE);
        expect(input.move).toBeCloseTo(0);
        expect(input.turn).toBeCloseTo(1);
        // Down reverses; beyond the edge it stays at full.
        pointer(stick, "pointermove", CENTRE, CENTRE + 200);
        expect(input.move).toBeCloseTo(-1);
    });

    it("drives slower with a small push, and ignores a tiny one", () => {
        const { input, stick } = setup();
        pointer(stick, "pointerdown", CENTRE, CENTRE - 23);
        expect(input.move).toBeGreaterThan(0.3);
        expect(input.move).toBeLessThan(0.7);
        pointer(stick, "pointermove", CENTRE + 4, CENTRE - 4);
        expect(input.move).toBe(0);
        expect(input.turn).toBe(0);
    });

    it("stops when the finger lifts", () => {
        const { input, stick } = setup();
        pointer(stick, "pointerdown", CENTRE, CENTRE - 46);
        pointer(stick, "pointerup", CENTRE, CENTRE - 46);
        expect(input.move).toBe(0);
        expect(input.turn).toBe(0);
    });

    it("ignores other fingers moving over the stick", () => {
        const { input, stick } = setup();
        pointer(stick, "pointerdown", CENTRE, CENTRE - 46, 1);
        pointer(stick, "pointermove", CENTRE + 46, CENTRE, 2);
        expect(input.move).toBeCloseTo(1);
        pointer(stick, "pointerup", CENTRE, CENTRE, 2);
        expect(input.move).toBeCloseTo(1);
    });

    it("fires once per tap of FIRE", () => {
        const { input, fire } = setup();
        const onFire = jest.fn();
        input.onFire.add(onFire);
        pointer(fire, "pointerdown", 0, 0);
        pointer(fire, "pointerup", 0, 0);
        pointer(fire, "pointerdown", 0, 0);
        expect(onFire).toHaveBeenCalledTimes(2);
    });

    it("shows straight away on touch screens, and on others once the screen is touched", () => {
        expect(setup(true).root.hidden).toBe(false);
        document.body.innerHTML = "";
        const { root } = setup(false);
        expect(root.hidden).toBe(true);
        window.dispatchEvent(new Event("touchstart"));
        expect(root.hidden).toBe(false);
    });

    it("removes itself when disposed", () => {
        const { controls } = setup();
        controls.dispose();
        expect(document.querySelector(".touch-controls")).toBeNull();
    });
});
