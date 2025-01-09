import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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

// const planeGeometry = new THREE.PlaneGeometry(10, 10, 30, 30);
const planeGeometry = new THREE.BoxGeometry(1,1,1);
// const planeCustomMaterial = new THREE.ShaderMaterial({
//     vertexShader: `// Vertex shader code here`,
//     fragmentShader: `// Fragment shader code here`,
//     wireframe: true
// });

planeGeometry.translate(2, 2, 2);

const shadowMesh = new THREE.Mesh(
    planeGeometry,
);

const what = shadowMesh.geometry.computeBoundingBox();

const targetV3 = new THREE.Vector3()
shadowMesh.geometry.boundingBox.getCenter(targetV3)

const uniforms = {
    u_time: {value: 0.0},
    mesh_center: {value: targetV3},
}

const planeCustomMaterial = new THREE.ShaderMaterial({
    vertexShader: document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent,
    uniforms,
    // wireframe: true,
});

const planeMesh = new THREE.Mesh(
    planeGeometry,
    planeCustomMaterial
);

scene.add(planeMesh);

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
