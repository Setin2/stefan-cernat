import { Texture } from "babylonjs";
import * as BABYLON from "@babylonjs/core";
import { Node } from "@babylonjs/core/node";
import { TextBlock, Control, AdvancedDynamicTexture, Image} from "@babylonjs/gui";

import { instantiateTrees } from './trees';
import { instantiateBricks } from './bricks';
import { initializeTankMovement, initializeShooting } from './tank';


export default class Play extends Node {
    private scene;
    private camera: BABYLON.FreeCamera;
    private bullet: BABYLON.Sound;
    private tankSound: BABYLON.Sound;
    private brickSound: BABYLON.Sound;
    private tank: BABYLON.AbstractMesh;
    private divFps: HTMLElement | null;

    // @ts-ignore ignoring the super call as we don't want to re-init
    protected constructor() {}

    /**
     * Called on the node is being initialized.
     * This function is called immediatly after the constructor has been called.
     */
    public onInitialize(): void {
        this.initializeGlobalVariables();
        this.initializeTextures();
        this.optimizeScene();

        // set phaysics
        this.camera.lockedTarget = this.tank;
        //this.camera.position = new BABYLON.Vector3(-80, 60, 60)
        this.scene.enablePhysics();
        this.scene.getPhysicsEngine().setGravity(new BABYLON.Vector3(0, -40, 0)); // 9.81 = gravitational acceleration consant, too little

        this.easterEgg();
        this.play();
        this.divFps = document.getElementById("fps");
        //this.scene.debugLayer.show();
    }

    /**
     * Might add other easter eggs later if I feel like it
     */
    public easterEgg(){
        console.log("%c Very sly of you, but there is nothing to see here ;)", "color: #CE718F");
    }

    /**
     * Initialize constant variables and functionalities of the game
     */
    public play(){
        const rotationSpeed = 0.07;
        const forward = new BABYLON.Vector3(0, 0, 1);
        //const backward = new BABYLON.Vector3(0, 0, -1);	

        instantiateTrees(this);
        instantiateBricks(this, -5, 8, -30, 3, [6, 6, 4, 2], 0);
        instantiateBricks(this, 130, 8, -50, 4, [6, 6, 6, 4], 300);
        initializeTankMovement(this, rotationSpeed);
        initializeShooting(this, forward);
        this.show_Control();
    }

    /**
     * Add image telling the player how to control the tank (+ under developement text)
     */
    public show_Control(){
        var advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        var image = new Image("control", "assets/textures/control_final.png");
        image.width = "250px";
        image.height = "100px";
        image.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        image.paddingBottomInPixels = 40;
        advancedTexture.addControl(image);

        /*var text = new TextBlock("alpha", "ALPHA VERSION: UNDER DEVELOPEMENT");
        advancedTexture.addControl(text);*/

        setTimeout(() => {
            advancedTexture.removeControl(image);
        }, 7500);
    }


    /**
     * Initialize all global variables that will be used in other functions
     */
    public initializeGlobalVariables(){
        this.scene = this.getScene();
        this.camera = <BABYLON.FreeCamera>this.scene.getCameraByName("free_camera");

        // initialize all audio 
        this.bullet = new BABYLON.Sound("music", "assets/sounds/bullet.wav", this.scene, null, {loop:false, volume: 0.5});
        this.tankSound = new BABYLON.Sound("tank", "assets/sounds/splash.mp3", this.scene, null, {loop:false, volume: 1});
        this.brickSound = new BABYLON.Sound("brick", "assets/sounds/brick.mp3", this.scene, null, {loop:false, volume: 0.5});

        // initialize global objects & their physicsImpostors
        this.tank = this.scene.getMeshByName("tank_holder");
        this.tank.physicsImpostor = new BABYLON.PhysicsImpostor(this.tank, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1000, restitution: 0 }, this.scene);
        this.tank.physicsImpostor.physicsBody.linearDamping = 0.999;
        this.tank.physicsImpostor.physicsBody.angularDamping = 1;
    }

    /**
     * We have to initialize textures manually inside code, otherwise they dont show up in production for some reason
     */
    public initializeTextures(){
        var fruitFactoryScreen = this.scene.getMeshByName("monitor");
        fruitFactoryScreen.material.albedoTexture = new Texture("assets/models/projects/monitor (Base Color).png", this.scene);

        var fruitFactoryDescriptionText = this.scene.getMeshByName("ffdescription");
        fruitFactoryDescriptionText.material.diffuseTexture = new Texture("assets/textures/fruit factory description.png", this.scene);
        fruitFactoryDescriptionText.material.opacityTexture = new Texture("assets/textures/fruit factory description.png", this.scene);
    }

    public optimizeScene(){
        this.scene.skipPointerMovePicking = true;
        this.scene.freezeMaterials();
        this.getEngine().enableOfflineSupport = false;
        this.scene.blockMaterialDirtyMechanism = true;
        
        // disable mouse interactions
        this.scene.pointerMovePredicate = () => false;
        this.scene.pointerDownPredicate = () => false;
        this.scene.pointerUpPredicate = () => false;

        const movableMeshes = new Set(["tank", "amongus"]);
        this.scene.meshes
        .filter(mesh => !movableMeshes.has(mesh.name))
        .forEach(mesh => {
            mesh.isPickable = false;
            mesh.doNotSyncBoundingInfo = true;
            mesh.freezeWorldMatrix();
        });
    }
}