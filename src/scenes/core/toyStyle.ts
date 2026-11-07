import * as BABYLON from "@babylonjs/core";
import { clamp } from "./math";

/**
 * Shared "toy" look used by the tank, trees and bricks: glossy plastic PBR materials lit by a
 * small generated sky environment, plus helpers for building rounded shapes.
 */

export type ToyMaterialOptions = {
    roughness?: number;
    metallic?: number;
    /** Strength of the glossy varnish layer (0 = none). */
    clearCoat?: number;
};

const environments = new WeakMap<BABYLON.Scene, BABYLON.RawCubeTexture>();

/** One shared environment texture per scene. */
export function getToyEnvironment(scene: BABYLON.Scene): BABYLON.RawCubeTexture {
    let environment = environments.get(scene);
    if (!environment) {
        environment = createToyEnvironment(scene);
        environments.set(scene, environment);
    }
    return environment;
}

/** Plastic-looking PBR material; `hex` is an sRGB colour like "#F67FAA". */
export function createToyMaterial(scene: BABYLON.Scene, name: string, hex: string, options: ToyMaterialOptions = {}): BABYLON.PBRMaterial {
    const material = new BABYLON.PBRMaterial(name, scene);
    material.albedoColor = BABYLON.Color3.FromHexString(hex).toLinearSpace();
    material.metallic = options.metallic ?? 0;
    material.roughness = options.roughness ?? 0.45;
    material.reflectionTexture = getToyEnvironment(scene);
    material.environmentIntensity = 0.6;
    const clearCoat = options.clearCoat ?? 0;
    if (clearCoat > 0) {
        // Glossy varnish layer: crisp highlights on top of the softer plastic underneath.
        material.clearCoat.isEnabled = true;
        material.clearCoat.intensity = clearCoat;
        material.clearCoat.roughness = 0.12;
    }
    return material;
}

/**
 * The scene has no environment map, so PBR plastic would only be lit by the direct lights and
 * look flat. This builds a tiny sky-to-ground gradient cube map for the toy materials (tank, trees, bricks):
 * it gives the plastic soft sky-coloured fill from above, darker undersides, and reflections for
 * the glossy highlights. It only depends on height, so face orientation doesn't matter.
 */
function createToyEnvironment(scene: BABYLON.Scene): BABYLON.RawCubeTexture {
    const size = 32;
    const zenith = BABYLON.Color3.FromHexString("#D6E4FF");
    const sky = BABYLON.Color3.FromHexString("#F4F1FF");
    const horizon = BABYLON.Color3.FromHexString("#FFE6D2");
    const ground = BABYLON.Color3.FromHexString("#5E7552");
    const color = new BABYLON.Color3();

    const faceNames = ["right", "left", "up", "down", "front", "back"] as const;
    const faceAxes: Record<typeof faceNames[number], [BABYLON.Vector3, BABYLON.Vector3, BABYLON.Vector3]> = {
        right: [new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, 0, -1), new BABYLON.Vector3(0, -1, 0)],
        left: [new BABYLON.Vector3(-1, 0, 0), new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, -1, 0)],
        up: [new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, 0, 1)],
        down: [new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, 0, -1)],
        front: [new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, -1, 0)],
        back: [new BABYLON.Vector3(0, 0, -1), new BABYLON.Vector3(-1, 0, 0), new BABYLON.Vector3(0, -1, 0)],
    };

    const faces = faceNames.map((faceName) => {
        const [normal, axisX, axisY] = faceAxes[faceName];
        const data = new Uint8Array(size * size * 4);
        for (let py = 0; py < size; py++) {
            for (let px = 0; px < size; px++) {
                const u = (((px + 0.5) / size) * 2) - 1;
                const v = (((py + 0.5) / size) * 2) - 1;
                const dirY = (normal.y + (axisX.y * u) + (axisY.y * v)) / Math.hypot(
                    normal.x + (axisX.x * u) + (axisY.x * v),
                    normal.y + (axisX.y * u) + (axisY.y * v),
                    normal.z + (axisX.z * u) + (axisY.z * v),
                );

                if (dirY >= 0) {
                    BABYLON.Color3.LerpToRef(horizon, sky, Math.min(1, dirY * 2.5), color);
                    BABYLON.Color3.LerpToRef(color, zenith, Math.max(0, (dirY - 0.4) / 0.6), color);
                    if (dirY > 0.82) {
                        // Bright "studio light" cap for crisp highlights on top surfaces.
                        BABYLON.Color3.LerpToRef(color, BABYLON.Color3.White(), Math.min(1, (dirY - 0.82) / 0.08), color);
                    }
                } else {
                    BABYLON.Color3.LerpToRef(horizon, ground, Math.min(1, -dirY * 4), color);
                }

                const offset = ((py * size) + px) * 4;
                data[offset] = Math.round(color.r * 255);
                data[offset + 1] = Math.round(color.g * 255);
                data[offset + 2] = Math.round(color.b * 255);
                data[offset + 3] = 255;
            }
        }
        return data;
    });

    const texture = new BABYLON.RawCubeTexture(scene, faces, size, BABYLON.Constants.TEXTUREFORMAT_RGBA, BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE, true);
    texture.gammaSpace = true;
    texture.name = "toy-environment";

    // Diffuse image-based lighting needs spherical harmonics; compute them from the same data on
    // the CPU instead of reading the texture back from the GPU.
    texture.sphericalPolynomial = BABYLON.CubeMapToSphericalPolynomialTools.ConvertCubeMapToSphericalPolynomial({
        size,
        right: faces[0],
        left: faces[1],
        up: faces[2],
        down: faces[3],
        front: faces[4],
        back: faces[5],
        format: BABYLON.Constants.TEXTUREFORMAT_RGBA,
        type: BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE,
        gammaSpace: true,
    });

    return texture;
}

