import * as BABYLON from "@babylonjs/core";

type TankContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    camera: BABYLON.FreeCamera;
    divFps: HTMLElement | null;
    tankSound: BABYLON.Sound;
    bullet: BABYLON.Sound;
};

type TargetLink = {
    mesh: BABYLON.Mesh | BABYLON.InstancedMesh;
    hitRadiusSquared: number;
    url: string;
};

type ActiveShot = {
    mesh: BABYLON.InstancedMesh;
    dispose: () => void;
    disposeTimeout: ReturnType<typeof setTimeout>;
};

/**
 * Initialize the movement of the player tank.
 */
export function initializeTankMovement(_this: TankContext, rotationSpeed: number): void {
    const inputMap: Record<string, boolean> = {};
    const engine = _this.scene.getEngine();
    const forwardDirection = new BABYLON.Vector3(0, 0, 1);
    const backwardDirection = new BABYLON.Vector3(0, 0, -1);
    const rotationMatrix = new BABYLON.Matrix();
    const fallbackRotationQuaternion = BABYLON.Quaternion.Identity();
    const transformedForce = BABYLON.Vector3.Zero();
    const nextVelocity = BABYLON.Vector3.Zero();
    let lastFpsUpdateTime = 0;

    // Handle key down and key up events to update inputMap
    const handleKeyEvent = (evt: BABYLON.ActionEvent) => {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    };

    _this.scene.actionManager = new BABYLON.ActionManager(_this.scene);
    _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, handleKeyEvent));
    _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, handleKeyEvent));

    // Create and manage splatter objects
    const splatterObjects = createSplatterObjects(_this);
    let currentSplatterIndex = 0;
    let tick = 0;

    // Update splatter positioning and rotation
    const updateSplatter = () => {
        if (!splatterObjects.length) {
            return;
        }

        if (++tick === 35) {
            splatterObjects[currentSplatterIndex].position.copyFrom(_this.tank.position);
        } else if (tick === 40) {
            const splatter = splatterObjects[currentSplatterIndex];
            splatter.position.y = 0;
            splatter.rotate(BABYLON.Axis.Y, Math.random() * 350 + 10, BABYLON.Space.WORLD);
            currentSplatterIndex = (currentSplatterIndex + 1) % splatterObjects.length;
            tick = 0;
            _this.tankSound.play();
        }
    };

    const applyMovement = (mesh: BABYLON.AbstractMesh, direction: BABYLON.Vector3, power: number) => {
        const physicsImpostor = mesh.physicsImpostor;
        const currentVelocity = physicsImpostor?.getLinearVelocity();
        if (!physicsImpostor || !currentVelocity) {
            return;
        }

        const rotationQuaternion = mesh.rotationQuaternion;
        if (rotationQuaternion) {
            rotationQuaternion.toRotationMatrix(rotationMatrix);
        } else {
            BABYLON.Quaternion.RotationYawPitchRollToRef(mesh.rotation.y, mesh.rotation.x, mesh.rotation.z, fallbackRotationQuaternion);
            fallbackRotationQuaternion.toRotationMatrix(rotationMatrix);
        }

        BABYLON.Vector3.TransformNormalToRef(direction, rotationMatrix, transformedForce);
        transformedForce.scaleInPlace(power);
        currentVelocity.addToRef(transformedForce, nextVelocity);

        physicsImpostor.setLinearVelocity(nextVelocity);
    };

    _this.scene.registerBeforeRender(() => {
        if (_this.divFps) {
            const now = performance.now();
            if (now - lastFpsUpdateTime >= 250) {
                _this.divFps.textContent = `${engine.getFps().toFixed()} fps`;
                lastFpsUpdateTime = now;
            }
        }

        const deltaTimeFactor = 22.5 * _this.scene.deltaTime / 40;

        if (inputMap["w"]) { // move forward
            applyMovement(_this.tank, forwardDirection, deltaTimeFactor);
            updateSplatter();
        }
        if (inputMap["s"]) { // move backwards
            applyMovement(_this.tank, backwardDirection, deltaTimeFactor);
            updateSplatter();
        }

        if (inputMap["d"]) { // rotate right
            _this.tank.rotate(BABYLON.Axis.Y, rotationSpeed, BABYLON.Space.WORLD);
        }
        if (inputMap["a"]) { // rotate left
            _this.tank.rotate(BABYLON.Axis.Y, -rotationSpeed, BABYLON.Space.WORLD);
        }

        _this.camera.position.x = _this.tank.position.x - 80;
        _this.camera.position.z = _this.tank.position.z + 60;
    });
}

/**
 * Create and return splatter objects.
 */
function createSplatterObjects(_this: TankContext): BABYLON.AbstractMesh[] {
    const baseSplatter = _this.scene.getMeshByName("splatter1");
    if (!baseSplatter) {
        console.error("Base splatter object not found in the scene");
        return [];
    }
    if (!(baseSplatter instanceof BABYLON.Mesh)) {
        console.error("Base splatter object must be a mesh");
        return [];
    }

    return [baseSplatter, baseSplatter.createInstance("splatter2"), baseSplatter.createInstance("splatter3")];
}

