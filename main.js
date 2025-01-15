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

function continuity(bitmap, width, height) {
    const visited = Array.from({length: height}, () => Array(width).fill(false));

    function valid(row, col) {
        return row >= 0 && row < height && col >= 0 && col <= width
    }

    var sentinels = [];
    var cyclic = [];

    function dfs(row, col, rootRow, rootCol, steps) {

        if (steps > 20 && row == rootRow && col == rootCol) {
            
            cyclic.push([row, col]);
        }

        if (!valid(row, col) || visited[row][col]) {
            return 1; // is this a sentinel point
        }
        var point = 4 * (row * width + col);
        if (bitmap[point+0] == 0 && bitmap[point+1] == 0 && bitmap[point+2] == 0) {
            return 0;
        }

        visited[row][col] = true;
        dfs(row - 1, col, rootRow, rootCol, steps + 1)
        dfs(row + 1, col, rootRow, rootCol, steps + 1)
        dfs(row, col - 1, rootRow, rootCol, steps + 1)
        dfs(row, col + 1, rootRow, rootCol, steps + 1)

        var amISentinel = (
            Number(valid(row - 1, col - 1)) +
            Number(valid(row - 1, col)) +
            Number(valid(row - 1, col + 1)) +

            Number(valid(row, col - 1)) +
            Number(valid(row, col + 1)) +

            Number(valid(row + 1, col - 1)) +
            Number(valid(row + 1, col)) +
            Number(valid(row + 1, col + 1))
        )

        // if (Math.abs(row - rootRow) < 2 && Math.abs(col - rootCol) < 2) {
        //     return 1;
        // }

        // for a point to be on the screen edge, it must have at least three
        // of its neighbors invalid
        if (amISentinel < 6) {
            sentinels.push([row, col]);
        }
        return 0;
    }

    for (let row = 0; row < height; row++) {
        for(let col=0; col<width; col++) {
            var point = 4 * (row * width + col);
            if (!visited[row][col] && bitmap[point+0] == 1 && bitmap[point+1] == 1 && bitmap[point+2] == 1) {
                dfs(row, col, row, col, 0);
            }
        }
    }

    console.log(cyclic)
}

const clock = new THREE.Clock();
function animate() {

    uniforms.time.value = clock.getElapsedTime();

    renderer.setRenderTarget(buffer);
    renderer.render(maskScene, camera);

    renderer.setRenderTarget(outlineBuffer);
    renderer.render(scene, camera);

    const allThePixels = new Float32Array( buffer.width * buffer.height * 4);

    var litPixels = 0;
    renderer.readRenderTargetPixels( outlineBuffer, 0, 0, buffer.width, buffer.height, allThePixels);

    // var pixel;
  //    for (let y = 0; y < buffer.height; y++) {
  //       for (let x = 0; x < buffer.width; x++) {
  //          var at = 4 * (y * buffer.width + x);
  //          // console.log(`${x}, ${y}`);
  //    	    const isLit = allThePixels[at] == 1 && allThePixels[at+1] == 1 && allThePixels[at+2] == 1 && allThePixels[at+3] == 1
  //       		if (isLit) {
  //       		    litPixels += 1;
  //       		}
  //       }
  //    }
    
		// console.log(litPixels);
		continuity(allThePixels, width, height)


    renderer.setRenderTarget(null);
    renderer.render(solidScene, camera);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(scene, camera);
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
