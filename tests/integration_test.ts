// tests/play.integration.test.js
import * as BABYLON from '@babylonjs/core';
import Play from '../src/scenes/play';

describe('Play class integration', () => {
  let scene, engine, playInstance;

  beforeAll(() => {
    engine = new BABYLON.NullEngine(); // Use a NullEngine for non-rendering purposes
    scene = new BABYLON.Scene(engine);
  });

  beforeEach(() => {
    playInstance = Play.createInstance();
    playInstance.scene = scene;
  });

  test('onInitialize should set up the scene correctly', () => {
    jest.spyOn(playInstance, 'initializeGlobalVariables');
    jest.spyOn(playInstance, 'initializeTextures');
    jest.spyOn(playInstance, 'optimizeScene');

    playInstance.onInitialize();

    expect(playInstance.initializeGlobalVariables).toHaveBeenCalled();
    expect(playInstance.initializeTextures).toHaveBeenCalled();
    expect(playInstance.optimizeScene).toHaveBeenCalled();
  });

  // Add more integration tests
});