/** Hidden source mesh for instances. */
export function createTemplate(mesh: BABYLON.Mesh, material: BABYLON.Material): BABYLON.Mesh {
    mesh.material = material;
    mesh.isVisible = false;
    mesh.isPickable = false;
    return mesh;
}

/**
 * Box with all edges and corners rounded by `radius`: each face is a grid that is extra dense
 * near the edges, and every vertex is pushed onto the rounded surface. `taper` below 1 makes the
 * top narrower than the bottom (above 1, wider).
 */
export function createRoundedBox(name: string, width: number, height: number, depth: number, radius: number, scene: BABYLON.Scene, segments = 4, taper = 1): BABYLON.Mesh {
    const half = [width / 2, height / 2, depth / 2];
    const r = Math.min(radius, ...half);
    const inner = half.map((h) => h - r);
    const samples = half.map((h, axis) => {
        const i = inner[axis];
        const values: number[] = [];
        for (let k = 0; k <= segments; k++) {
            values.push(-h + ((h - i) * k / segments));
        }
        for (let k = 0; k <= segments; k++) {
            const value = i + ((h - i) * k / segments);
            if (value > values[values.length - 1] + 1e-6) {
                values.push(value);
            }
        }
        return values;
    });

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const point = [0, 0, 0];

    for (let axis = 0; axis < 3; axis++) {
        for (const sign of [-1, 1]) {
            const uAxis = (axis + 1) % 3;
            const vAxis = (axis + 2) % 3;
            const uValues = samples[uAxis];
            const vValues = samples[vAxis];
            const start = positions.length / 3;

            for (const u of uValues) {
                for (const v of vValues) {
                    point[axis] = sign * half[axis];
                    point[uAxis] = u;
                    point[vAxis] = v;

                    const nearest = point.map((value, i) => clamp(value, -inner[i], inner[i]));
                    const offset = point.map((value, i) => value - nearest[i]);
                    const length = Math.hypot(offset[0], offset[1], offset[2]);
                    const normal = length > 1e-9 ? offset.map((value) => value / length) : [0, 0, 0].map((_, i) => (i === axis ? sign : 0));

                    const x = nearest[0] + (normal[0] * r);
                    const y = nearest[1] + (normal[1] * r);
                    const z = nearest[2] + (normal[2] * r);

                    // Taper: scale x and z linearly with height, from 1 at the bottom to `taper` at
                    // the top. Normals follow the inverse transpose of that deformation.
                    const scale = 1 - ((1 - taper) * ((y + half[1]) / (2 * half[1])));
                    const scaleSlope = -(1 - taper) / (2 * half[1]);
                    const nx = normal[0] / scale;
                    const ny = normal[1] - ((x * scaleSlope * normal[0]) / scale) - ((z * scaleSlope * normal[2]) / scale);
                    const nz = normal[2] / scale;
                    const normalLength = Math.hypot(nx, ny, nz);

                    positions.push(x * scale, y, z * scale);
                    normals.push(nx / normalLength, ny / normalLength, nz / normalLength);
                }
            }

            const columns = vValues.length;
            for (let ui = 0; ui < uValues.length - 1; ui++) {
                for (let vi = 0; vi < columns - 1; vi++) {
                    const a = start + (ui * columns) + vi;
                    const b = start + ((ui + 1) * columns) + vi;
                    const c = start + ((ui + 1) * columns) + vi + 1;
                    const d = start + (ui * columns) + vi + 1;
                    pushOrientedTriangle(indices, positions, normals, a, b, c);
                    pushOrientedTriangle(indices, positions, normals, a, c, d);
                }
            }
        }
    }

    return buildMesh(name, positions, normals, indices, scene);
}

