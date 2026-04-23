// treeGenerator.ts

import * as BABYLON from "@babylonjs/core";

type TreeContext = {
    scene: BABYLON.Scene;
};

type TreeTemplates = {
    leaves: BABYLON.Mesh;
    trunk: BABYLON.Mesh;
};

export function instantiateTrees(_this: TreeContext): void {
    const trunkMaterial = _this.scene.getMaterialByName("default material");
    const leafMaterial = _this.scene.getMaterialByName("Feuille.002");

    if (!trunkMaterial || !leafMaterial) {
        console.warn("Tree materials are missing from the scene.");
        return;
    }

    // Define the coordinates where the trees will be placed
    const treeCoordinates = [
        new BABYLON.Vector3(78.3985, 5.1848, -11.2018),
        new BABYLON.Vector3(47.5043, 5.1848, -36.9549),
        new BABYLON.Vector3(-39.5430, 5.1848, -44.9435),
        new BABYLON.Vector3(-54.0394, 5.1848, -22.0382),
        new BABYLON.Vector3(57.1332, 5.1848, 77.0256),
    ];

    const treeTemplates = createTreeTemplates(20, 15, 5, trunkMaterial, leafMaterial, _this.scene);
    if (!treeTemplates) {
        return;
    }

    treeCoordinates.forEach((position, index) => {
        instantiateTree(treeTemplates, position, index, _this.scene);
    });
}

function createTreeTemplates(
    sizeBranch: number,
    sizeTrunk: number,
    radius: number,
    trunkMaterial: BABYLON.Material,
    leafMaterial: BABYLON.Material,
    scene: BABYLON.Scene
): TreeTemplates | null {
    const leaves = BABYLON.MeshBuilder.CreateSphere("tree-leaves", { segments: 2, diameter: sizeBranch }, scene);

    const positions = leaves.getVerticesData(BABYLON.VertexBuffer.PositionKind) as number[];
    const indices = leaves.getIndices();
    if (!positions || !indices) {
        console.error("Failed to retrieve vertices data or indices.");
        return null;
    }

    const numberOfPoints = positions.length / 3;
    const pointMap: Array<{ point: BABYLON.Vector3; indices: number[] }> = [];

    for (let i = 0; i < numberOfPoints; i++) {
        const p = new BABYLON.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);

        let found = false;
        for (let index = 0; index < pointMap.length && !found; index++) {
            const current = pointMap[index];
            if (current.point.equals(p) || current.point.subtract(p).lengthSquared() < 0.01) {
                current.indices.push(i * 3);
                found = true;
            }
        }

        if (!found) {
            pointMap.push({ point: p, indices: [i * 3] });
        }
    }

    const randomNumber = (min: number, max: number): number => {
        if (min === max) return min;
        const random = Math.random();
        return (random * (max - min)) + min;
    };

    pointMap.forEach(({ indices: indicesArray }) => {
        const min = -sizeBranch / 10;
        const max = sizeBranch / 10;
        const rx = randomNumber(min, max);
        const ry = randomNumber(min, max);
        const rz = randomNumber(min, max);

        indicesArray.forEach((i) => {
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
    leaves.isPickable = false;

    const trunk = BABYLON.MeshBuilder.CreateCylinder("tree-trunk", {
        height: sizeTrunk,
        diameterTop: Math.max(radius - 2, 1),
        diameterBottom: radius,
        tessellation: 10,
        subdivisions: 2
    }, scene);

    trunk.material = trunkMaterial;
    trunk.convertToFlatShadedMesh();
    trunk.isPickable = false;

    leaves.position.y = (sizeTrunk + sizeBranch) / 2 - 2;

    return { leaves, trunk };
}

function instantiateTree(templates: TreeTemplates, position: BABYLON.Vector3, index: number, scene: BABYLON.Scene): void {
    const tree = new BABYLON.TransformNode(`tree-${index}`, scene);
    tree.position.copyFrom(position);

    const leaves = index === 0 ? templates.leaves : templates.leaves.createInstance(`tree-leaves-${index}`);
    const trunk = index === 0 ? templates.trunk : templates.trunk.clone(`tree-trunk-${index}`);

    if (!trunk) {
        console.error(`Failed to create trunk mesh for tree ${index}`);
        return;
    }

    leaves.parent = tree;
    trunk.parent = tree;
    leaves.computeWorldMatrix(true);
    trunk.computeWorldMatrix(true);

    trunk.physicsImpostor = new BABYLON.PhysicsImpostor(trunk, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0 }, scene);
}
