// Runs before every test file (see jest.config.js).

// jsdom has no 2D canvas; the game draws labels and screens on canvases (DynamicTexture).
import "jest-canvas-mock";
import { Logger } from "@babylonjs/core/Misc/logger";

// Only Babylon's errors, not its "Babylon.js v5.19.0 - Null engine" banner for every scene.
Logger.LogLevels = Logger.ErrorLogLevel;