/**
 * Adds a triangle wound the way Babylon expects for a front face whose outward normal is the
 * vertex normal (Babylon's front faces have (b - a) x (c - a) pointing away from the normal).
 */
export function pushOrientedTriangle(indices: number[], positions: number[], normals: number[], a: number, b: number, c: number): void {
    const ax = positions[a * 3], ay = positions[(a * 3) + 1], az = positions[(a * 3) + 2];
    const e1x = positions[b * 3] - ax, e1y = positions[(b * 3) + 1] - ay, e1z = positions[(b * 3) + 2] - az;
    const e2x = positions[c * 3] - ax, e2y = positions[(c * 3) + 1] - ay, e2z = positions[(c * 3) + 2] - az;
    const cx = (e1y * e2z) - (e1z * e2y);
    const cy = (e1z * e2x) - (e1x * e2z);
    const cz = (e1x * e2y) - (e1y * e2x);
    const nx = normals[a * 3] + normals[b * 3] + normals[c * 3];
    const ny = normals[(a * 3) + 1] + normals[(b * 3) + 1] + normals[(c * 3) + 1];
    const nz = normals[(a * 3) + 2] + normals[(b * 3) + 2] + normals[(c * 3) + 2];

    if ((cx * nx) + (cy * ny) + (cz * nz) > 0) {
        indices.push(a, c, b);
    } else {
        indices.push(a, b, c);
    }
}

export function buildMesh(name: string, positions: number[], normals: number[], indices: number[], scene: BABYLON.Scene, uvs?: number[]): BABYLON.Mesh {
    const mesh = new BABYLON.Mesh(name, scene);
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.indices = indices;
    if (uvs) {
        vertexData.uvs = uvs;
    }
    vertexData.applyToMesh(mesh);
    return mesh;
}

/** Small deterministic random generator, so procedural shapes look the same on every visit. */
export function createRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * A soft, slightly lumpy ball (radius about 1): an icosphere pushed in and out by a smooth
 * pattern, with smooth normals so it reads as a rounded toy shape rather than a faceted rock.
 */
export function createLumpyBall(name: string, scene: BABYLON.Scene, random: () => number, lumpiness = 1, subdivisions = 3): BABYLON.Mesh {
    const ball = BABYLON.MeshBuilder.CreateIcoSphere(name, { radius: 1, subdivisions }, scene);
    const positions = ball.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const indices = ball.getIndices();
    if (!positions || !indices) {
        return ball;
    }

    const a = random() * 10;
    const b = random() * 10;
    const c = random() * 10;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        const bump = 1 + (lumpiness * (
            (0.08 * Math.sin((x * 3.1) + a) * Math.sin((y * 2.7) + b))
            + (0.06 * Math.sin((z * 3.7) + c) * Math.cos((x * 2.3) + b))
        ));
        positions[i] = x * bump;
        positions[i + 1] = y * bump;
        positions[i + 2] = z * bump;
    }

    const normals: number[] = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    ball.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    ball.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    return ball;
}

