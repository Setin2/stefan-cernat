import { Node } from "@babylonjs/core/node";
import * as BABYLON from "@babylonjs/core";
import { TextBlock, Control, AdvancedDynamicTexture, Image} from "@babylonjs/gui";
import 'babylonjs-loaders';
import { Texture } from "babylonjs";
import { QuickTreeGenerator } from './treeGenerator';

export default class Play extends Node {
    // misc global variables
    private scene;
    private camera: BABYLON.FreeCamera;

    // audio files
    private bullet: BABYLON.Sound;
    private tankSound: BABYLON.Sound;
    private brickSound: BABYLON.Sound;

    // objects
    private tank;
    private divFps;

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

        this.instantiateTrees();
        this.instantiateBricks(-5, 8, -30, 4, [6, 6, 6, 4], 0);
        this.instantiateBricks(130, 8, -50, 4, [6, 6, 6, 4], 300);
        this.initializeTankMovement(this, rotationSpeed);
        this.initializeShooting(this, forward);
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

        var text = new TextBlock("alpha", "ALPHA VERSION: UNDER DEVELOPEMENT");
        advancedTexture.addControl(text);

        setTimeout(() => {
            advancedTexture.removeControl(image);
        }, 7500);
    }
    
    /**
     * Initialize the movement of the player tank.
     */
    public initializeTankMovement(_this: this, rotationSpeed: number) {
        // Initialize input map and action manager
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        const inputMap: Record<string, boolean> = {};

        // Handle key down and key up events to update inputMap
        const handleKeyEvent = (evt: BABYLON.ActionEvent) => {
            inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
        };
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, handleKeyEvent));
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, handleKeyEvent));

        // Create and manage splatter objects
        const splatterObjects = this.createSplatterObjects();
        let currentSplatterIndex = 0;
        let tick = 0;
        let splatPos = new BABYLON.Vector3(0, 0, 0);

        // Function to manage splatter positioning and rotation
        const updateSplatter = () => {
            tick++;
            if (tick === 35) {
                splatPos = new BABYLON.Vector3(_this.tank.position.x, 0, _this.tank.position.z);
            } else if (tick === 40) {
                splatterObjects[currentSplatterIndex].position = splatPos;
                splatterObjects[currentSplatterIndex].rotate(BABYLON.Axis.Y, Math.random() * 350 + 10, BABYLON.Space.WORLD);
                currentSplatterIndex = (currentSplatterIndex + 1) % splatterObjects.length;
                tick = 0;
                _this.tankSound.play();
            }
        };

        // Transform a vector by the mesh's rotation matrix
        const transformForce = (mesh: BABYLON.Mesh, vec: BABYLON.Vector3) => {
            const matrix = new BABYLON.Matrix();
            mesh.rotationQuaternion.toRotationMatrix(matrix);
            return BABYLON.Vector3.TransformNormal(vec, matrix);
        };

        // Apply velocity to a mesh
        const applyMovement = (mesh: BABYLON.Mesh, direction: BABYLON.Vector3, power: number) => {
            mesh.physicsImpostor.setLinearVelocity(
                mesh.physicsImpostor.getLinearVelocity().add(transformForce(mesh, direction.scale(power)))
            );
        };

        // Register before render callback for tank movement
        this.scene.registerBeforeRender(() => {
            _this.divFps.innerHTML = _this.getEngine().getFps().toFixed() + " fps";
            let keydown = false;

            // Handle forward and backward movement
            if (inputMap["w"]) {
                keydown = true;
                applyMovement(_this.tank, new BABYLON.Vector3(0, 0, 1), 22.5 * _this.scene.deltaTime  / 40);
                updateSplatter();
            }
            if (inputMap["s"]) {
                keydown = true;
                applyMovement(_this.tank, new BABYLON.Vector3(0, 0, -1), 22.5 * _this.scene.deltaTime / 40);
                updateSplatter();
            }

            // Handle rotation
            if (inputMap["d"]) {
                _this.tank.rotate(BABYLON.Axis.Y, rotationSpeed, BABYLON.Space.WORLD);
                keydown = true;
            }
            if (inputMap["a"]) {
                _this.tank.rotate(BABYLON.Axis.Y, -rotationSpeed, BABYLON.Space.WORLD);
                keydown = true;
            }

            // Update camera position to follow the tank
            _this.camera.position.x = _this.tank.position.x - 80;
            _this.camera.position.z = _this.tank.position.z + 60;
        });
    }

    /**
     * Create and return splatter objects.
     */
    private createSplatterObjects(): BABYLON.Mesh[] {
        const baseSplatter = this.scene.getMeshByName("splatter1");
        if (!baseSplatter) {
            console.error("Base splatter object not found in the scene");
            return [];
        }
        return [
            baseSplatter,
            baseSplatter.createInstance("splatter_instance_1"),
            baseSplatter.createInstance("splatter_instance_2"),
        ];
    }


    /**
     * Gives the player the ability to shoot with the tank.
     */
    public initializeShooting(_this: this, forward: BABYLON.Vector3) {
        // Initialize social media targets
        const targetNames = ["github", "linkedin", "twitter"];
        const targetPositions = [
            new BABYLON.Vector3(69.8356, 4.4086, 46.3030),
            new BABYLON.Vector3(69.8356, 2.1121, 17.2901),
        ];
        const targetScalings = [
            new BABYLON.Vector3(1.75, 1.75, 1.75),
            new BABYLON.Vector3(1.5, 1.5, 1.5),
        ];

        const github = _this.scene.getMeshByName("target_github");
        if (!github) {
            console.error("GitHub target not found in the scene");
            return;
        }
        github.material.albedoTexture = new BABYLON.Texture("assets/models/target/target (Base Color).png", _this.scene);

        // Create and configure targets
        const [linkedin, twitter] = targetNames.slice(1).map((name, index) => {
            const target = github.createInstance(`target_${name}`);
            target.position = targetPositions[index];
            target.scaling = targetScalings[index];
            return target;
        });

        // Function to apply velocity to a mesh
        const applyVelocity = (mesh: BABYLON.Mesh|BABYLON.InstancedMesh, direction: BABYLON.Vector3, power: number) => {
            mesh.physicsImpostor.setLinearVelocity(
                mesh.physicsImpostor.getLinearVelocity().add(direction.scale(power))
            );
        };

        // Create a ball object for shooting
        const ball = BABYLON.Mesh.CreateSphere("ball1", 16, 1.5, _this.scene);
        ball.parent = _this.camera;
        let canShoot = true;

        // Handle shooting logic
        const handleShoot = () => {
            if (!canShoot) return;
            canShoot = false;
            _this.bullet.play();

            const shootingDirection = _this.tank.getDirection(forward).normalize();
            const shotBall = ball.createInstance("shootedball");

            // Set the initial position of the ball
            shotBall.position = _this.tank.position.add(shootingDirection.scale(5));
            shotBall.position.y += 3;

            // Add physics and shoot the ball
            shotBall.physicsImpostor = new BABYLON.PhysicsImpostor(shotBall, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0.5, restitution: 0 }, _this.scene);
            applyVelocity(shotBall, shootingDirection, 200);

            // Reset shooting ability after 400 ms
            setTimeout(() => { canShoot = true; }, 400);

            // Dispose the ball after 2000 ms
            const disposeTimeout = setTimeout(() => { shotBall.dispose(); }, 2000);

            // Play sound if ball hits a brick
            _this.scene.meshes
                .filter(mesh => mesh.name === "brick")
                .forEach(mesh => {
                    shotBall.physicsImpostor.registerOnPhysicsCollide(mesh.physicsImpostor, () => { _this.brickSound.play(); });
                });

            // Create action managers for targets
            const createActionManager = (target: BABYLON.Mesh, url: string) => {
                target.actionManager = new BABYLON.ActionManager(_this.scene);
                target.actionManager.registerAction(
                    new BABYLON.ExecuteCodeAction(
                        { trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger, parameter: shotBall },
                        () => {
                            window.open(url);
                            clearTimeout(disposeTimeout);
                            shotBall.dispose();
                        }
                    )
                );
            };

            createActionManager(github, "https://github.com/Setin2");
            createActionManager(linkedin, "https://www.linkedin.com/in/stefan-cernat/");
        };

        // Register the shooting action on key press
        _this.scene.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: 'e' },
                handleShoot
            )
        );
    }


    /**
     * Set up a wall of bricks in the scene at a specified position.
     */
    public instantiateBricks(x: number, y: number, z: number, numRows: number, numCollumnsPerRow: number[], rotationX: number = 0): void {
        const brickMass = 1;
        const brickScaleFactor = 1.1;
        const brickLength = 6 * brickScaleFactor;
        const brickDepth = 3 * brickScaleFactor;
        const brickHeight = brickLength * 0.5 * brickScaleFactor;
        const initialX = x;
        const initialY = y;

        y = brickHeight * y;

        // Create the initial brick
        let brick = this.createBrick(brickLength, brickHeight, brickDepth);

        // Place the initial brick
        this.positionBrick(brick, x, y, z, brickMass);
        x += brickLength;

        // Define a small buffer to prevent collision
        const buffer = 0.1; // Adjust this value as needed

        const wallParent = new BABYLON.TransformNode("wallParent", this.scene);
        brick.parent = wallParent;
        // Create the wall of bricks
        for (let j = 0; j < numRows; j++) {
            // Number of bricks in the current row
            const numBricksInRow = numCollumnsPerRow[j];
            
            // Calculate the total width of the current row
            const totalRowWidth = numBricksInRow * (brickLength + buffer);
            
            // Calculate the center position for the current row
            const rowCenterX = initialX; // Assuming initialX is the central position of the wall

            // Start placing bricks from the center
            let x = rowCenterX - (totalRowWidth / 2); // Center the row
            let y = initialY + (j * (brickHeight + buffer)); // Update y position for the current row
            
            for (let i = 0; i < numBricksInRow; i++) {
                let brickInstance = brick.createInstance(`brick${j}-${i}`);
                this.positionBrick(brickInstance, x, y, z, brickMass);
                x += (brickLength + buffer); // Increment x position with buffer
                brickInstance.parent = wallParent;
            }
        }
        wallParent.rotate(BABYLON.Axis.Y, rotationX, BABYLON.Space.WORLD);
    }

    /**
     * Creates a brick mesh with the given dimensions.
     */
    private createBrick(length: number, height: number, depth: number): BABYLON.Mesh {
        const brick = BABYLON.MeshBuilder.CreateBox("brick", { width: length, height: height, depth: depth }, this.scene);
        brick.material = new BABYLON.StandardMaterial("brickMaterial", this.scene);
        return brick;
    }

    /**
     * Positions and sets up physics properties for a brick.
     */
    private positionBrick(brick: BABYLON.Mesh|BABYLON.InstancedMesh, x: number, y: number, z: number, mass: number) {
        brick.position = new BABYLON.Vector3(x, y, z);
        brick.physicsImpostor = new BABYLON.PhysicsImpostor(brick, BABYLON.PhysicsImpostor.BoxImpostor, { mass: mass, friction: 0.3 }, this.scene);
        brick.physicsImpostor.registerOnPhysicsCollide(this.tank.physicsImpostor, () => { this.brickSound.play(); });
        brick.physicsImpostor.physicsBody.linearDamping = 0.95;
    }


    /**
     * Instantiates clones of the sakura tree to save memory and allow dynamic placement.
     */
    public instantiateTrees() {
        // Function to get a material by name
        function getMaterialByName(scene: BABYLON.Scene, name: string): BABYLON.Material | null {
            for (const material of scene.materials) {
                if (material.name === name) {
                    return material;
                }
            }
            console.warn(`Material with name ${name} not found.`);
            return null;
        }

        // Define the coordinates where the trees will be placed
        const treeCoordinates = [
            new BABYLON.Vector3(78.3985, 5.1848, -11.2018),
            new BABYLON.Vector3(47.5043, 5.1848, -36.9549),
            new BABYLON.Vector3(-39.5430, 5.1848, -44.9435),
            new BABYLON.Vector3(-54.0394, 5.1848, -22.0382),
            new BABYLON.Vector3(57.1332, 5.1848, 77.0256),
        ];

        // Create trees and apply physics impostor
        treeCoordinates.forEach(position => {
            const tree = QuickTreeGenerator(20, 15, 5, getMaterialByName(this.scene, "default material"), getMaterialByName(this.scene, "Feuille.002"), this.scene);
            if (tree) {
                tree.position = position;
            }
        });
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
        // disable browsing the list of meshes to see if a mesh under the pointer may need to have an associated action / event raised
        this.scene.skipPointerMovePicking = true;
        // freeze the materials to reduce unwanted calculations
        this.scene.freezeMaterials();

        this.getEngine().enableOfflineSupport = false;
        this.scene.blockMaterialDirtyMechanism = true;
        
        // disable mouse interactions
        this.scene.pointerMovePredicate = () => false;
        this.scene.pointerDownPredicate = () => false;
        this.scene.pointerUpPredicate = () => false;

        // these only apply to static meshes
        var movableMeshes = ["tank", "amongus"]
        var otherMeshes = [];

        this.scene.meshes
        .filter((mesh) => !movableMeshes.includes(mesh.name))
        .forEach((mesh) => {
            mesh.isPickable = false;
            mesh.doNotSyncBoundingInfo = true; // disabling bounding info sync if no collisions must be calculated
            mesh.freezeWorldMatrix();

            // Ensure all meshes have the same overrideMaterialSideOrientation
            // mesh.overrideMaterialSideOrientation = BABYLON.Mesh.DEFAULTSIDE;

            otherMeshes.push(mesh);
        });
    }
}