import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

var width = window.innerWidth
var height = window.innerHeight

var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

async function get(path) {
    return await (await fetch(path)).text();
};

const scene = new THREE.Scene();
const solidScene = new THREE.Scene();
const maskScene = new THREE.Scene();
const evolveScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
const color = 0xFFFFFF;
var light = new THREE.AmbientLight(color, 1);
solidScene.add(light);
var light = new THREE.PointLight(color, 200);
light.position.set(10, 10, 15);
solidScene.add(light);
camera.position.set(6,8,14);

var buffer = new THREE.WebGLRenderTarget(width, height, {format: THREE.RGBAFormat})
var outlineBuffer = new THREE.WebGLRenderTarget(width, height, {format: THREE.RGBAFormat})

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.update();

const geometry = new THREE.TorusGeometry( 10, 3, 20, 100 );
geometry.translate(2, 2, 2);

const shadowMesh = new THREE.Mesh(geometry);
const uniforms = {
    gbufferMask: { value: buffer.texture },
    viewportSize: { value: new THREE.Vector2(width, height) },
}

const material = new THREE.ShaderMaterial({
    vertexShader: await get('shaders/outline.vert'),
    fragmentShader: await get('shaders/outline.frag'),
    uniforms,
    transparent: true,
});

const solidMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshPhysicalMaterial({
        color: 0xaaeadb,
        metalness: 0.8,
        clearcoat: 0.4,
        clearcoatRoughness: 0.1,
    }),
);

const mesh = new THREE.Mesh(
    geometry,
    material
);
solidScene.add(solidMesh);
scene.add(mesh);
maskScene.add(shadowMesh);


const evoUniforms = {
    initBufferMask: { value: null },
}

const evoMaterial = new THREE.ShaderMaterial({
    // this is a copy shader
    vertexShader: await get('shaders/evolve.vert'),
    fragmentShader: await get('shaders/evolve.frag'),
    uniforms: evoUniforms,
    transparent: true,
});

const evolveMesh = new THREE.Mesh(
    geometry,
    evoMaterial
);

evolveScene.add(evolveMesh)

// all neighbors in a 1 pixel radius
function pixelNeighbors(row, col) {
    return [
        [row + 1, col],
        [row + 1, col + 1],
        [row, col + 1],
        [row - 1, col + 1],
        [row - 1, col],
        [row - 1, col - 1],
        [row, col - 1],
        [row + 1, col - 1]
    ]
}

// true if a pixel's coordinates are in bounds
function valid(row, col) {
    return row >= 0 && row < height && col >= 0 && col <= width
}

function valid_1(row, col) {
    return valid(row, col) ? 1 : 0
}

// for a point to be on the screen edge, it must have at least three invalid neighbors.
// It must have at least six valid neighbors.
function isSentinel(row, col) {
    var validNeighbors = 0
    for (const [y, x] of pixelNeighbors(row, col)) {
        validNeighbors += valid_1(y, x)
    }
    return validNeighbors < 6
}


function continuity(bitmap, width, height) {
    const visited = Array.from({length: height}, () => Array(width).fill(false));

    var sentinels = [];
    var cyclic = [];

    function dfs_queue(rootRow, rootCol) {
        var stack = [];
        stack.push([rootRow, rootCol]);

        var steps = 0;

        for(; ; steps++) {
            let p = stack.pop();
            if (p === undefined) {
                return
            }
            let [row, col] = p
            if (isSentinel(row, col)) {
                sentinels.push([row, col]);
                return
            }

            if (steps > 0 && row == rootRow && col == rootCol) {
                cyclic.push([row, col])
                return
            }

            if (!valid(row, col) || visited[row][col]) {
                return
            }

            visited[row][col] = true;
            // is this point switched off?
            if (bitmap[pointFlatIndex(row, col)] == 0) {
                continue;
            }

            stack.push([row + 1, col])
            stack.push([row, col + 1])
            stack.push([row - 1, col])
            stack.push([row, col - 1])

        }
    }

    for (let row = 0; row < height; row++) {
        for(let col = 0; col < width; col++) {
            if (visited[row][col] || bitmap[pointFlatIndex(row, col)] == 0) {
                continue;
            }
            dfs_queue(row, col);
        }
    }

    // Always prefer the sentinels to the cyclics
    // since walking back a line also ends up in a cycle.
    // Start waveforms from the sentinels (endpoints),
    // mark all the visited points. If there remain unvisited
    // points, those are legitimately parts of cyclic paths.
    return sentinels.concat(cyclic);
}