/**
 * Gives the player the ability to shoot with the tank.
 */
export function initializeShooting(_this: TankContext, forward: BABYLON.Vector3): void {
    const activeShots: ActiveShot[] = [];
    const shotOffset = 5;
    const shotHeightOffset = 3;
    const shotRadius = 0.75;
    const shotDirection = BABYLON.Vector3.Zero();
    const shotSpawnPosition = BABYLON.Vector3.Zero();
    const targetConfigs = [
        {
            name: "linkedin",
            position: new BABYLON.Vector3(69.8356, 4.4086, 46.3030),
            scaling: new BABYLON.Vector3(1.75, 1.75, 1.75),
            url: "https://www.linkedin.com/in/stefan-cernat/",
        },
        {
            name: "twitter",
            position: new BABYLON.Vector3(69.8356, 2.1121, 17.2901),
            scaling: new BABYLON.Vector3(1.5, 1.5, 1.5),
            url: "https://x.com/Setin2",
        },
    ];

    const github = _this.scene.getMeshByName("target_github");
    if (!(github instanceof BABYLON.Mesh)) {
        console.error("GitHub target not found in the scene");
        return;
    }

    const githubMaterial = github.material;
    if (githubMaterial && "albedoTexture" in githubMaterial) {
        githubMaterial.albedoTexture = new BABYLON.Texture("assets/models/target/target (Base Color).png", _this.scene);
    }

    const getHitRadiusSquared = (mesh: BABYLON.Mesh | BABYLON.InstancedMesh): number => {
        mesh.computeWorldMatrix(true);
        const radius = mesh.getBoundingInfo().boundingSphere.radiusWorld + shotRadius;
        return radius * radius;
    };

    const targets: TargetLink[] = [{ mesh: github, hitRadiusSquared: getHitRadiusSquared(github), url: "https://github.com/Setin2" }];
    targetConfigs.forEach(({ name, position, scaling, url }) => {
        const target = github.createInstance(`target_${name}`);
        target.position.copyFrom(position);
        target.scaling.copyFrom(scaling);
        targets.push({ mesh: target, hitRadiusSquared: getHitRadiusSquared(target), url });
    });

    const applyVelocity = (mesh: BABYLON.InstancedMesh, direction: BABYLON.Vector3, power: number) => {
        const currentVelocity = mesh.physicsImpostor?.getLinearVelocity();
        if (!mesh.physicsImpostor || !currentVelocity) {
            return;
        }

        mesh.physicsImpostor.setLinearVelocity(currentVelocity.add(direction.scale(power)));
    };

    const ball = BABYLON.MeshBuilder.CreateSphere("ball", { segments: 16, diameter: 1.5 }, _this.scene);
    ball.parent = _this.camera;
    ball.isVisible = false;
    ball.isPickable = false;
    let canShoot = true;

    _this.scene.onBeforeRenderObservable.add(() => {
        if (!activeShots.length) {
            return;
        }

        for (let shotIndex = activeShots.length - 1; shotIndex >= 0; shotIndex--) {
            const activeShot = activeShots[shotIndex];
            const shotPosition = activeShot.mesh.absolutePosition;

            for (const target of targets) {
                if (BABYLON.Vector3.DistanceSquared(shotPosition, target.mesh.absolutePosition) <= target.hitRadiusSquared) {
                    window.open(target.url, "_blank", "noopener,noreferrer");
                    clearTimeout(activeShot.disposeTimeout);
                    activeShot.dispose();
                    activeShots.splice(shotIndex, 1);
                    break;
                }
            }
        }
    });

    const handleShoot = () => {
        if (!canShoot) {
            return;
        }

        canShoot = false;
        _this.bullet.play();

        _this.tank.getDirectionToRef(forward, shotDirection);
        shotDirection.normalize();
        const shotBall = ball.createInstance("ball");
        shotBall.parent = null;

        shotDirection.scaleToRef(shotOffset, shotSpawnPosition);
        shotSpawnPosition.addInPlace(_this.tank.position);
        shotSpawnPosition.y += shotHeightOffset;
        shotBall.position.copyFrom(shotSpawnPosition);

        shotBall.physicsImpostor = new BABYLON.PhysicsImpostor(shotBall, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0.5, restitution: 0 }, _this.scene);
        applyVelocity(shotBall, shotDirection, 200);

        setTimeout(() => { canShoot = true; }, 400);

        const disposeShot = () => {
            shotBall.physicsImpostor?.dispose();
            if (!shotBall.isDisposed()) {
                shotBall.dispose();
            }
        };

        const disposeTimeout = setTimeout(() => {
            disposeShot();
            const shotIndex = activeShots.findIndex((activeShot) => activeShot.mesh === shotBall);
            if (shotIndex !== -1) {
                activeShots.splice(shotIndex, 1);
            }
        }, 2000);

        activeShots.push({ mesh: shotBall, dispose: disposeShot, disposeTimeout });
    };

    _this.scene.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: 'e' },
            handleShoot
        )
    );
}
