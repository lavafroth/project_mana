import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

var width = window.innerWidth
var height = window.innerHeight

var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

// async await is an overkill
function get(path) {
    const request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send(null);

    if (request.status === 200) {
        return request.responseText;
    }
}

const scene = new THREE.Scene();
const maskScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, width / height, 0.1, 1000 );
camera.position.set(6,8,14);

var buffer = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBFormat,
})

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.update();

const geometry = new THREE.BoxGeometry(2, 2, 2);
geometry.translate(2, 2, 2);

const shadowMesh = new THREE.Mesh(
    geometry,
);
const shadowMeshCenter = new THREE.Vector3();
shadowMesh.geometry.computeBoundingBox();
shadowMesh.geometry.boundingBox.getCenter(shadowMeshCenter);

const uniforms = {
    time: {value: 0.0},
    gbufferMask: { value: buffer.texture },
    meshCenter: { value: shadowMeshCenter },
    viewportSize: { value: new THREE.Vector2(width, height) },
}

const material = new THREE.ShaderMaterial({
    vertexShader: get('outline.vert'),
    fragmentShader: get('outline.frag'),
    uniforms,
});

// var fsQuad = new FullScreenQuad(material);

const mesh = new THREE.Mesh(
    geometry,
    material
);
scene.add(mesh);
maskScene.add(shadowMesh);

const clock = new THREE.Clock();
function animate() {

    uniforms.time.value = clock.getElapsedTime();

    renderer.setRenderTarget(buffer);
    renderer.clear();
    renderer.render(maskScene, camera);

    renderer.setRenderTarget(null);
    renderer.clear();
    // fsQuad.render(renderer)
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function() {
    width = window.innerWidth
    height = window.innerHeight
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});
