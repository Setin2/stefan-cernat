import * as BABYLON from "@babylonjs/core";

import { getYaw } from "../core/math";
import { getPlaygroundHeight } from "../world/playground";
import type { TankContext } from "./context";

/**
 * Keyboard driving (W/A/S/D), riding the ramps, and the camera following the tank.
 */
export function initializeTankMovement(_this: TankContext, rotationSpeed: number): void {
    const inputMap: Record<string, boolean> = {};
    const engine = _this.scene.getEngine();
    const forwardDirection = BABYLON.Vector3.Zero();
    const zeroVector = BABYLON.Vector3.Zero();
    const tankVelocity = BABYLON.Vector3.Zero();
    const cameraTargetPosition = BABYLON.Vector3.Zero();
    const cameraFocusPoint = BABYLON.Vector3.Zero();
    const nextPosition = BABYLON.Vector3.Zero();
    const uprightRotation = BABYLON.Quaternion.Identity();
    const previousTankPosition = _this.tank.position.clone();
    const translationDelta = BABYLON.Vector3.Zero();
    const baseTankY = _this.tank.position.y;
    // Tree trunks are static, so their collision footprint is computed once instead of every frame.
    const treeColliders = _this.scene.meshes
        .filter((mesh) => mesh.name.startsWith("tree-trunk"))
        .map((trunk) => {
            const radius = getHorizontalRadius(trunk);
            return { x: trunk.absolutePosition.x, z: trunk.absolutePosition.z, radius };
        });
    const maxDeltaSeconds = 0.1;
    const maxForwardSpeed = 38;
    const maxReverseSpeed = 20;
    const acceleration = 48;
    const deceleration = 44;
    const maxTurnSpeed = rotationSpeed * 60;
    const turnAcceleration = 12;
    const cameraFollowSharpness = 6;
    const tankCollisionRadius = getHorizontalRadius(_this.tank) * 0.55;
    // Ramps and platforms: the tank keeps its own height above the ground (see getPlaygroundHeight)
    // and falls with this gravity, so it rides up slopes, flies off ramp ends and lands.
    const tankGravity = 60;
    const maxClimbStep = 1.2;
    const maxLaunchSpeed = 22;
    let elevation = 0;
    let verticalSpeed = 0;
    let grounded = true;
    let modelPitch = 0;
    const toyModel = _this.scene.getTransformNodeByName("toy-tank-root");
    let currentTurnSpeed = 0;
    let currentMoveSpeed = 0;

    _this.camera.lockedTarget = null;
    _this.tank.computeWorldMatrix(true);
    cameraFocusPoint.copyFrom(_this.tank.getBoundingInfo().boundingBox.centerWorld);
    _this.camera.setTarget(cameraFocusPoint);
    cameraTargetPosition.copyFrom(_this.camera.position);

    _this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");

    // Handle key down and key up events to update inputMap
    const handleKeyEvent = (evt: BABYLON.ActionEvent) => {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    };

    // Key-up events are lost when the window loses focus, so release every key on blur.
    const releaseAllKeys = () => {
        for (const key in inputMap) {
            inputMap[key] = false;
        }
    };
    window.addEventListener("blur", releaseAllKeys);
    _this.scene.onDisposeObservable.addOnce(() => window.removeEventListener("blur", releaseAllKeys));

    _this.scene.actionManager = new BABYLON.ActionManager(_this.scene);
    _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, handleKeyEvent));
    _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, handleKeyEvent));

    // Engine sound: replayed every 40 physics frames while driving. (The tread prints and dust are
    // in tankTrail.ts.)
    let engineSoundTick = 0;
    const updateEngineSound = () => {
        if (++engineSoundTick >= 40) {
            engineSoundTick = 0;
            _this.tankSound.play();
        }
    };

    const applyMovement = (mesh: BABYLON.AbstractMesh, moveInput: number, deltaSeconds: number): number => {
        const physicsImpostor = mesh.physicsImpostor;
        if (!physicsImpostor) {
            return 0;
        }

        const desiredSpeed = moveInput > 0 ? maxForwardSpeed : moveInput < 0 ? -maxReverseSpeed : 0;
        const speedDelta = (moveInput === 0 ? deceleration : acceleration) * deltaSeconds;
        currentMoveSpeed = moveToward(currentMoveSpeed, desiredSpeed, speedDelta);

        const yaw = getYaw(mesh);
        forwardDirection.set(Math.sin(yaw), 0, Math.cos(yaw));
        forwardDirection.normalize();

        // Trees are checked against where the tank will be after this step, so it stops cleanly
        // before a trunk instead of grinding against it.
        nextPosition.copyFrom(mesh.position);
        nextPosition.y = baseTankY;
        nextPosition.addInPlace(forwardDirection.scale(currentMoveSpeed * deltaSeconds));
        if (collidesWithTree(nextPosition)) {
            currentMoveSpeed = 0;
        }
        // A surface much higher than the tank's bottom (the back of a ramp, a platform's side) is
        // a wall: stop instead of popping up onto it.
        if (getPlaygroundHeight(nextPosition.x, nextPosition.z) - elevation > maxClimbStep) {
            currentMoveSpeed = 0;
        }

        // The tank is moved by the physics engine using this velocity (rather than by setting its
        // position directly), so the engine knows how fast it is going: bricks and other loose
        // objects get knocked away with real momentum, and static objects still block it.
        forwardDirection.scaleToRef(currentMoveSpeed, tankVelocity);
        physicsImpostor.setLinearVelocity(tankVelocity);
        physicsImpostor.setAngularVelocity(zeroVector);

        return currentMoveSpeed;
    };

    // Runs once per frame, right before the physics step, so the velocity set here is what the
    // physics engine uses to move the tank this frame.
    const tankControllerObserver = _this.scene.onBeforePhysicsObservable.add(() => {
        // Clamp so a long pause (hidden tab, stalled frame) can't teleport the tank through obstacles.
        // Babylon clamps the physics step to the same 0.1s.
        const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, maxDeltaSeconds);
        const moveInput = (inputMap["w"] ? 1 : 0) - (inputMap["s"] ? 1 : 0);
        const turnInput = (inputMap["d"] ? 1 : 0) - (inputMap["a"] ? 1 : 0);
        const currentForwardSpeed = applyMovement(_this.tank, moveInput, deltaSeconds);

        if (moveInput !== 0 && Math.abs(currentForwardSpeed) > 0.5) {
            updateEngineSound();
        }

        const desiredTurnSpeed = turnInput * maxTurnSpeed;
        currentTurnSpeed = moveToward(currentTurnSpeed, desiredTurnSpeed, turnAcceleration * deltaSeconds);
        if (currentTurnSpeed !== 0) {
            _this.tank.rotate(BABYLON.Axis.Y, currentTurnSpeed * deltaSeconds, BABYLON.Space.WORLD);
        }

        updateVerticalMovement(deltaSeconds);

        const rotationQuaternion = _this.tank.rotationQuaternion;
        if (rotationQuaternion) {
            BABYLON.Quaternion.RotationYawPitchRollToRef(getYaw(_this.tank), 0, 0, uprightRotation);
            rotationQuaternion.copyFrom(uprightRotation);
        } else {
            _this.tank.rotation.x = 0;
            _this.tank.rotation.z = 0;
        }
    });

    // Runs after the physics step has moved the tank this frame.
    _this.scene.registerBeforeRender(() => {
        const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, maxDeltaSeconds);

        _this.tank.position.subtractToRef(previousTankPosition, translationDelta);
        translationDelta.y = 0;
        cameraTargetPosition.addInPlace(translationDelta);

        BABYLON.Vector3.LerpToRef(
            _this.camera.position,
            cameraTargetPosition,
            Math.min(1, cameraFollowSharpness * deltaSeconds),
            _this.camera.position,
        );

        previousTankPosition.copyFrom(_this.tank.position);
    });

    _this.scene.onDisposeObservable.addOnce(() => {
        _this.scene.onBeforePhysicsObservable.remove(tankControllerObserver);
    });

    /**
     * Follows the ground and ramps, keeping the upward speed a slope gives, so driving off the top
     * of a ramp launches the tank; in the air it falls until it lands. The visual model leans with
     * the slope (or noses up and down in the air).
     */
    function updateVerticalMovement(deltaSeconds: number): void {
        if (deltaSeconds <= 0) {
            return;
        }
        const position = _this.tank.position;
        const ground = getPlaygroundHeight(position.x, position.z);

        verticalSpeed -= tankGravity * deltaSeconds;
        const next = elevation + (verticalSpeed * deltaSeconds);
        if (next <= ground) {
            // On the surface: move with it, remembering how fast it carried the tank upwards.
            verticalSpeed = Math.min(maxLaunchSpeed, (ground - elevation) / deltaSeconds);
            elevation = ground;
            grounded = true;
        } else {
            elevation = next;
            grounded = false;
        }
        position.y = baseTankY + elevation;

        if (!toyModel) {
            return;
        }
        let targetPitch: number;
        if (grounded) {
            const yaw = getYaw(_this.tank);
            const fx = Math.sin(yaw) * 3;
            const fz = Math.cos(yaw) * 3;
            const ahead = getPlaygroundHeight(position.x + fx, position.z + fz);
            const behind = getPlaygroundHeight(position.x - fx, position.z - fz);
            targetPitch = Math.atan2(ahead - behind, 6);
        } else {
            targetPitch = Math.max(-0.45, Math.min(0.45, Math.atan2(verticalSpeed, Math.max(Math.abs(currentMoveSpeed), 12)) * 0.8));
        }
        modelPitch += (targetPitch - modelPitch) * Math.min(1, deltaSeconds * 10);
        // Positive rotation around X tips the nose (+Z) down, so nose-up is negative.
        toyModel.rotation.x = -modelPitch;
    }

    function moveToward(current: number, target: number, maxDelta: number): number {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }

        return current + Math.sign(target - current) * maxDelta;
    }

    function getHorizontalRadius(mesh: BABYLON.AbstractMesh): number {
        mesh.computeWorldMatrix(true);
        const extent = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        return Math.max(extent.x, extent.z);
    }

    function collidesWithTree(position: BABYLON.Vector3): boolean {
        for (const tree of treeColliders) {
            const dx = position.x - tree.x;
            const dz = position.z - tree.z;
            const minimumDistance = tankCollisionRadius + tree.radius;

            if ((dx * dx) + (dz * dz) < minimumDistance * minimumDistance) {
                return true;
            }
        }

        return false;
    }
}
