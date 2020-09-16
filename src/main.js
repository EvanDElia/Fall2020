/* eslint-env browser */
require('./styles.less');
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    MeshStandardMaterial
} from 'three';
import {
    OrbitControls
} from 'three/examples/jsm/controls/OrbitControls.js';
import {
    GLTFLoader
} from 'three/examples/jsm/loaders/GLTFLoader.js';

import * as THREE from 'three';
const $ = require('jquery');

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new WebGLRenderer({
    preserveDrawingBuffer: true
});
var controls;
var gltfModel;

const material = new MeshStandardMaterial({

    color: 0x00ff00
});
const fftCubes = new Array();




function onWindowResize() {
    // windowHalfX = window.innerWidth / 2;
    // windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    // composer.reset();
}

async function init(tracks) {
    $('#overlay').hide();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    {
        const skyColor = 0xB1E1FF; // light blue
        const groundColor = 0xB97A20; // brownish orange
        const intensity = 1;
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
        scene.add(light);
    }

    {
        scene.add(gltfModel);
        //gltfModel.rotation.y = gltfModel.rotation.y + 5;
    }

    {
        const planeSize = 40;

        const loader = new THREE.TextureLoader();
        const texture = loader.load('http://evandelia.com/fall2020/models/textures/checker.png'); //require('../models/textures/checker.png').default
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter;
        const repeats = planeSize / 2;
        texture.repeat.set(repeats, repeats);

        const planeGeo = new THREE.PlaneBufferGeometry(planeSize, planeSize);
        const planeMat = new THREE.MeshPhongMaterial({
            map: texture,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(planeGeo, planeMat);
        mesh.rotation.x = Math.PI * -.5;
        mesh.position.y = mesh.position.y - 10;
        scene.add(mesh);
    }

    camera.position.z = 5;

    // const color = 0xFFFFFF;
    // const intensity = 1;
    // const dlight = new THREE.DirectionalLight(color, intensity);
    // dlight.position.set(0, 10, 5);
    // dlight.target.position.set(-5, 0, 0);
    // scene.add(dlight);
    // scene.add(dlight.target);

    //ambient light
    var ambient = new THREE.AmbientLight(0xffaaaa, 0.55);
    scene.add(ambient);

    var light = new THREE.PointLight(0xff0000, 1, 100);
    light.position.set(5, 5, 5);
    scene.add(light);

    //set orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.update();

    // trails
    // renderer.autoClearColor = false;
    // renderer.autoClear = false;

    // postprocessing effects
    // var renderModel = new RenderPass( scene, camera );
    // effectBloom = new BloomPass( 1.0, 10, 1.0, 2048); //needs to be a gloabal value so we can change it in the animate function
    // var effectBleach = new ShaderPass( BleachBypassShader );
    // var effectCopy = new ShaderPass( CopyShader );

    // effectBleach.uniforms[ "opacity" ].value = 0.7;

    // effectCopy.renderToScreen = true;

    // composer = new EffectComposer( renderer );

    // composer.addPass( renderModel );
    // composer.addPass( effectBleach );
    // composer.addPass( effectBloom );
    // composer.addPass( effectCopy );

    window.addEventListener('resize', onWindowResize, false);

    var listener = new THREE.AudioListener();
    camera.add(listener);

    // create a global audio source
    var sound = new THREE.Audio(listener);
    // load a sound and set it as the Audio object's buffer
    var audioLoader = new THREE.AudioLoader();

    new MusicApp(tracks, audioLoader, sound);

    var analyser = new THREE.AudioAnalyser(sound, 256);
    window.analyser = analyser;
    var bufferSize = analyser.data.length;
    for (var i = 0; i < bufferSize / 4; i++) {
        var gradMaterial = new THREE.MeshPhongMaterial({
            color: ("rgb("+(150-i*2)+","+i*10+","+i*5+")")
        });
        var bin = new THREE.Mesh(new THREE.BoxGeometry(bufferSize / (window.innerWidth * .5), bufferSize / window.innerWidth, 2), gradMaterial);
        var binMirror = new THREE.Mesh(new THREE.BoxGeometry(bufferSize / (window.innerWidth * .5), bufferSize / window.innerWidth, 2), gradMaterial);
        bin.position.z = .25;
        bin.position.x = -2 + (bufferSize / window.innerWidth * i) * .5;
        binMirror.position.z = .25;
        binMirror.position.x = 2 - (bufferSize / window.innerWidth * i) * .5;
        fftCubes.push(bin)
        scene.add(bin);
        fftCubes.push(binMirror)
        scene.add(binMirror);

    }
   

    //////////

    render();
}

class MusicApp {
    constructor(trackList, audioLoader, sound) {
        this.trackList = trackList;
        this.audioLoader = audioLoader;
        this.sound = sound;
        this.initAudio();
        this.initUI();
    }

    initUI() {
        let self = this;

        var $track_container_onInit = $('#info');
        self.trackList.forEach(function (track) {
            $track_container_onInit.append('<div class="song-title">' + track.trackNumber + '. ' + track.name + '</div>');
        });

        this.controls = {
            prev: document.querySelector('#back'),
            next: document.querySelector('#forward'),
            play: document.querySelector('#play'),
            pause: document.querySelector('#pause'),
        };

        this.controls.prev.onclick = () => {
            $($(".song-title")[self.currentSong]).removeClass("active");
            self.currentSong = self.currentSong > 0 ? self.currentSong - 1 : self.trackList.length - 1;
            $($(".song-title")[self.currentSong]).addClass("active");
            self.sound.stop();
            self.audioLoader.load(self.trackList[self.currentSong].url, function (buffer) {
                self.sound.setBuffer(buffer);
                self.sound.play();
            });
        };
        this.controls.next.onclick = () => {
            $($(".song-title")[self.currentSong]).removeClass("active");
            self.currentSong = self.currentSong < self.trackList.length - 1 ? self.currentSong + 1 : 0;
            $($(".song-title")[self.currentSong]).addClass("active");
            self.sound.stop();
            self.audioLoader.load(self.trackList[self.currentSong].url, function (buffer) {
                self.sound.setBuffer(buffer);
                self.sound.play();
            });
        };

        this.controls.play.onclick = () => {
            self.sound.play();
            self.playing = true;
            $(self.controls.play).css('display', 'none');
            $(self.controls.pause).css('display', 'block');
        };
        this.controls.pause.onclick = () => {
            self.sound.pause();
            self.playing = false;
            $(self.controls.play).css('display', 'block');
            $(self.controls.pause).css('display', 'none');

        };

        $($(".song-title")[this.currentSong]).addClass("active");
    }

    initAudio() {
        let self = this;
        this.currentSong = 0;

        self.audioLoader.load(self.trackList[self.currentSong].url, function (buffer) {
            self.sound.setBuffer(buffer);
            // self.sound.play();
        });

        this.sound.onEnded = () => {
            $($(".song-title")[self.currentSong]).removeClass("active");
            self.currentSong = self.currentSong < self.trackList.length - 1 ? self.currentSong + 1 : 0;
            $($(".song-title")[self.currentSong]).addClass("active");
            self.sound.stop();
            self.audioLoader.load(self.trackList[self.currentSong].url, function (buffer) {
                self.sound.setBuffer(buffer);
                self.sound.play();
            });
        };
    }
}

$.ajax({
    url: "//evandelia.com/fall2020/tracks/tracks.json",
    dataType: "json",
    success: function (response) {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load('//evandelia.com/fall2020/models/machine.2.gltf', (gltf) => {
            gltfModel = gltf.scene;
            document.getElementById('startButton').innerHTML = '<span>Click to Play</span>';
            document.getElementById('startButton').onclick = () => {
                init(response.tracks);
            }
        });
    },
    error: function (response) {
        console.log(response);
        $("#info").html("Error Loading");
    }
});

async function render() {
    // console.log(window.analyser.getAverageFrequency());
    for (var i = 0; i < fftCubes.length; i++) {
        // console.log(window.analyser.data);
        window.analyser.getFrequencyData(window.analyser.data);
        fftCubes[i].position.y = window.analyser.data[i] / 50 +2.5;
        i++;
        fftCubes[i].position.y = window.analyser.data[i] / 50 +2.5;
    }
    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(render);
}