// treeGenerator.ts

import * as BABYLON from "@babylonjs/core";

export function QuickTreeGenerator(
    sizeBranch: number,
    sizeTrunk: number,
    radius: number,
    trunkMaterial: BABYLON.Material,
    leafMaterial: BABYLON.Material,
    scene: BABYLON.Scene
): BABYLON.Mesh | null {
    if (!BABYLON.MeshBuilder || !BABYLON.Vector3 || !BABYLON.VertexBuffer || !BABYLON.VertexData) {
        console.error("Babylon.js or required components are not loaded.");
        return null;
    }

    const tree = new BABYLON.Mesh("tree", scene);

    const leaves = BABYLON.MeshBuilder.CreateSphere("sphere", { segments: 2, diameter: sizeBranch }, scene);

    if (!leaves) {
        console.error("Failed to create leaves mesh.");
        return null;
    }

    // Explicitly cast positions to number[]
    const positions = leaves.getVerticesData(BABYLON.VertexBuffer.PositionKind) as number[];
    const indices = leaves.getIndices();
    if (!positions || !indices) {
        console.error("Failed to retrieve vertices data or indices.");
        return null;
    }

    const numberOfPoints = positions.length / 3;
    const map: Array<[BABYLON.Vector3, number]> = [];
    const v3 = BABYLON.Vector3;
    const max: BABYLON.Vector3[] = [];

    for (let i = 0; i < numberOfPoints; i++) {
        const p = new v3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);

        if (p.y >= sizeBranch / 2) {
            max.push(p);
        }

        let found = false;
        for (let index = 0; index < map.length && !found; index++) {
            const array = map[index];
            const p0 = array[0];
            if (p0.equals(p) || (p0.subtract(p)).lengthSquared() < 0.01) {
                array.push(i * 3);
                found = true;
            }
        }
        if (!found) {
            let array: [BABYLON.Vector3, number] = [p, i * 3];
            map.push(array);
        }
    }

    const randomNumber = (min: number, max: number): number => {
        if (min === max) return min;
        const random = Math.random();
        return (random * (max - min)) + min;
    };

    map.forEach(array => {
        const min = -sizeBranch / 10;
        const max = sizeBranch / 10;
        const rx = randomNumber(min, max);
        const ry = randomNumber(min, max);
        const rz = randomNumber(min, max);

        // Ensure the first element of `array` is a `Vector3` and subsequent elements are `number`
        const [_, ...indicesArray] = array;
        indicesArray.forEach(i => {
            // Ensure indices are within the bounds of the positions array
            if (i + 2 < positions.length) {
                positions[i] += rx;
                positions[i + 1] += ry;
                positions[i + 2] += rz;
            }
        });
    });

    leaves.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    const normals: number[] = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    leaves.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    leaves.convertToFlatShadedMesh();
    leaves.material = leafMaterial;
    
    // Enable collisions on leaves
    leaves.checkCollisions = true;

    const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {
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
