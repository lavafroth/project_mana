import * as THREE from 'three';
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
const camera = new THREE.PerspectiveCamera( 45, width / height, 0.1, 1000 );
const color = 0xFFFFFF;
var light = new THREE.AmbientLight(color, 1);
solidScene.add(light);
var light = new THREE.PointLight(color, 200);
light.position.set(10, 10, 15);
solidScene.add(light);
camera.position.set(6,8,14);

var buffer = new THREE.WebGLRenderTarget(width, height, {format: THREE.RGBAFormat, type: THREE.FloatType})
var outlineBuffer = new THREE.WebGLRenderTarget(width, height, {format: THREE.RGBAFormat, type: THREE.FloatType})
var transientBuffer = new THREE.WebGLRenderTarget(width, height, {format: THREE.RGBAFormat, type: THREE.FloatType})

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.update();

const geometry = new THREE.TorusGeometry( 10, 3, 20, 100 );
geometry.translate(2, 2, 2);

const shadowMesh = new THREE.Mesh(geometry);
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
    vertexShader: await get('outline.vert'),
    fragmentShader: await get('outline.frag'),
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
    window: {value: 0},
    gbufferMask: { value: outlineBuffer.texture },
    initBufferMask: { value: new Float32Array(width * height * 4) },
    viewportSize: { value: new THREE.Vector2(width, height) },
}

const evoMaterial = new THREE.ShaderMaterial({
    vertexShader: await get('evolve.vert'),
    fragmentShader: await get('evolve.frag'),
    uniforms: evoUniforms,
    transparent: true,
});

const evolveMesh = new THREE.Mesh(
    geometry,
    evoMaterial
);

evolveScene.add(evolveMesh)

function continuity(bitmap, width, height) {
    const visited = Array.from({length: height}, () => Array(width).fill(false));

    function valid(row, col) {
        return row >= 0 && row < height && col >= 0 && col <= width
    }

    // for a point to be on the screen edge, it must have at least three
    // of its neighbors invalid
    function isSentinel(row, col) {
        return (
            Number(valid(row - 1, col - 1)) +
            Number(valid(row - 1, col)) +
            Number(valid(row - 1, col + 1)) +

            Number(valid(row, col - 1)) +
            Number(valid(row, col + 1)) +

            Number(valid(row + 1, col - 1)) +
            Number(valid(row + 1, col)) +
            Number(valid(row + 1, col + 1))
        ) < 6
    }

    var sentinels = [];
    var cyclic = [];
    var duration = 0;

    function dfs(row, col, rootRow, rootCol, steps) {

        const pointIsRoot = row == rootRow && col == rootCol;
        const pointIsSentinel = isSentinel(row, col);

        if (steps > 20 && pointIsRoot) {
            
            cyclic.push([row, col]);
            return;
        }

        if (!valid(row, col) || visited[row][col]) {
            return; // is this a sentinel point
        }
        var point = 4 * (row * width + col);
        if (bitmap[point+0] == 0 && bitmap[point+1] == 0 && bitmap[point+2] == 0) {
            return;
        }

        visited[row][col] = true;
        dfs(row - 1, col, rootRow, rootCol, steps + 1)
        dfs(row + 1, col, rootRow, rootCol, steps + 1)
        dfs(row, col - 1, rootRow, rootCol, steps + 1)
        dfs(row, col + 1, rootRow, rootCol, steps + 1)

        if (!pointIsRoot && pointIsSentinel && steps > 20) {
            if (isSentinel(rootRow, rootCol)) {
                duration = duration > steps ? duration : steps;

                sentinels.push([row, col]);
            } else {

                sentinels.push([row, col]);
            }
        }
        return;
    }

    for (let row = 0; row < height; row++) {
        for(let col=0; col<width; col++) {
            var point = 4 * (row * width + col);
            if (!visited[row][col] && bitmap[point+0] == 1 && bitmap[point+1] == 1 && bitmap[point+2] == 1) {
                dfs(row, col, row, col, 0);
            }
        }
    }

    return [cyclic.concat(sentinels), duration];
}

var init = true;

var durationInSeconds = 5;
const FPS = 30;

const clock = new THREE.Clock();
function animate() {

    uniforms.time.value = clock.getElapsedTime();

    renderer.setRenderTarget(buffer);
    renderer.render(maskScene, camera);

    renderer.setRenderTarget(outlineBuffer);
    renderer.render(scene, camera);

    const allThePixels = new Float32Array( buffer.width * buffer.height * 4);
    if (init) {
        renderer.readRenderTargetPixels( outlineBuffer, 0, 0, buffer.width, buffer.height, allThePixels);

    		let [points, duration] = continuity(allThePixels, width, height)
    		let pixelPerFrame = duration / durationInSeconds / FPS;
    		evoUniforms.window.value = 20;
    		console.log(Math.round(pixelPerFrame))

        let initBuffer = new Uint8Array(buffer.width * buffer.height * 4);
        points.forEach((point) => {
            let pos = 4 * (point[0] * buffer.width + point[1]);
            initBuffer[pos] = 255;
            initBuffer[pos+1] = 255;
            initBuffer[pos+2] = 255;
            initBuffer[pos+3] = 255;
        })

        let ephemeralTex = new THREE.DataTexture(initBuffer, width, height);
        ephemeralTex.needsUpdate = true;
        evoUniforms.initBufferMask.value = ephemeralTex;
        init = false;
    } else {
        renderer.setRenderTarget(transientBuffer);
        renderer.render(evolveScene, camera);
        var sink = new Float32Array(buffer.width * buffer.height * 4);
        renderer.readRenderTargetPixels(transientBuffer, 0, 0, buffer.width, buffer.height, sink);
        let ephemeralTex = new THREE.DataTexture(sink, width, height, THREE.RGBAFormat, THREE.FloatType);
        ephemeralTex.needsUpdate = true;
        evoUniforms.initBufferMask.value = ephemeralTex;
    }

    renderer.setRenderTarget(null);
    renderer.render(solidScene, camera);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(evolveScene, camera);
    renderer.autoClear = true;
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function() {
    width = window.innerWidth
    height = window.innerHeight
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});
