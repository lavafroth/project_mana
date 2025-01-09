import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
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
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// Sets orbit control to move the camera around
const orbit = new OrbitControls(camera, renderer.domElement);

// Camera positioning
camera.position.set(6, 8, 14);
orbit.update();

// const geometry = new THREE.PlaneGeometry(10, 10, 30, 30);
const geometry = new THREE.BoxGeometry(1, 1, 1);

geometry.translate(2, 2, 2);

const shadowMesh = new THREE.Mesh(geometry);

const didICompute = shadowMesh.geometry.computeBoundingBox();
const meshCenter = new THREE.Vector3()
shadowMesh.geometry.boundingBox.getCenter(meshCenter)

const uniforms = {
    u_time: {value: 0.0},
    mesh_center: {value: meshCenter},
}

const material = new THREE.ShaderMaterial({
    vertexShader: get('outline.vert'),
    fragmentShader: get('outline.frag'),
    uniforms,
    // wireframe: true,
});

const mesh = new THREE.Mesh(
    geometry,
    material
);

scene.add(mesh);

const clock = new THREE.Clock();
function animate() {
    uniforms.u_time.value = clock.getElapsedTime();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
