import 'chai';
import 'sinon';
import 'babylonjs';

import {Game} from './../src/index';
//import '../dist/bundle';

describe('main', () => {
  before(function() {
    // create a canvas element
    this.canvas = document.createElement('renderCanvas');
    document.body.appendChild(this.canvas);

    // create a Babylon.js engine
    //window.game = new window.game.Game()
  });

  after(function() {
    // dispose of the engine and remove the canvas element
    //this.engine.dispose();
    document.body.removeChild(this.canvas);
  });

  it('should do something', () => {
    // arrange
    // act
    // assert
  });
});