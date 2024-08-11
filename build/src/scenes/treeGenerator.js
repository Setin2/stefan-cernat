"use strict";
// treeGenerator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickTreeGenerator = QuickTreeGenerator;
var BABYLON = require("@babylonjs/core");
function QuickTreeGenerator(sizeBranch, sizeTrunk, radius, trunkMaterial, leafMaterial, scene) {
    if (!BABYLON.MeshBuilder || !BABYLON.Vector3 || !BABYLON.VertexBuffer || !BABYLON.VertexData) {
        console.error("Babylon.js or required components are not loaded.");
        return null;
    }
    var tree = new BABYLON.Mesh("tree", scene);
    var leaves = BABYLON.MeshBuilder.CreateSphere("sphere", { segments: 2, diameter: sizeBranch }, scene);
    if (!leaves) {
        console.error("Failed to create leaves mesh.");
        return null;
    }
    // Explicitly cast positions to number[]
    var positions = leaves.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    var indices = leaves.getIndices();
    if (!positions || !indices) {
        console.error("Failed to retrieve vertices data or indices.");
        return null;
    }
    var numberOfPoints = positions.length / 3;
    var map = [];
    var v3 = BABYLON.Vector3;
    var max = [];
    for (var i = 0; i < numberOfPoints; i++) {
        var p = new v3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        if (p.y >= sizeBranch / 2) {
            max.push(p);
        }
        var found = false;
        for (var index = 0; index < map.length && !found; index++) {
            var array = map[index];
            var p0 = array[0];
            if (p0.equals(p) || (p0.subtract(p)).lengthSquared() < 0.01) {
                array.push(i * 3);
                found = true;
            }
        }
        if (!found) {
            var array = [p, i * 3];
            map.push(array);
        }
    }
    var randomNumber = function (min, max) {
        if (min === max)
            return min;
        var random = Math.random();
        return (random * (max - min)) + min;
    };
    map.forEach(function (array) {
        var min = -sizeBranch / 10;
        var max = sizeBranch / 10;
        var rx = randomNumber(min, max);
        var ry = randomNumber(min, max);
        var rz = randomNumber(min, max);
        // Ensure the first element of `array` is a `Vector3` and subsequent elements are `number`
        var _ = array[0], indicesArray = array.slice(1);
        indicesArray.forEach(function (i) {
            // Ensure indices are within the bounds of the positions array
            if (i + 2 < positions.length) {
                positions[i] += rx;
                positions[i + 1] += ry;
                positions[i + 2] += rz;
            }
        });
    });
    leaves.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    var normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    leaves.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    leaves.convertToFlatShadedMesh();
    leaves.material = leafMaterial;
    // Enable collisions on leaves
    leaves.checkCollisions = true;
    var trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {
        height: sizeTrunk,
        diameterTop: Math.max(radius - 2, 1),
        diameterBottom: radius,
        tessellation: 10,
        subdivisions: 2
    }, scene);
    trunk.physicsImpostor = new BABYLON.PhysicsImpostor(trunk, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0 }, scene);
    if (!trunk) {
        console.error("Failed to create trunk mesh.");
        return null;
    }
    trunk.material = trunkMaterial;
    trunk.convertToFlatShadedMesh();
    // Enable collisions on trunk
    trunk.checkCollisions = true;
    leaves.parent = tree;
    trunk.parent = tree;
    leaves.position.y = (sizeTrunk + sizeBranch) / 2 - 2;
    return tree;
}
//# sourceMappingURL=treeGenerator.js.map