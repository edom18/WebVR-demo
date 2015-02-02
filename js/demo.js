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

    var light = null;
    var water = null;
    var controls = null;

    function start() {
        initRenderer();
        initScene();
        render();
    }

    /**
     * Get VR devices callback.
     */
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

        start();
    } 

    /**
     * Load a model.
     */
    function loadModels() {
        var modelUrl = './models/gips-danger/gips-danger_rig.js';

        //load a gips-danger
        var loader = new THREE.JSONLoader();
        loader.load(modelUrl, createModel);

        function createModel(geometry, materials) {

            var facematerial;
            var scale = 500;

            if (materials) {
                facematerial = new THREE.MeshFaceMaterial(materials);
            }

            var model = new THREE.SkinnedMesh(geometry, facematerial);
            model.scale.set(scale, scale, scale);
            model.position.set(0, -1800, 0);

            scene.add(model);
        }
    }

    
    /**
     * Initialize a scene.
     */
    function initScene() {
        camera = new THREE.PerspectiveCamera(60, 1280 / 800, 1, 3000000);
        camera.position.set(0, 750, 1500);
        scene = new THREE.Scene();

        light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
        light.position.set(-1, 1, -1);
        scene.add(light);

        var ambient = new THREE.AmbientLight(0xaaaaaa);
        scene.add(ambient);

        loadModels();
        createWater();
        initController();
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

        water = new THREE.Water( renderer, camera, scene, {
            textureWidth: 1024, 
            textureHeight: 1024,
            waterNormals: waterNormals,
            alpha: 	1.0,
            sunDirection: light.position.clone().normalize(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 50.0,
        });


        var mirrorMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(parameters.width * 500, parameters.height * 500),
            water.material
        );

        mirrorMesh.add(water);
        mirrorMesh.rotation.x = -Math.PI * 0.5;
        scene.add(mirrorMesh);

        var cubeMap = new THREE.CubeTexture([]);
        cubeMap.format = THREE.RGBFormat;
        cubeMap.flipY = false;

        var loader = new THREE.ImageLoader();
        loader.load( 'textures/skyboxsun25degtest.png', function ( image ) {

            var getSide = function ( x, y ) {

                var size = 1024;

                var canvas = document.createElement( 'canvas' );
                canvas.width = size;
                canvas.height = size;

                var context = canvas.getContext( '2d' );
                context.drawImage( image, - x * size, - y * size );

                return canvas;
            };

            cubeMap.images[ 0 ] = getSide( 2, 1 ); // px
            cubeMap.images[ 1 ] = getSide( 0, 1 ); // nx
            cubeMap.images[ 2 ] = getSide( 1, 0 ); // py
            cubeMap.images[ 3 ] = getSide( 1, 2 ); // ny
            cubeMap.images[ 4 ] = getSide( 1, 1 ); // pz
            cubeMap.images[ 5 ] = getSide( 3, 1 ); // nz
            cubeMap.needsUpdate = true;

        } );

        var cubeShader = THREE.ShaderLib['cube'];
        cubeShader.uniforms['tCube'].value = cubeMap;

        var skyBoxMaterial = new THREE.ShaderMaterial( {
            fragmentShader: cubeShader.fragmentShader,
            vertexShader: cubeShader.vertexShader,
            uniforms: cubeShader.uniforms,
            depthWrite: false,
            side: THREE.BackSide
        });

        var skyBox = new THREE.Mesh(
            new THREE.BoxGeometry( 1000000, 1000000, 1000000 ),
            skyBoxMaterial
        );
        
        scene.add(skyBox);
    }

    function initRenderer() {
        renderCanvas = document.getElementById('render-canvas');
        renderer = new THREE.WebGLRenderer({
            canvas: renderCanvas,
        });
        renderer.setClearColor(0x555555);
        renderer.setSize(1280, 800, false);

        if (vrHMD) {
            vrrenderer = new THREE.VRRenderer(renderer, vrHMD);
        }
    }

    function initController() {
        controls = new THREE.OrbitControls( camera, renderer.domElement );
        controls.userPan = false;
        controls.userPanSpeed = 0.0;
        controls.maxDistance = 5000.0;
        controls.maxPolarAngle = Math.PI * 0.495;
        controls.center.set( 0, 500, 0 );
    }

    function render() {
        requestAnimationFrame(render);

        water.material.uniforms.time.value += 1.0 / 60.0;
        water.render();
        controls.update();

        if (vrHMDSensor) {
            var state = vrHMDSensor.getState();
            camera.quaternion.set(state.orientation.x, 
                                  state.orientation.y, 
                                  state.orientation.z, 
                                  state.orientation.w);
            vrrenderer.render(scene, camera);
        }
        else {
            renderer.render(scene, camera);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////

    window.addEventListener('keypress', function(e) {
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


    window.addEventListener('load', function() {
        if (navigator.getVRDevices) {
            navigator.getVRDevices().then(vrDeviceCallback);
        }
        else if (navigator.mozGetVRDevices) {
            navigator.mozGetVRDevices(vrDeviceCallback);
        }
        else {
            start();
        }
    }, false);
}());
