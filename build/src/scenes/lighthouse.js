"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var node_1 = require("@babylonjs/core/node");
var BABYLON = require("@babylonjs/core");
/**
 * This represents a script that is attached to a node in the editor.
 * Available nodes are:
 *      - Meshes
 *      - Lights
 *      - Cameas
 *      - Transform nodes
 *
 * You can extend the desired class according to the node type.
 * Example:
 *      export default class MyMesh extends Mesh {
 *          public onUpdate(): void {
 *              this.rotation.y += 0.04;
 *          }
 *      }
 * The function "onInitialize" is called immediately after the constructor is called.
 * The functions "onStart" and "onUpdate" are called automatically.
 */
var MyScript = /** @class */ (function (_super) {
    __extends(MyScript, _super);
    /**
     * Override constructor.
     * @warn do not fill.
     */
    // @ts-ignore ignoring the super call as we don't want to re-init
    function MyScript() {
        var _this = this;
        return _this;
    }
    /**
     * Called on the node is being initialized.
     * This function is called immediatly after the constructor has been called.
     */
    MyScript.prototype.onInitialize = function () {
        // ...
    };
    /**
     * Called on the node has been fully initialized and is ready.
     */
    MyScript.prototype.onInitialized = function () {
        var _this = this;
        // ...
        var t = 0;
        this.glass = this.getScene().getMeshByName("lighthouse_glass");
        this.getScene().registerAfterRender(function () {
            if (t < 11) {
                _this.glass.rotate(BABYLON.Axis.X, 0.005);
                t += 0.04;
            }
            else if (t < 14) {
                _this.glass.rotate(BABYLON.Axis.Z, -0.005);
                t += 0.04;
            }
            else if (t < 17) {
                _this.glass.rotate(BABYLON.Axis.Z, 0.005);
                t += 0.04;
            }
            else if (t < 28) {
                _this.glass.rotate(BABYLON.Axis.X, -0.005);
                t += 0.04;
            }
            else if (t < 31) {
                _this.glass.rotate(BABYLON.Axis.Z, -0.005);
                t += 0.04;
            }
            else if (t < 34) {
                _this.glass.rotate(BABYLON.Axis.Z, 0.005);
                t += 0.04;
            }
            else
                t = 0;
        });
    };
    /**
     * Called on the scene starts.
     */
    MyScript.prototype.onStart = function () {
        // ...
    };
    /**
     * Called each frame.
     */
    MyScript.prototype.onUpdate = function () {
        // ...
        /*
        var items = new Array();
        if (this.glass.rotation.x > 40)
            items[items.length] = 0;
        if (this.glass.rotation.x < 140)
            items[items.length] = 1;
        if (this.glass.rotation.z > 100)
            items[items.length] = 2;
        if (this.glass.rotation.z < 180)
            items[items.length] = 3;
        this.rotate_glass(items);*/
    };
    MyScript.prototype.rotate_glass = function (items) {
        /*
        var item = items[Math.floor(Math.random()*items.length)];
        if (item == 0){
            this.glass.rotate(BABYLON.Axis.X, -0.01);
            this.glass.rotation.x -= 1;
        } else if (item == 1){
            this.glass.rotate(BABYLON.Axis.X, 0.01);
            this.glass.rotation.x += 1;
        } else if (item == 2){
            this.glass.rotate(BABYLON.Axis.Z, -0.01);
            this.glass.rotation.x -= 0.01;
        } else {
            this.glass.rotate(BABYLON.Axis.Z, 0.01);
            this.glass.rotation.x += 0.01;
        }*/
    };
    MyScript.prototype.getRandomFloat = function (min, max, decimals) {
        var str = (Math.random() * (max - min) + min).toFixed(decimals);
        return parseFloat(str);
    };
    /**
     * Called on the object has been disposed.
     * Object can be disposed manually or when the editor stops running the scene.
     */
    MyScript.prototype.onStop = function () {
        // ...
    };
    /**
     * Called on a message has been received and sent from a graph.
     * @param message defines the name of the message sent from the graph.
     * @param data defines the data sent in the message.
     * @param sender defines the reference to the graph class that sent the message.
     */
    MyScript.prototype.onMessage = function (name, data, sender) {
        switch (name) {
            case "myMessage":
                // Do something...
                break;
        }
    };
    return MyScript;
}(node_1.Node));
exports.default = MyScript;
//# sourceMappingURL=lighthouse.js.map