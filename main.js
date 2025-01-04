import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

// Create a canvas for the procedural texture
const textureSize = 512;
const canvas = document.createElement('canvas');
canvas.width = textureSize;
canvas.height = textureSize;
const ctx = canvas.getContext('2d');

// Generate interesting pattern
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, textureSize, textureSize);

// Create a gradient pattern
const gradient = ctx.createLinearGradient(0, 0, textureSize, textureSize);
gradient.addColorStop(0, 'rgba(0, 255, 255, 0.2)');
gradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.2)');
gradient.addColorStop(1, 'rgba(0, 255, 255, 0.2)');
ctx.fillStyle = gradient;

// Draw some interesting shapes
for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(
        Math.random() * textureSize,
        Math.random() * textureSize,
        Math.random() * 50 + 20,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// Create texture from canvas
const texture = new THREE.CanvasTexture(canvas);
texture.needsUpdate = true;

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ 
    map: texture,
    transparent: true,
    opacity: 0.7
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

function animate() {

	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

	renderer.render( scene, camera );

}