/**
 * The parts of Babylon.js the game uses, imported from their own modules so the bundle only
 * contains those (importing "@babylonjs/core" as a whole ships the entire engine). Game code
 * imports this as `BABYLON` and uses it just like the full package: `BABYLON.Vector3`, and so on.
 *
 * Adding a class: export it here from its module under node_modules/@babylonjs/core. Some
 * features only exist once their module is loaded (they add methods to Scene or Mesh); those are
 * the imports at the bottom.
 */

export { ActionEvent } from "@babylonjs/core/Actions/actionEvent";
export { ActionManager } from "@babylonjs/core/Actions/actionManager";
export { ExecuteCodeAction } from "@babylonjs/core/Actions/directActions";
export { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
export { Camera } from "@babylonjs/core/Cameras/camera";
export { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
export { Ray } from "@babylonjs/core/Culling/ray";
export { Constants } from "@babylonjs/core/Engines/constants";
export { Engine } from "@babylonjs/core/Engines/engine";
export { HighlightLayer } from "@babylonjs/core/Layers/highlightLayer";
export { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
export { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
export { Material } from "@babylonjs/core/Materials/material";
export { MultiMaterial } from "@babylonjs/core/Materials/multiMaterial";
export { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
export { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
export { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
export { InternalTexture, InternalTextureSource } from "@babylonjs/core/Materials/Textures/internalTexture";
export { RawCubeTexture } from "@babylonjs/core/Materials/Textures/rawCubeTexture";
export { Texture } from "@babylonjs/core/Materials/Textures/texture";
export { Axis, Space } from "@babylonjs/core/Maths/math.axis";
export { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
export { Curve3 } from "@babylonjs/core/Maths/math.path";
export { Matrix, Quaternion, Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
export { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
export { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
export { Mesh } from "@babylonjs/core/Meshes/mesh";
export { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
export { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
export { TransformNode } from "@babylonjs/core/Meshes/transformNode";
export { CubeMapToSphericalPolynomialTools } from "@babylonjs/core/Misc/HighDynamicRange/cubemapToSphericalPolynomial";
export { Observable, Observer } from "@babylonjs/core/Misc/observable";
export { Node } from "@babylonjs/core/node";
export { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
export { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
/** The physics engine the game uses (Babylon's "v1" engine, with cannon.js); see core/physics.ts. */
export type { PhysicsEngine } from "@babylonjs/core/Physics/v1/physicsEngine";
export { Scene } from "@babylonjs/core/scene";
export type { Nullable } from "@babylonjs/core/types";

// Features that add themselves to Scene, Mesh or Engine when loaded.
import "@babylonjs/core/Physics/physicsEngineComponent"; // scene.enablePhysics, getPhysicsEngine
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent"; // shadows
import "@babylonjs/core/Particles/particleSystemComponent"; // scene.particleSystems
import "@babylonjs/core/Meshes/thinInstanceMesh"; // mesh.thinInstanceAdd and friends
import "@babylonjs/core/Loading/Plugins/babylonFileLoader"; // loading scene.babylon
// Classes the scene file (scenes/scene/scene.babylon) is made of, which the loader looks up by name.
import "@babylonjs/core/Cameras/universalCamera";
import "@babylonjs/core/Lights/hemisphericLight";
import "@babylonjs/core/Lights/Shadows/cascadedShadowGenerator";
import "@babylonjs/core/Materials/colorCurves"; // PBR materials' image processing settings
