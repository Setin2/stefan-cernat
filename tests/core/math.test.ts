import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";

import { clamp, getYaw, segmentDistanceSquared, smoothStep } from "../../src/scenes/core/math";

describe("clamp", () => {
    it("keeps values inside the range", () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(-1, 0, 10)).toBe(0);
        expect(clamp(11, 0, 10)).toBe(10);
    });
});

describe("smoothStep", () => {
    it("is 0 before the first edge, 1 after the second, and 0.5 half way", () => {
        expect(smoothStep(2, 4, 1)).toBe(0);
        expect(smoothStep(2, 4, 5)).toBe(1);
        expect(smoothStep(2, 4, 3)).toBeCloseTo(0.5);
    });

    it("eases in and out (slower near the edges than a straight line)", () => {
        expect(smoothStep(0, 1, 0.1)).toBeLessThan(0.1);
        expect(smoothStep(0, 1, 0.9)).toBeGreaterThan(0.9);
    });
});

describe("getYaw", () => {
    it("reads the yaw from Euler angles", () => {
        const mesh = { rotationQuaternion: null, rotation: new Vector3(0, 1.2, 0) };
        expect(getYaw(mesh as never)).toBeCloseTo(1.2);
    });

    it("reads the yaw from a rotation quaternion", () => {
        const mesh = { rotationQuaternion: Quaternion.RotationYawPitchRoll(-2, 0, 0), rotation: Vector3.Zero() };
        expect(getYaw(mesh as never)).toBeCloseTo(-2);
    });
});

describe("segmentDistanceSquared", () => {
    const start = new Vector3(0, 0, 0);
    const end = new Vector3(10, 0, 0);

    it("measures straight across to the middle of the segment", () => {
        expect(segmentDistanceSquared(start, end, new Vector3(5, 3, 0))).toBeCloseTo(9);
    });

    it("measures to the nearest end beyond either end", () => {
        expect(segmentDistanceSquared(start, end, new Vector3(-3, 0, 4))).toBeCloseTo(25);
        expect(segmentDistanceSquared(start, end, new Vector3(13, 4, 0))).toBeCloseTo(25);
    });

    it("treats a zero-length segment as a point", () => {
        expect(segmentDistanceSquared(start, start, new Vector3(1, 2, 2))).toBeCloseTo(9);
    });
});