/** Adds many copies of a mesh with one draw call (thin instances). */
export function addThinInstances(mesh: BABYLON.Mesh, matrices: BABYLON.Matrix[]): void {
    if (!matrices.length) {
        mesh.setEnabled(false);
        return;
    }
    mesh.thinInstanceAdd(matrices, true);
    mesh.thinInstanceRefreshBoundingInfo(false);
    mesh.isPickable = false;
}

/**
 * Extrudes a 2D outline (in X/Y, any winding) into a slab `depth` thick, centred on z = 0 with its
 * front facing -Z, and a rounded bevel of size `bevel` on both edges. The outline must be visible
 * in full from its centroid (true for all the shapes here), so the caps can be triangle fans.
 */
export function extrudeOutline(name: string, outline: [number, number][], depth: number, bevel: number, scene: BABYLON.Scene): BABYLON.Mesh {
    const count = outline.length;
    let cx = 0;
    let cy = 0;
    for (const [x, y] of outline) {
        cx += x;
        cy += y;
    }
    cx /= count;
    cy /= count;

    // Outward 2D normal at each vertex (average of the two edge normals).
    const outward = outline.map((point, i) => {
        const [px, py] = outline[(i + count - 1) % count];
        const [nx, ny] = outline[(i + 1) % count];
        let ox = ny - py;
        let oy = -(nx - px);
        const length = Math.hypot(ox, oy) || 1;
        ox /= length;
        oy /= length;
        if ((ox * (point[0] - cx)) + (oy * (point[1] - cy)) < 0) {
            ox = -ox;
            oy = -oy;
        }
        return [ox, oy];
    });

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const front = -depth / 2;
    const back = depth / 2;

    // Rings from front to back: inset front edge, outer front edge, outer back edge, inset back edge.
    const rings: { z: number; inset: number; nz: number }[] = [
        { z: front, inset: bevel, nz: -0.8 },
        { z: front + bevel, inset: 0, nz: -0.25 },
        { z: back - bevel, inset: 0, nz: 0.25 },
        { z: back, inset: bevel, nz: 0.8 },
    ];
    const ringStart = rings.map((ring) => {
        const start = positions.length / 3;
        outline.forEach(([x, y], i) => {
            const [ox, oy] = outward[i];
            positions.push(x - (ox * ring.inset), y - (oy * ring.inset), ring.z);
            const planar = Math.sqrt(1 - (ring.nz * ring.nz));
            normals.push(ox * planar, oy * planar, ring.nz);
        });
        return start;
    });
    for (let r = 0; r < rings.length - 1; r++) {
        for (let i = 0; i < count; i++) {
            const j = (i + 1) % count;
            const a = ringStart[r] + i;
            const b = ringStart[r] + j;
            const c = ringStart[r + 1] + i;
            const d = ringStart[r + 1] + j;
            pushOrientedTriangle(indices, positions, normals, a, b, c);
            pushOrientedTriangle(indices, positions, normals, b, d, c);
        }
    }

    // Flat caps.
    for (const [ringIndex, z, nz] of [[0, front, -1], [3, back, 1]] as const) {
        const center = positions.length / 3;
        positions.push(cx, cy, z);
        normals.push(0, 0, nz);
        const start = positions.length / 3;
        for (let i = 0; i < count; i++) {
            const source = (ringStart[ringIndex] + i) * 3;
            positions.push(positions[source], positions[source + 1], z);
            normals.push(0, 0, nz);
        }
        for (let i = 0; i < count; i++) {
            pushOrientedTriangle(indices, positions, normals, center, start + i, start + ((i + 1) % count));
        }
    }

    // Planar UVs, so these can be merged with other meshes (merging needs matching attributes).
    const uvs: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        uvs.push(positions[i], positions[i + 1]);
    }
    return buildMesh(name, positions, normals, indices, scene, uvs);
}
