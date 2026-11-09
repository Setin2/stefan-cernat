import * as BABYLON from "@babylonjs/core";
import { Node } from "@babylonjs/core/node";

import { createImpactSounds } from "./audio/impactSounds";
import { SoundBoard } from "./audio/soundBoard";
import { optimizeScene } from "./core/performance";
import { adaptResolution } from "./core/resolution";
import { createTankBody, enablePhysics, prepareLooseBodies } from "./core/physics";
import { initializeShadows } from "./core/shadows";
import { registerLoadingTask } from "./core/warmUp";
import { initializeTankMovement } from "./tank/movement";
import { initializeShooting } from "./tank/shooting";
import { createTankTrail } from "./tank/tankTrail";
import { createToyTank, type ToyTank } from "./tank/toyTank";
import { ControlOverlay } from "./ui/controlsOverlay";
import { attachFpsCounter } from "./ui/fpsCounter";
import { createAiTrophies } from "./world/aiTrophies";
import { createBrickBuilds } from "./world/bricks";
import { createClouds } from "./world/clouds";
import { createCodeTrophy } from "./world/codeTrophy";
import { restyleFruitFactory } from "./world/fruitFactory";
import { createFruitFactorySigns } from "./world/fruitFactorySigns";
import { decorateGround } from "./world/ground";
import { restyleLandmarks } from "./world/landmarks";
import { restyleMascots } from "./world/mascots";
import { createPlayground } from "./world/playground";
import { instantiateTrees, TREE_POSITIONS } from "./world/trees";
import { createWaypointSigns } from "./world/waypointSigns";
import { createTradingGame } from "./world/tradingGame";
import { createWorkCorner, type WorkCorner } from "./world/workCorner";

/**
 * The game's entry point: the Babylon.js Editor attaches this script to the scene (see
 * scripts-map.ts), and onInitialize builds everything on top of the imported scene.
 *
 * - core/  engine-level setup: physics, shadows, performance, shared toy-style mesh helpers
 * - tank/  the player tank: model, driving, shooting, tread trail, link targets
 * - world/ everything placed in the world: trees, roads, landmarks, trophies, signs, clouds
 * - ui/    the 2D overlay: help card, target HUD, FPS counter, shared UI style
 */
export default class Play extends Node {
    private scene!: BABYLON.Scene;
    private camera!: BABYLON.FreeCamera;
    private tank!: BABYLON.AbstractMesh;
    private toyTank: ToyTank | null = null;
    private workCorner: WorkCorner | null = null;

    // @ts-ignore Babylon attaches script classes without calling Node's public constructor shape.
    protected constructor() {}

    /**
     * Called when the node is being initialized.
     * This function is called immediately after the constructor has been called.
     */
    public onInitialize(): void {
        this.findSceneObjects();
        this.loadScreenTexture();
        console.log("%c Very sly of you, but there is nothing to see here ;)", "color: #CE718F");

        enablePhysics(this.scene);
        createTankBody(this.scene, this.tank);
        attachFpsCounter(this.scene);
        adaptResolution(this.scene);

        this.buildWorld();
        this.initializeTank();

        // Last, once every mesh and physics body exists.
        optimizeScene(this.scene, this.tank);
        prepareLooseBodies(this.scene, this.tank);

        const controls = new ControlOverlay(this.scene);
        registerLoadingTask(controls.show());
        this.onDisposeObservable.addOnce(() => controls.dispose());
    }

    private findSceneObjects(): void {
        this.scene = this.getScene();

        const camera = this.scene.getCameraByName("free_camera");
        if (!(camera instanceof BABYLON.FreeCamera)) {
            throw new Error("Missing required free_camera in the scene.");
        }

        const tank = this.scene.getMeshByName("tank_holder");
        if (!tank) {
            throw new Error("Missing required tank_holder mesh in the scene.");
        }

        this.camera = camera;
        this.tank = tank;
    }

    /** Loaded by hand so the desk monitor's texture loads reliably in production builds. */
    private loadScreenTexture(): void {
        const screenMaterial = this.scene.getMeshByName("monitor")?.material;
        if (screenMaterial && "albedoTexture" in screenMaterial) {
            screenMaterial.albedoTexture = new BABYLON.Texture("assets/models/projects/monitor (Base Color).png", this.scene);
        }
    }

    /** Restyles the imported scene and adds everything built in code. Order matters where noted. */
    private buildWorld(): void {
        const scene = this.scene;

        this.createToyTankModel();
        createTankTrail(scene, this.tank);
        instantiateTrees({ scene });
        restyleLandmarks(scene);
        restyleFruitFactory(scene);
        createFruitFactorySigns(scene);
        restyleMascots(scene);
        tryTo("AI trophies", () => createAiTrophies(scene));
        tryTo("C# trophy", () => createCodeTrophy(scene));
        tryTo("Work corner", () => {
            this.workCorner = createWorkCorner(scene);
        });
        createWaypointSigns(scene);
        tryTo("Playground", () => createPlayground(scene));
        createBrickBuilds({ scene, tank: this.tank });
        // After the bricks: walls measure the ground height with a ray, and decorations avoid them.
        decorateGround(scene, TREE_POSITIONS);
        tryTo("Clouds", () => createClouds(scene, this.tank, this.camera));
        // After everything else, so every mesh is considered as a shadow caster.
        tryTo("Shadows", () => initializeShadows(scene, { camera: this.camera, focus: () => this.tank.position }));
    }

    /**
     * Swaps the imported tank model for the toy tank built in code. Add `?tank=classic` to the URL
     * to get the original model back for comparison.
     */
    private createToyTankModel(): void {
        if (new URLSearchParams(window.location.search).get("tank") === "classic") {
            return;
        }

        try {
            this.toyTank = createToyTank(this.scene, this.tank);
            this.scene.getMeshByName("tank")?.setEnabled(false);
        } catch (error) {
            console.error("Toy tank creation failed, keeping the original model", error);
            this.toyTank?.root.dispose();
            this.toyTank = null;
        }
    }

    /** Driving, shooting, the work corner's minigame and all the sounds (synthesised, see audio/). After the world is built. */
    private initializeTank(): void {
        const sounds = new SoundBoard(this.scene, this.tank, this.camera);
        const context = {
            scene: this.scene,
            tank: this.tank,
            camera: this.camera,
            sounds,
            impacts: createImpactSounds(this.scene, sounds, this.tank),
            onShoot: this.toyTank ? () => this.toyTank?.fire() : undefined,
            shotOrigin: this.toyTank?.muzzle,
        };
        initializeTankMovement(context, 0.07);
        registerLoadingTask(initializeShooting(context, new BABYLON.Vector3(0, 0, 1)));
        if (this.workCorner) {
            registerLoadingTask(createTradingGame(context, this.workCorner).catch((error) => console.error("Trading game failed", error)));
        }
    }
}

/** Optional extras log their error instead of taking the whole scene down. */
function tryTo(what: string, build: () => void): void {
    try {
        build();
    } catch (error) {
        console.error(`${what} failed`, error);
    }
}
