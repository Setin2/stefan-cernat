import * as BABYLON from "../babylon";

import { getPlaygroundHeight } from "./playground";
import { addThinInstances, buildMesh, createRandom, pushOrientedTriangle } from "../core/toyStyle";
import { smoothStep } from "../core/math";
import { GROUND_Y } from "../core/constants";

/**
 * The road network:
 *
 * - a winding main loop past the start, the targets on the podium, the Berserk
 *   corner and AI trophies, the projects and back past the signpost;
 * - a stunt road that branches off it, runs through the cone slalom and under the jump ramps, then
 *   sweeps north and back into the loop;
 * - a hump road that leaves the stunt road, goes over the hump bridge and rejoins it before the
 *   jump;
 * - a path out towards the brick tower that thins out into stepping stones on the grass;
 * - a path to the work corner, which ends in stepping stones in front of it.
 *
 * To keep them from dominating the view, roads are not solid ribbons: they are laid as separate
 * paving slabs with thin strips of grass between them (two staggered rows on the main road,
 * single slabs with wider gaps and the odd missing one on side paths), with slightly ragged outer
 * edges and a few pebbles alongside. Side paths are narrower and wobble a little in width. The
 * cobble texture is mapped in world space, so slabs of different roads match where they meet.
 */

const ROAD_Y = GROUND_Y + 0.06;
/** Clearance kept around roads for decorations. */
const EDGE_MARGIN = 1;
/** World units per repeat of the cobble texture. */
const TEXTURE_SIZE = 8;
const SAMPLE_SPACING = 1.5;
/** How far before an open end a road starts to narrow. */
const FADE_LENGTH = 16;

type Road = {
    name: string;
    width: number;
    /** A closed loop, or a path from its first to its last point. */
    closed?: boolean;
    /** Main road: two rows of slabs, steady width. Side paths: single slabs, wobbly width, gaps. */
    main?: boolean;
    /** The far end narrows and breaks up into stepping stones instead of joining another road. */
    fadeOut?: boolean;
    points: [number, number][];
};

const ROADS: Road[] = [
    {
        name: "loop",
        width: 12,
        closed: true,
        main: true,
        points: [[0, 0], [26, 10], [50, 24], [57, 48], [46, 74], [28, 94], [2, 92], [-22, 76], [-44, 56], [-60, 32], [-60, 10], [-46, -6], [-24, -8]],
    },
    {
        // From the loop near the start, through the slalom and under both ramps, then round the
        // east side and back into the loop north of the podium.
        name: "stunt-road",
        width: 10,
        points: [[8, 3], [22, -12], [38, -22], [56, -25], [80, -25], [113, -25], [147, -25], [170, -20], [182, 2], [168, 36], [134, 54], [98, 60], [74, 67], [55, 62]],
    },
    {
        // Off the stunt road, over the hump bridge, and back onto it before the jump.
        name: "hump-road",
        width: 10,
        points: [[30, -19], [27, -38], [18, -58], [26, -70], [41, -70], [58, -71], [76, -74], [94, -62], [101, -42], [100, -28]],
    },
    {
        name: "tower-path",
        width: 9,
        fadeOut: true,
        points: [[-48, 52], [-64, 64], [-82, 70], [-98, 80]],
    },
    {
        name: "work-path",
        width: 9,
        fadeOut: true,
        points: [[-35, -7], [-38, -32], [-34, -58]],
    },
];

type Sample = {
    x: number;
    z: number;
    /** Unit direction of travel. */
    dx: number;
    dz: number;
    /** Half the road's width here. */
    half: number;
};

