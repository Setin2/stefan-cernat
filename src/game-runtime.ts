import { BabylonFileLoaderConfiguration, Engine, Scene } from "@babylonjs/core";

import { configureEngine } from "./engine-config";

export class GameRuntime {
    /**
     * Defines the engine used to draw the game using Babylon.JS and WebGL.
     */
    public engine: Engine;
    /**
     * Defines the scene used to store and draw elements in the canvas.
     */
    public scene: Scene;
    private readonly statusOverlay: HTMLElement | null;
    private readonly statusTitle: HTMLElement | null;
    private readonly statusMessage: HTMLElement | null;
    private sceneReady = false;
    private readonly renderScene = () => this.scene.render();

    public constructor() {
        const canvas = document.getElementById("renderCanvas");
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Missing #renderCanvas element.");
        }

        this.statusOverlay = document.getElementById("statusOverlay");
        this.statusTitle = document.getElementById("statusTitle");
        this.statusMessage = document.getElementById("statusMessage");

        this.engine = new Engine(canvas, true);
        configureEngine(this.engine);
        this.scene = new Scene(this.engine);

        this._setStatus("Loading scene", this._getInitialStatusMessage());
        this._bindEvents();
        void this._loadScene();
    }

    private async _loadScene(): Promise<void> {
        const rootUrl = "./scenes/_assets/";

        try {
            const [_, CANNON, { appendScene }] = await Promise.all([
                import("@babylonjs/materials"),
                import("cannon"),
                import("./scenes/tools"),
            ]);

            BabylonFileLoaderConfiguration.LoaderInjectedPhysicsEngine = CANNON;
            await appendScene(this.scene, rootUrl, "../scene/scene.babylon");

            if (!this.scene.activeCamera) {
                throw new Error("No camera defined in the scene. Please add at least one camera in the project or create one yourself in the code.");
            }

            this.scene.activeCamera.attachControl(this.engine.getRenderingCanvas(), false);
            this.sceneReady = true;
            this._hideStatus();
            this._syncRenderLoop();
        } catch (error) {
            console.error("Failed to finish scene initialization", error);
            this._setStatus(
                "Scene failed to load",
                "Refresh the page to try again. If the problem persists, check the browser console for details.",
                true,
            );
        }
    }

    private _setStatus(title: string, message: string, isError = false): void {
        this.statusTitle?.replaceChildren(title);
        this.statusMessage?.replaceChildren(message);

        if (this.statusOverlay) {
            this.statusOverlay.hidden = false;
            this.statusOverlay.dataset.state = isError ? "error" : "loading";
        }
    }

    private _hideStatus(): void {
        if (this.statusOverlay) {
            this.statusOverlay.hidden = true;
            delete this.statusOverlay.dataset.state;
        }
    }

    private _getInitialStatusMessage(): string {
        if (window.matchMedia("(pointer: coarse)").matches) {
            return "Loading assets. This scene is built around keyboard controls, so desktop works best.";
        }

        return "Loading assets and interactive scene data.";
    }

    private _syncRenderLoop(): void {
        this.engine.stopRenderLoop(this.renderScene);

        if (!this.sceneReady || document.hidden) {
            return;
        }

        this.engine.runRenderLoop(this.renderScene);
    }

    private _bindEvents(): void {
        window.addEventListener("resize", this._handleResize);
        document.addEventListener("visibilitychange", this._handleVisibilityChange);
        window.addEventListener("beforeunload", this._handleBeforeUnload);
    }

    private readonly _handleResize = (): void => {
        this.engine.resize();
    };

    private readonly _handleVisibilityChange = (): void => {
        this._syncRenderLoop();
    };

    private readonly _handleBeforeUnload = (): void => {
        window.removeEventListener("resize", this._handleResize);
        document.removeEventListener("visibilitychange", this._handleVisibilityChange);
        window.removeEventListener("beforeunload", this._handleBeforeUnload);
        this.engine.stopRenderLoop(this.renderScene);
        this.scene.dispose();
        this.engine.dispose();
    };
}
