export class Game {
    private runtime: { engine: unknown; scene: unknown } | null = null;

    /**
     * Constructor.
     */
    public constructor() {
        void this._bootstrap();
    }

    private async _bootstrap(): Promise<void> {
        const { GameRuntime } = await import("./game-runtime");
        this.runtime = new GameRuntime();
    }
}
