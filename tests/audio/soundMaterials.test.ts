import { getSoundMaterial, isSurface, setSoundMaterial } from "../../src/scenes/audio/soundMaterials";

describe("sound materials", () => {
    it("remembers what each body sounds like", () => {
        const brick = {};
        const ball = {};
        setSoundMaterial(brick, "brick");
        setSoundMaterial(ball, "ball");
        expect(getSoundMaterial(brick)).toBe("brick");
        expect(getSoundMaterial(ball)).toBe("ball");
        expect(getSoundMaterial({})).toBeUndefined();
    });

    it("tells scenery apart from things that move", () => {
        for (const surface of ["ground", "trunk", "bush", "rock", "post", "ramp", "solid", "static"] as const) {
            expect(isSurface(surface)).toBe(true);
        }
        for (const loose of ["brick", "ball", "cone", "trophy", "tank"] as const) {
            expect(isSurface(loose)).toBe(false);
        }
    });
});
