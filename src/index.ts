export class Game {
    private runtime: { engine: unknown; scene: unknown } | null = null;

    /**
     * Constructor.
     */
    public constructor() {
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
