export class Game {
    private runtime: { engine: unknown; scene: unknown } | null = null;

    /**
     * Constructor.
     */
    public constructor() {
        setUpPlainVersion();
        if (!supportsWebGL()) {
            // No 3D here: show the plain version instead, and don't download the game at all.
            showPlainVersion(false);
            return;
        }
        void this._bootstrap();
    }

    private async _bootstrap(): Promise<void> {
        try {
            const { GameRuntime } = await import("./game-runtime");
            this.runtime = new GameRuntime();
        } catch (error) {
            // The runtime chunk failed to load or the runtime could not start: surface it instead of
            // leaving the static "Loading scene" overlay up forever.
            console.error("Failed to start the game runtime", error);
            document.getElementById("statusTitle")?.replaceChildren("Scene failed to load");
            document.getElementById("statusMessage")?.replaceChildren(
                "Refresh the page to try again. If the problem persists, check the browser console for details.",
            );

            const overlay = document.getElementById("statusOverlay");
            if (overlay) {
                overlay.hidden = false;
                overlay.dataset.state = "error";
            }

            const retryButton = document.getElementById("statusRetryButton");
            if (retryButton) {
                retryButton.hidden = false;
                retryButton.addEventListener("click", () => window.location.reload(), { once: true });
            }
        }
    }
}

/** Whether the browser can run the 3D version (WebGL). */
function supportsWebGL(): boolean {
    try {
        const canvas = document.createElement("canvas");
        return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
        return false;
    }
}

/**
 * The plain version (in index.html): the site's content as a normal page. Buttons marked
 * data-plain="open" / "close" show and hide it.
 */
function setUpPlainVersion(): void {
    document.addEventListener("click", (event) => {
        const button = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-plain]");
        if (button?.dataset.plain === "open") {
            showPlainVersion(true);
        } else if (button?.dataset.plain === "close") {
            document.getElementById("plainVersion")?.classList.remove("is-open");
        }
    });
}

function showPlainVersion(canGoBack: boolean): void {
    const plain = document.getElementById("plainVersion");
    if (!plain) {
        return;
    }
    plain.classList.add("is-open");
    plain.scrollTop = 0;
    const back = document.getElementById("plainBackButton");
    if (back) {
        back.hidden = !canGoBack;
    }
    if (!canGoBack) {
        document.getElementById("statusOverlay")?.setAttribute("hidden", "");
    }
}
