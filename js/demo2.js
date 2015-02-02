(function () {
    'use strict';

    var renderCanvas,
        vrHMD,
        vrHMDSensor,
        scene,
        mesh,
        camera,
        renderer,
        vrrenderer;

    function vrDeviceCallback(vrdevs) {
        for (var i = 0; i < vrdevs.length; ++i) {
            if (vrdevs[i] instanceof HMDVRDevice) {
                vrHMD = vrdevs[i];
                break;
            }
        }
        for (var i = 0; i < vrdevs.length; ++i) {
            if (vrdevs[i] instanceof PositionSensorVRDevice &&
                vrdevs[i].hardwareUnitId == vrHMD.hardwareUnitId) {
                vrHMDSensor = vrdevs[i];
                break;
            }
        }

        initScene();
        initRenderer();
        render();
    } 

    function loadModels() {
        var modelUrl = './resources/models/gips-danger/gips-danger_rig.js';
            var modelFrames = {
            stand: [ 0, 32,   0, {state: 'stand', action: false}],
            walk : [33, 65, 1.6, {state: 'stand', action: false}],
            run  : [66, 98,  3.2, {state: 'stand', action: false}]
        };

        //load a gips-danger
        var loader = new THREE.JSONLoader();
        loader.load(modelUrl, createModel);

        function createModel(geometry, materials) {

            var facematerial;
            var scale = 0.5;

            if (materials) {
                facematerial = new THREE.MeshFaceMaterial(materials);
            }

            var model = new THREE.SkinnedMesh(geometry, facematerial);
            model.scale.set(scale, scale, scale);
            model.position.set(0, 0, 0);

            scene.add(model);
        }
    }

    

    var light = null;
    function initScene() {
        camera = new THREE.PerspectiveCamera(60, 1280 / 800, 0.001, 10);
        camera.position.y = 2.0;
        camera.position.z = 1.5;
        scene = new THREE.Scene();
        var geometry = new THREE.IcosahedronGeometry(1, 1);
        var material = new THREE.MeshNormalMaterial();
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        light = new THREE.DirectionalLight(0x999999);
        light.position.set(1, 1, 1);
        scene.add(light);

        var ambient = new THREE.AmbientLight(0xaaaaaa);
        scene.add(ambient);

        loadModels();

        createWater();
    }

    function createWater() {
        var parameters = {
            width: 2000,
            height: 2000,
            widthSegments: 250,
            heightSegments: 250,
            depth: 1500,
            param: 4,
            filterparam: 1
        };

        var waterNormals = new THREE.ImageUtils.loadTexture('textures/waternormals.jpg');
        waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping; 

        var water = new THREE.Water( renderer, camera, scene, {
            textureWidth: 512, 
            textureHeight: 512,
            waterNormals: waterNormals,
            alpha: 	1.0,
            sunDirection: light.position.clone().normalize(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 50.0,
        } );


        var mirrorMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(parameters.width * 500, parameters.height * 500),
            water.material
        );

        mirrorMesh.add(water);
        mirrorMesh.rotation.x = -Math.PI * 0.5;
        scene.add(mirrorMesh);
    }

    function initRenderer() {
        renderCanvas = document.getElementById("render-canvas");
        renderer = new THREE.WebGLRenderer({
            canvas: renderCanvas,
        });
        renderer.setClearColor(0x555555);
        renderer.setSize(1280, 800, false);
        vrrenderer = new THREE.VRRenderer(renderer, vrHMD);
    }

    function render() {
        requestAnimationFrame(render);
        mesh.rotation.y += 0.01;
        var state = vrHMDSensor.getState();
        camera.quaternion.set(state.orientation.x, 
                              state.orientation.y, 
                              state.orientation.z, 
                              state.orientation.w);
        vrrenderer.render(scene, camera);
    }

    window.addEventListener("keypress", function(e) {
        if (e.charCode == 'f'.charCodeAt(0)) {
            if (renderCanvas.mozRequestFullScreen) {
                renderCanvas.mozRequestFullScreen({
                    vrDisplay: vrHMD
                });
            }
            else if (renderCanvas.webkitRequestFullscreen) {
                renderCanvas.webkitRequestFullscreen({
                    vrDisplay: vrHMD,
                });
            }
        }

        if (e.charCode == 'w'.charCodeAt(0)) {
            camera.position.z += 0.1;
        }
        if (e.charCode == 'x'.charCodeAt(0)) {
            camera.position.z -= 0.1;
        }
    }, false);


    window.addEventListener("load", function() {
        if (navigator.getVRDevices) {
            navigator.getVRDevices().then(vrDeviceCallback);
        }
        else if (navigator.mozGetVRDevices) {
            navigator.mozGetVRDevices(vrDeviceCallback);
        }
    }, false);
}());