const ROAD_SAMPLES: Sample[][] = ROADS.map((road, index) => {
    const samples = sampleCurve(road.points, SAMPLE_SPACING, !!road.closed);
    const length = samples.length * SAMPLE_SPACING;
    samples.forEach((sample, i) => {
        const distance = i * SAMPLE_SPACING;
        let half = road.width / 2;
        if (!road.main) {
            // Gentle, uneven wobble so side roads don't look machine-made.
            half *= 1 + (0.07 * Math.sin((distance * 0.21) + index)) + (0.04 * Math.sin((distance * 0.57) + (index * 2.3)));
        }
        if (road.fadeOut) {
            const remaining = length - distance;
            half *= 0.35 + (0.65 * smoothStep(0, FADE_LENGTH, remaining));
        }
        sample.half = half;
    });
    return samples;
});

/**
 * Areas (axis-aligned squares) along the roads that decorations keep clear of.
 */
export function getRoadClearAreas(): { minX: number; maxX: number; minZ: number; maxZ: number }[] {
    const areas: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
    for (const samples of ROAD_SAMPLES) {
        for (let i = 0; i < samples.length; i += 3) {
            const s = samples[i];
            const half = s.half + EDGE_MARGIN + 1.5;
            areas.push({ minX: s.x - half, maxX: s.x + half, minZ: s.z - half, maxZ: s.z + half });
        }
    }
    return areas;
}

export function createRoadNetwork(scene: BABYLON.Scene, cobbles: BABYLON.Material, pebbles: BABYLON.Mesh[]): void {
    const random = createRandom(31);
    const pebbleMatrices: BABYLON.Matrix[][] = pebbles.map(() => []);
    const addPebble = (x: number, z: number) => {
        if (getPlaygroundHeight(x, z) > 0) {
            return;
        }
        const size = 0.45 + (random() * 0.45);
        pebbleMatrices[Math.floor(random() * pebbles.length)].push(BABYLON.Matrix.Compose(
            new BABYLON.Vector3(size, size * 0.55, size),
            BABYLON.Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, 0, 0),
            new BABYLON.Vector3(x, GROUND_Y + 0.05, z),
        ));
    };

    const surfaces: BABYLON.Mesh[] = [];

    ROAD_SAMPLES.forEach((samples, roadIndex) => {
        const road = ROADS[roadIndex];
        surfaces.push(...buildSlabs(`road-${road.name}`, samples, !!road.main, random, scene));

        // A loose scatter of pebbles along both edges (not where another road joins).
        for (const side of [-1, 1]) {
            const edgeOffset = 0.8;
            const points: EdgePoint[] = samples.map((s) => ({
                x: s.x - (s.dz * side * (s.half + edgeOffset)),
                z: s.z + (s.dx * side * (s.half + edgeOffset)),
                nx: -s.dz * side,
                nz: s.dx * side,
            }));
            if (road.closed) {
                points.push(points[0]);
            }
            for (const run of splitRuns(points, (p) => !isInsideOtherRoad(p.x, p.z, roadIndex))) {
                for (const p of run) {
                    if (random() < 0.18) {
                        const out = random() * 1.4;
                        addPebble(p.x + (p.nx * out), p.z + (p.nz * out));
                    }
                }
            }
        }

        if (road.fadeOut) {
            surfaces.push(...buildSteppingStones(road.name, samples, random, scene));
        }
    });

    const roadMesh = BABYLON.Mesh.MergeMeshes(surfaces, true, true);
    if (roadMesh) {
        roadMesh.name = "road-network";
        roadMesh.material = cobbles;
        roadMesh.isPickable = false;
    }

    pebbles.forEach((mesh, i) => addThinInstances(mesh, pebbleMatrices[i]));
}

type EdgePoint = { x: number; z: number; /** Outward direction. */ nx: number; nz: number };

// ==================================================================== Geometry

/**
 * Where a path fades out: flat cobble stones continuing along its direction, getting smaller and
 * further apart and wandering a little to the sides.
 */
