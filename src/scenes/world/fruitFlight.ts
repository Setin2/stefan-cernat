/**
 * How Fruit Rush's fruit moves (see fruitRush.ts), kept free of Babylon so it can be tested on its
 * own: thrown on a ballistic arc that lands on a chosen spot, bouncing a couple of times, rolling
 * to a stop, then spoiling (shrinking away) after a while on the ground.
 */

export type Vec3 = { x: number; y: number; z: number };

export const FLIGHT = {
    gravity: 40,
    /** Landing faster than this (downwards) bounces; slower just stops. */
    bounceSpeed: 5,
    /** Kept of the vertical / horizontal speed on a bounce. */
    bounce: 0.4,
    bounceFriction: 0.6,
    /** How fast rolling slows down (per second, exponential). */
    rollFriction: 2.5,
    /** Seconds on the ground before spoiling starts, and how long spoiling takes. */
    lifetime: 6,
    spoilSeconds: 0.8,
};

/** The launch velocity that takes a fruit from `from` to `to` in `seconds`, under gravity. */
export function launchVelocity(from: Vec3, to: Vec3, seconds: number, gravity = FLIGHT.gravity): Vec3 {
    return {
        x: (to.x - from.x) / seconds,
        y: ((to.y - from.y) + (0.5 * gravity * seconds * seconds)) / seconds,
        z: (to.z - from.z) / seconds,
    };
}

export type FlyingFruit = {
    position: Vec3;
    velocity: Vec3;
    /** Seconds since it first touched the ground; negative while it's still in its first flight. */
    groundTime: number;
};

/**
 * Advances a fruit by `dt` seconds. `restY` is the height of its centre when lying on the ground.
 * Returns how much it has spoiled: 0 while fresh, rising to 1 when it has shrunk away.
 */
export function stepFruit(fruit: FlyingFruit, dt: number, restY: number): number {
    const { position, velocity } = fruit;
    velocity.y -= FLIGHT.gravity * dt;
    position.x += velocity.x * dt;
    position.y += velocity.y * dt;
    position.z += velocity.z * dt;
    if (position.y <= restY) {
        position.y = restY;
        if (fruit.groundTime < 0) {
            fruit.groundTime = 0;
        }
        if (velocity.y < -FLIGHT.bounceSpeed) {
            velocity.y *= -FLIGHT.bounce;
            velocity.x *= FLIGHT.bounceFriction;
            velocity.z *= FLIGHT.bounceFriction;
        } else {
            velocity.y = 0;
        }
    }
    if (fruit.groundTime >= 0) {
        fruit.groundTime += dt;
        const friction = Math.exp(-FLIGHT.rollFriction * dt);
        velocity.x *= friction;
        velocity.z *= friction;
    }
    return spoilage(fruit.groundTime);
}

/** 0 while fresh, then rising to 1 over spoilSeconds once its time on the ground is up. */
export function spoilage(groundTime: number): number {
    return Math.max(0, Math.min(1, (groundTime - FLIGHT.lifetime) / FLIGHT.spoilSeconds));
}

/** Whether a tank centred at (x, z) picks up the fruit: close enough, and the fruit low enough. */
export function canCollect(fruit: Vec3, tankX: number, tankZ: number, restY: number, radius: number): boolean {
    return fruit.y < restY + 6 && Math.hypot(fruit.x - tankX, fruit.z - tankZ) < radius;
}
