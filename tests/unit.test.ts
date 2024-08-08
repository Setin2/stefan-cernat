import Play from '../src/scenes/play';
import * as BABYLON from "@babylonjs/core";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import path from 'path';

describe('Play class', () => {
    let playInstance: Play;
    let mockScene: BABYLON.Scene;

    beforeEach((done) => {
        // Create a mock scene or use a real BABYLON.Scene if available
        const engine = new BABYLON.NullEngine();
        mockScene = new BABYLON.Scene(engine);

        // Load the scene from a .babylon file
        const babylonFilePath = path.resolve(__dirname, 'scenes/scene/scene.babylon');
        
        // Use SceneLoader to load the scene file
        SceneLoader.Load("", babylonFilePath, engine, (loadedScene) => {
            mockScene = loadedScene;

            console.log("Loading scene ------------------------------------")

            // Initialize the Play instance after the scene is loaded
            playInstance = Play.createInstance("TestPlayInstance", mockScene);
            
            // Call done() to indicate that the async setup is complete
            done();
        }, null, (scene, message, exception) => {
            // Handle loading errors
            console.error(`Error loading scene: ${message}`, exception);
            done.fail(`Error loading scene: ${message}`);
        });

        // Create an instance of Play with name and mockScene
        playInstance = Play.createInstance("TestPlayInstance", mockScene);
    });

    test('easterEgg method should log correct message', () => {
        console.log = jest.fn();
        playInstance.easterEgg();
        expect(console.log).toHaveBeenCalledWith("%c Very sly of you, but there is nothing to see here ;)", "color: #CE718F");
    });

    // Add more tests for other methods
});
