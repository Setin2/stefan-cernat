import { ScriptMap } from "./tools";

/**
 * Defines the interface that exposes all exported scripts in this project.
 */
export interface ISceneScriptMap {
	"src/scenes/play.ts": ScriptMap;
	"src/scenes/tank.ts": ScriptMap;
}

/**
 * Defines the map of all available scripts in the project.
 */
export const scriptsMap: ISceneScriptMap = {
	"src/scenes/play.ts": require("./play"),
	"src/scenes/tank.ts": require("./tank"),
}
