import * as BABYLON from "./babylon";
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
import { createTankInput } from "./tank/input";
import { createTankTrail } from "./tank/tankTrail";
import { createToyTank, type ToyTank } from "./tank/toyTank";
import { ControlOverlay } from "./ui/controlsOverlay";
import { attachFpsCounter } from "./ui/fpsCounter";
import { createTouchControls } from "./ui/touchControls";
import { createAiTrophies } from "./world/aiTrophies";
import { createBrickBuilds } from "./world/bricks";
import type { ArcadeButton } from "./world/arcadeButton";
import { createClouds } from "./world/clouds";
import { createCSharpTrophy, createPythonTrophy } from "./world/codeTrophies";
import { restyleFruitFactory } from "./world/fruitFactory";
import { createFruitFactorySigns } from "./world/fruitFactorySigns";
import { createFruitRush, createFruitRushButton } from "./world/fruitRush";
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
    private fruitRushButton: ArcadeButton | null = null;

    // @ts-expect-error Babylon attaches script classes without calling Node's public constructor shape.
    protected constructor() {}

    /**
     * Called when the node is being initialized.
     * This function is called immediately after the constructor has been called.
     */
    public onInitialize(): void {
        this.findSceneObjects();
        // An easter egg for whoever opens the console.
        // eslint-disable-next-line no-console
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

    /** Restyles the imported scene and adds everything built in code. Order matters where noted. */
    private buildWorld(): void {
        const scene = this.scene;

        this.createToyTankModel();
        createTankTrail(scene, this.tank);
        instantiateTrees({ scene });
        restyleLandmarks(scene);
        restyleFruitFactory(scene);
        createFruitFactorySigns(scene);
        tryTo("Fruit Rush", () => {
            this.fruitRushButton = createFruitRushButton(scene);
        });
        restyleMascots(scene);
        tryTo("AI trophies", () => createAiTrophies(scene));
        tryTo("C# trophy", () => createCSharpTrophy(scene));
        tryTo("Work corner", () => {
            this.workCorner = createWorkCorner(scene);
        });
        tryTo("Python trophy", () => createPythonTrophy(scene));
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
     * Builds the toy tank model (in code) on the tank holder, which carries its physics body.
     */
    private createToyTankModel(): void {
        try {
            this.toyTank = createToyTank(this.scene, this.tank);
        } catch (error) {
            console.error("Toy tank creation failed", error);
            this.toyTank?.root.dispose();
            this.toyTank = null;
        }
    }

    /** Driving, shooting, the minigames and all the sounds (synthesised, see audio/). After the world is built. */
    private initializeTank(): void {
        const sounds = new SoundBoard(this.scene, this.tank, this.camera);
        const input = createTankInput();
        const touchControls = createTouchControls(input);
        this.onDisposeObservable.addOnce(() => touchControls.dispose());
        const context = {
            scene: this.scene,
            tank: this.tank,
            camera: this.camera,
            sounds,
            impacts: createImpactSounds(this.scene, sounds, this.tank),
            input,
            onShoot: this.toyTank ? () => this.toyTank?.fire() : undefined,
            shotOrigin: this.toyTank?.muzzle,
        };
        initializeTankMovement(context, 0.07);
        registerLoadingTask(initializeShooting(context, new BABYLON.Vector3(0, 0, 1)));
        if (this.workCorner) {
            registerLoadingTask(createTradingGame(context, this.workCorner).catch((error) => console.error("Trading game failed", error)));
        }
        if (this.fruitRushButton) {
            registerLoadingTask(createFruitRush(context, this.fruitRushButton).catch((error) => console.error("Fruit Rush failed", error)));
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
