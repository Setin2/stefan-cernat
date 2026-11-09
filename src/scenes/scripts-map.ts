import type { ScriptMap } from "./tools";

/**
 * Defines the interface that exposes all exported scripts in this project.
 */
export interface ISceneScriptMap {
    "src/scenes/play.ts": ScriptMap;
}

/**
 * Defines the map of all available scripts in the project.
 */
export const scriptsMap: ISceneScriptMap = {
    // The Babylon.js Editor's script loader expects the whole module object, loaded with require().
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "src/scenes/play.ts": require("./play"),
};
