import { formatClock, loadBest, saveBest } from "../../src/scenes/world/minigameScores";

describe("formatClock", () => {
    it("rounds up to whole seconds and never goes negative", () => {
        expect(formatClock(45)).toBe("0:45");
        expect(formatClock(6.2)).toBe("0:07");
        expect(formatClock(0.01)).toBe("0:01");
        expect(formatClock(-3)).toBe("0:00");
        expect(formatClock(75)).toBe("1:15");
    });
});

describe("best scores", () => {
    beforeEach(() => window.localStorage.clear());
    afterEach(() => jest.restoreAllMocks());

    it("is null until something is saved, then remembers it (rounded)", () => {
        expect(loadBest("test-best")).toBeNull();
        saveBest("test-best", 1240.6);
        expect(loadBest("test-best")).toBe(1241);
    });

    it("keeps games' scores apart", () => {
        saveBest("a", 1);
        saveBest("b", 2);
        expect(loadBest("a")).toBe(1);
        expect(loadBest("b")).toBe(2);
    });

    it("ignores a corrupted value", () => {
        window.localStorage.setItem("test-best", "not a number");
        expect(loadBest("test-best")).toBeNull();
    });

    it("works without storage (private mode, blocked cookies)", () => {
        jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        expect(() => saveBest("test-best", 5)).not.toThrow();
        expect(loadBest("test-best")).toBeNull();
    });
});
