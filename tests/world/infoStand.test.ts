import { drawInfoText, wrapText } from "../../src/scenes/world/infoStand";

/** A canvas context where every character is 10 px wide at any font size (records what's drawn). */
function fakeContext() {
    const drawn: { text: string; x: number; y: number; font: string }[] = [];
    const context = {
        font: "",
        fillStyle: "",
        measureText: (text: string) => {
            const size = Number(/(\d+)px/.exec(context.font)?.[1] ?? 10);
            return { width: text.length * size * 0.5 };
        },
        fillText: (text: string, x: number, y: number) => drawn.push({ text, x, y, font: context.font }),
    };
    return { context: context as unknown as CanvasRenderingContext2D, drawn, raw: context };
}

describe("wrapText", () => {
    it("breaks between words so no line is wider than the limit", () => {
        const { context, raw } = fakeContext();
        raw.font = "20px x";
        // 10 px per character.
        const lines = wrapText(context, "the quick brown fox jumps over the lazy dog", 100);
        expect(lines).toEqual(["the quick", "brown fox", "jumps over", "the lazy", "dog"]);
        for (const line of lines) {
            expect(context.measureText(line).width).toBeLessThanOrEqual(100);
        }
    });

    it("keeps a word longer than the limit on its own line instead of looping", () => {
        const { context, raw } = fakeContext();
        raw.font = "20px x";
        expect(wrapText(context, "a supercalifragilistic word", 100)).toEqual(["a", "supercalifragilistic", "word"]);
    });
});

describe("drawInfoText", () => {
    const text = {
        eyebrow: "MY WORK",
        eyebrowColor: "pink",
        title: "Quantum-Inspired Trading",
        titleColor: "navy",
        body: "I build software for financial trading.",
        bodyColor: "grey",
        maxWidth: 600,
    };

    it("draws the eyebrow, the title and the wrapped body, and says where it ended", () => {
        const { context, drawn } = fakeContext();
        const bottom = drawInfoText(context, "Nunito", text);
        // The body is 40 px (20 px per character here): 30 characters fit in 600 px.
        expect(drawn.map((d) => d.text)).toEqual(["MY WORK", "Quantum-Inspired Trading", "I build software for financial", "trading."]);
        expect(bottom).toBe(262 + (2 * 52));
    });

    it("shrinks a long title until it fits", () => {
        const { context, drawn } = fakeContext();
        drawInfoText(context, "Nunito", text);
        const title = drawn[1];
        const size = Number(/(\d+)px/.exec(title.font)?.[1]);
        expect(size).toBeLessThan(74);
        expect(title.text.length * size * 0.5).toBeLessThanOrEqual(text.maxWidth + 120);
    });

    it("keeps a short title at full size", () => {
        const { context, drawn } = fakeContext();
        drawInfoText(context, "Nunito", { ...text, title: "Short" });
        expect(drawn[1].font).toContain("74px");
    });
});
