/** World-wide constants shared by the scene builders. */

/** Height of the ground plane's surface. */
export const GROUND_Y = -0.5;

/**
 * The fixed camera looks along (0.8, -0.6) in x/z. This yaw turns a mesh's local -Z (its front)
 * towards the camera, for signs and trophies that should face the player.
 */
export const FACE_CAMERA_YAW = Math.atan2(0.8, -0.6);
