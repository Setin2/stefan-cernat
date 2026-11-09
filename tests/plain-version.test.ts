import { Game } from "../src/index";

/** The parts of index.html the plain version uses. */
const PAGE = `
    <div id="statusOverlay"><button data-plain="open" id="open">Skip the game: plain version</button></div>
    <main id="plainVersion" class="plain">
        <h1>Stefan Cernat</h1>
        <button data-plain="close" id="plainBackButton">Back to the 3D version</button>
    </main>`;

describe("plain version", () => {
    let getContext: jest.SpyInstance;

    beforeEach(() => {
        document.body.innerHTML = PAGE;
        // No WebGL in this browser.
        getContext = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("is shown instead of the game when the browser can't run WebGL, without a way back", () => {
        new Game();
        const plain = document.getElementById("plainVersion")!;
        expect(plain.classList.contains("is-open")).toBe(true);
        expect(document.getElementById("plainBackButton")!.hidden).toBe(true);
        expect(document.getElementById("statusOverlay")!.hasAttribute("hidden")).toBe(true);
        expect(getContext).toHaveBeenCalled();
    });

    it("opens and closes from its buttons", () => {
        new Game();
        const plain = document.getElementById("plainVersion")!;
        plain.classList.remove("is-open");
        document.getElementById("open")!.click();
        expect(plain.classList.contains("is-open")).toBe(true);
        document.getElementById("plainBackButton")!.click();
        expect(plain.classList.contains("is-open")).toBe(false);
    });
});
