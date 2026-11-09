import { Engine } from "@babylonjs/core/Engines/engine";
import { BabylonFileLoaderConfiguration } from "@babylonjs/core/Loading/Plugins/babylonFileLoader";
import { Scene } from "@babylonjs/core/scene";
// The scene loader shows Babylon's loading screen hooks, so it needs them loaded first.
import "@babylonjs/core/Loading/loadingScreen";

import { configureEngine, hideDeprecatedRendererInfo } from "./engine-config";
import { warmUpShaders } from "./scenes/core/warmUp";

/**
 * How far the loading bar is after each stage of loading (0 to 1): the engine code, the scene
 * file's download, building the world. Shader compilation fills the rest.
 */
const LOADING_STAGES = { engine: 0.3, sceneFile: 0.65, world: 0.8 };
/** Roughly the scene file's size, for when the browser can't tell how big the download is. */
const SCENE_FILE_BYTES = 2.6e6;

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
    private readonly statusRetryButton: HTMLButtonElement | null;
    private readonly progress = {
        bar: document.getElementById("statusProgress"),
        fill: document.getElementById("statusProgressFill"),
        label: document.getElementById("statusProgressLabel"),
        value: document.getElementById("statusProgressValue"),
    };
    private shownProgress = 0;
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
        this.statusRetryButton = document.getElementById("statusRetryButton") as HTMLButtonElement | null;

        hideDeprecatedRendererInfo();
        // No Babylon audio: the game synthesises its sounds with its own Web Audio context.
        this.engine = new Engine(canvas, true, { audioEngine: false });
        configureEngine(this.engine);
        this.scene = new Scene(this.engine);

        this._setStatus("Loading scene", this._getInitialStatusMessage());
        // The engine itself (the biggest download) is in by now.
        this._setProgress(LOADING_STAGES.engine, "Loading the world");
        this._bindEvents();
        void this._loadScene();
    }

    private async _loadScene(): Promise<void> {
        const rootUrl = "./scenes/_assets/";

        try {
            this._hideRetryAction();

            const [CANNON, { appendScene }] = await Promise.all([
                import("cannon"),
                import("./scenes/tools"),
            ]);

            BabylonFileLoaderConfiguration.LoaderInjectedPhysicsEngine = CANNON;
            // The scene file's download, then building the world on top of it.
            await appendScene(this.scene, rootUrl, "../scene/scene.babylon", (event) => {
                const total = event.lengthComputable && event.total > 0 ? event.total : SCENE_FILE_BYTES;
                const fraction = Math.min(1, event.loaded / total);
                this._setProgress(LOADING_STAGES.engine + ((LOADING_STAGES.sceneFile - LOADING_STAGES.engine) * fraction), "Loading the world");
            });
            this._setProgress(LOADING_STAGES.world, "Warming up");

            if (!this.scene.activeCamera) {
                throw new Error("No camera defined in the scene. Please add at least one camera in the project or create one yourself in the code.");
            }

            this.scene.activeCamera.attachControl(this.engine.getRenderingCanvas(), false);
            // Compile all shaders now, so nothing stutters the first time it comes into view.
            await warmUpShaders(this.scene, (fraction) => {
                this._setProgress(LOADING_STAGES.world + ((1 - LOADING_STAGES.world) * fraction), "Warming up");
            });
            this._setProgress(1, "Ready");
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
            this._showRetryAction();
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

    /** Moves the loading bar to `fraction` (0 to 1); it never goes backwards. */
    private _setProgress(fraction: number, label: string): void {
        this.shownProgress = Math.max(this.shownProgress, Math.min(1, fraction));
        const percent = Math.round(this.shownProgress * 100);
        if (this.progress.fill) {
            this.progress.fill.style.width = `${percent}%`;
        }
        this.progress.bar?.setAttribute("aria-valuenow", String(percent));
        this.progress.label?.replaceChildren(label);
        this.progress.value?.replaceChildren(`${percent}%`);
    }

    private _hideStatus(): void {
        if (this.statusOverlay) {
            this.statusOverlay.hidden = true;
            delete this.statusOverlay.dataset.state;
        }

        this._hideRetryAction();
    }

    private _getInitialStatusMessage(): string {
        if (window.matchMedia("(pointer: coarse)").matches) {
            return "Loading assets. Drive with the joystick at the bottom left and shoot with the FIRE button.";
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
        this.statusRetryButton?.addEventListener("click", this._handleRetryClick);
    }

    private _showRetryAction(): void {
        if (this.statusRetryButton) {
            this.statusRetryButton.hidden = false;
        }
    }

    private _hideRetryAction(): void {
        if (this.statusRetryButton) {
            this.statusRetryButton.hidden = true;
        }
    }

    private readonly _handleResize = (): void => {
        this.engine.resize();
    };

    private readonly _handleVisibilityChange = (): void => {
        this._syncRenderLoop();
    };

    private readonly _handleRetryClick = (): void => {
        window.location.reload();
    };

    private readonly _handleBeforeUnload = (): void => {
        window.removeEventListener("resize", this._handleResize);
        document.removeEventListener("visibilitychange", this._handleVisibilityChange);
        window.removeEventListener("beforeunload", this._handleBeforeUnload);
        this.statusRetryButton?.removeEventListener("click", this._handleRetryClick);
        this.engine.stopRenderLoop(this.renderScene);
        this.scene.dispose();
        this.engine.dispose();
    };
}