function buildSteppingStones(name: string, samples: Sample[], random: () => number, scene: BABYLON.Scene): BABYLON.Mesh[] {
    const end = samples[samples.length - 1];
    const stones: BABYLON.Mesh[] = [];
    let distance = 1.5;
    for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const sideways = (random() - 0.5) * (2.4 + (t * 2));
        const x = end.x + (end.dx * distance) - (end.dz * sideways);
        const z = end.z + (end.dz * distance) + (end.dx * sideways);
        const radius = (1.5 - (t * 0.8)) * (0.85 + (random() * 0.3));
        stones.push(buildDisc(`road-${name}-stone-${i}`, x, z, radius, radius * (0.75 + (random() * 0.25)), random() * Math.PI, ROAD_Y, scene));
        distance += 2.4 + (t * 2.6) + (random() * 0.8);
    }
    return stones;
}

/** Catmull-Rom curve through the points (optionally closed), resampled at even spacing. */
function sampleCurve(points: [number, number][], spacing: number, closed: boolean): Sample[] {
    const dense: BABYLON.Vector2[] = [];
    const p = points.map(([x, z]) => new BABYLON.Vector2(x, z));
    const n = p.length;
    const at = (i: number) => (closed ? p[((i % n) + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
    const segments = closed ? n : n - 1;
    for (let i = 0; i < segments; i++) {
        for (let t = 0; t < 1; t += 0.02) {
            dense.push(BABYLON.Vector2.CatmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), t));
        }
    }
    dense.push(closed ? p[0] : p[n - 1]);

    const samples: BABYLON.Vector2[] = [dense[0]];
    let carried = 0;
    for (let i = 1; i < dense.length; i++) {
        let from = dense[i - 1];
        const to = dense[i];
        let segment = BABYLON.Vector2.Distance(from, to);
        while (carried + segment >= spacing) {
            const t = (spacing - carried) / segment;
            const point = BABYLON.Vector2.Lerp(from, to, t);
            samples.push(point);
            segment -= spacing - carried;
            from = point;
            carried = 0;
        }
        carried += segment;
    }
    if (!closed && BABYLON.Vector2.Distance(samples[samples.length - 1], dense[dense.length - 1]) > spacing * 0.3) {
        samples.push(dense[dense.length - 1]);
    }

    const count = samples.length;
    return samples.map((point, i) => {
        const prev = closed ? samples[(i - 1 + count) % count] : samples[Math.max(0, i - 1)];
        const next = closed ? samples[(i + 1) % count] : samples[Math.min(count - 1, i + 1)];
        const direction = next.subtract(prev).normalize();
        return { x: point.x, z: point.y, dx: direction.x, dz: direction.y, half: 0 };
    });
}

/** True if a point lies on another road's surface. */
function isInsideOtherRoad(x: number, z: number, roadIndex: number): boolean {
    return ROAD_SAMPLES.some((samples, i) => {
        if (i === roadIndex) {
            return false;
        }
        const segments = ROADS[i].closed ? samples.length : samples.length - 1;
        for (let k = 0; k < segments; k++) {
            const a = samples[k];
            const b = samples[(k + 1) % samples.length];
            const abx = b.x - a.x;
            const abz = b.z - a.z;
            const t = Math.max(0, Math.min(1, (((x - a.x) * abx) + ((z - a.z) * abz)) / ((abx * abx) + (abz * abz) || 1)));
            const half = a.half + ((b.half - a.half) * t);
            if (Math.hypot(x - (a.x + (abx * t)), z - (a.z + (abz * t))) < half + 0.4) {
                return true;
            }
        }
        return false;
    });
}

/** Splits a sequence of points into the runs where `keep` holds. */
function splitRuns<T>(points: T[], keep: (point: T) => boolean): T[][] {
    const runs: T[][] = [];
    let current: T[] = [];
    for (const point of points) {
        if (keep(point)) {
            current.push(point);
        } else if (current.length) {
            runs.push(current);
            current = [];
        }
    }
    if (current.length) {
        runs.push(current);
    }
    return runs;
}

/**
 * The road surface as separate paving slabs along the samples. Each slab covers a few samples,
 * is pulled back a little at both ends (leaving a strip of grass to the next one) and has a
 * slightly ragged outer edge. The main road has two rows of slabs split down the middle, with the
 * joints staggered; side paths have one row, wider gaps and the occasional missing slab.
 */
function buildSlabs(name: string, samples: Sample[], main: boolean, random: () => number, scene: BABYLON.Scene): BABYLON.Mesh[] {
    const slabs: BABYLON.Mesh[] = [];
    // Rows across the road, as fractions of the half-width (-1 = left edge, 1 = right edge).
    const rows: { from: number; to: number }[] = main
        ? [{ from: -1, to: -0.03 }, { from: 0.03, to: 1 }]
        : [{ from: -1, to: 1 }];

    rows.forEach((row, rowIndex) => {
        // Stagger the joints between rows.
        let start = main && rowIndex === 1 ? 2 : 0;
        while (start < samples.length - 1) {
            const span = main ? 4 + Math.floor(random() * 3) : 3 + Math.floor(random() * 3);
            const end = Math.min(samples.length - 1, start + span);
            const skip = !main && random() < 0.1;
            if (!skip && end - start >= 1) {
                const gap = main ? 0.35 + (random() * 0.25) : 0.55 + (random() * 0.5);
                const narrow = main ? 1 : 0.88 + (random() * 0.12);
                slabs.push(buildSlab(`${name}-slab-${rowIndex}-${start}`, samples.slice(start, end + 1), row, gap, narrow, random, scene));
            }
            start = end;
        }
    });
    return slabs;
}

function buildSlab(name: string, run: Sample[], row: { from: number; to: number }, gap: number, narrow: number, random: () => number, scene: BABYLON.Scene): BABYLON.Mesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const last = run.length - 1;
    run.forEach((s, i) => {
        // Pull the ends in along the road to leave a gap to the next slab.
        const pull = i === 0 ? gap / 2 : i === last ? -gap / 2 : 0;
        const cx = s.x + (s.dx * pull);
        const cz = s.z + (s.dz * pull);
        for (const edge of [row.from, row.to]) {
            // Outer edges are a little ragged; the joint down the middle stays straight.
            const outer = Math.abs(edge) > 0.5;
            const offset = s.half * narrow * edge + (outer ? Math.sign(edge) * (random() - 0.6) * 0.5 : 0);
            const x = cx - (s.dz * offset);
            const z = cz + (s.dx * offset);
            positions.push(x, ROAD_Y, z);
            normals.push(0, 1, 0);
            uvs.push(x / TEXTURE_SIZE, z / TEXTURE_SIZE);
        }
    });
    for (let i = 0; i < last; i++) {
        const a = i * 2;
        pushOrientedTriangle(indices, positions, normals, a, a + 1, a + 2);
        pushOrientedTriangle(indices, positions, normals, a + 1, a + 3, a + 2);
    }
    return buildMesh(name, positions, normals, indices, scene, uvs);
}

/** Flat (slightly oval) disc with world-space UVs, used for the stepping stones. */
function buildDisc(name: string, cx: number, cz: number, radiusX: number, radiusZ: number, rotation: number, y: number, scene: BABYLON.Scene): BABYLON.Mesh {
    const positions: number[] = [cx, y, cz];
    const normals: number[] = [0, 1, 0];
    const uvs: number[] = [cx / TEXTURE_SIZE, cz / TEXTURE_SIZE];
    const indices: number[] = [];
    const steps = 14;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const lx = Math.cos(angle) * radiusX;
        const lz = Math.sin(angle) * radiusZ;
        const x = cx + (lx * cos) - (lz * sin);
        const z = cz + (lx * sin) + (lz * cos);
        positions.push(x, y, z);
        normals.push(0, 1, 0);
        uvs.push(x / TEXTURE_SIZE, z / TEXTURE_SIZE);
    }
    for (let i = 0; i < steps; i++) {
        pushOrientedTriangle(indices, positions, normals, 0, 1 + i, 1 + ((i + 1) % steps));
    }
    return buildMesh(name, positions, normals, indices, scene, uvs);
}
