import { ScriptMap } from "./tools";

/**
 * Defines the interface that exposes all exported scripts in this project.
 */
export interface ISceneScriptMap {
	"src/scenes/bricks.ts": ScriptMap;
	"src/scenes/play.ts": ScriptMap;
	"src/scenes/trees.ts": ScriptMap;
}

/**
 * Defines the map of all available scripts in the project.
 */
export const scriptsMap: ISceneScriptMap = {
	"src/scenes/bricks.ts": require("./bricks"),
	"src/scenes/play.ts": require("./play"),
	"src/scenes/trees.ts": require("./trees"),
}