var durationInSeconds = 5;

function pointFlatIndex(row, col) {
    return 4 * (row * buffer.width + col)
}

// @param {Float32Array[]} points
// @param {Uint32Array} allThePixels
// Number all the points as we stumble along the outline.
// Akin to a wavefront. The pixels switched on (value = 1)
// touching the wavefront at time t will have a value t + 2
//
// This way we can quickly zero out all the pixels below a
// threshold when timing the animation.
function dijkstraNumber(points, buf) {
    var longestStrand = 2;
    points.forEach((point) => {
        longestStrand = Math.max(longestStrand, dijkstraPropagate(point, buf, 2))
    })
    return longestStrand
}

function fillRGBA(pos, buf, value) {
    buf[pos] = value;
    buf[pos+1] = value;
    buf[pos+2] = value;
    buf[pos+3] = value;
}

function dijkstraPropagate(point, buf, value) {
    var stack = [[point]];
    for (; ;) {
        let neighbors = stack.pop()
        if (neighbors === undefined) {
            return value
        }
        neighbors.forEach(([row, col]) => {
            let pos = pointFlatIndex(row, col);
            if (buf[pos] != 1) {
                return
            }
            fillRGBA(pos, buf, value)
            // package all the neighboring points and
            // push them onto the stack
            stack.push(pixelNeighbors(row, col))
        })

        value += 1
    }
}

const clock = new THREE.Clock();
var longestPixelStrand = 0;
var init = true;
const allThePixels = new Uint8Array(buffer.width * buffer.height * 4);
const dijkstraBuffer = new Uint32Array(buffer.width * buffer.height * 4);

const composer = new EffectComposer( renderer );
const renderPass = new RenderPass(solidScene, camera);
const nirvana = new RenderPass(evolveScene, camera);
nirvana.clear = false;
console.log(nirvana)
const outputPass = new OutputPass();
const fxaaPass = new FXAAPass();
composer.addPass(renderPass);
composer.addPass(nirvana);
composer.addPass(outputPass);
composer.addPass(fxaaPass);

function animate() {

    if (init) {
        renderer.setRenderTarget(buffer);
        renderer.render(maskScene, camera);

        renderer.setRenderTarget(outlineBuffer);
        renderer.render(scene, camera);

        renderer.readRenderTargetPixels(outlineBuffer, 0, 0, buffer.width, buffer.height, allThePixels);
        for (let i = 0; i < allThePixels.length; i++) {
            dijkstraBuffer[i] = allThePixels[i] == 255 ? 1 : 0;
        }

    		let points = continuity(dijkstraBuffer, width, height)
    		longestPixelStrand = dijkstraNumber(points, dijkstraBuffer)

        let initBuffer = new Uint8Array(buffer.width * buffer.height * 4);
        points.forEach((point) => fillRGBA(pointFlatIndex(...point), initBuffer, 255))

        if (evoUniforms.initBufferMask.value === null) {
            let ephemeralTex = new THREE.DataTexture(initBuffer, width, height);
            evoUniforms.initBufferMask.value = ephemeralTex;
        } else {
            evoUniforms.initBufferMask.value.source.data.data = initBuffer;
        }
        evoUniforms.initBufferMask.value.needsUpdate = true;
        init = false;
    }
		let fractionAnimated = (clock.getElapsedTime() % durationInSeconds) / durationInSeconds;
		let pixelsAnimated = Math.round(longestPixelStrand * fractionAnimated);
    let initBuffer = new Uint8Array(buffer.width * buffer.height * 4);
    for (let row = 0; row < height; row++) {
        for(let col=0; col<width; col++) {
            var point = pointFlatIndex(row, col);
            if (dijkstraBuffer[point] > 1 && dijkstraBuffer[point] < pixelsAnimated) {
                // setting this to white
                fillRGBA(point, initBuffer, 255)
            }
        }
    }
    evoUniforms.initBufferMask.value.source.data.data = initBuffer;
    evoUniforms.initBufferMask.value.needsUpdate = true;

    renderer.setRenderTarget(null);
    composer.render();
}

renderer.setAnimationLoop(animate);


window.addEventListener('resize', function() {
    width = window.innerWidth
    height = window.innerHeight
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    init = true;
});

orbit.addEventListener('change', function() {
    init = true;
})
