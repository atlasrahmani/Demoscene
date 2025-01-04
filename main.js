import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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

// Remove previous texture and cube related code and add particle system
const particleCount = 500;
const particles = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const velocities = new Float32Array(particleCount * 3);
const lifetimes = new Float32Array(particleCount);

// Initialize particles
for (let i = 0; i < particleCount; i++) {
    // Position (start from center)
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    // Random velocities
    velocities[i * 3] = (Math.random() - 0.5) * 0.2;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

    // Random colors
    colors[i * 3] = Math.random();
    colors[i * 3 + 1] = Math.random();
    colors[i * 3 + 2] = Math.random();

    // Random lifetime between 2 and 4 seconds
    lifetimes[i] = 2 + Math.random() * 2;
}

particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particleMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending
});

const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

camera.position.z = 10;

// Load the miamia model
let miamiaModel;
const loader = new GLTFLoader();
loader.load(
    './models/miamia.glb',
    function (gltf) {
        miamiaModel = gltf.scene;
        miamiaModel.scale.set(2, 2, 2);
        miamiaModel.position.set(0, 0, 0);
        miamiaModel.visible = false;

        // Add emissive material to all meshes in the model
        miamiaModel.traverse((child) => {
            if (child.isMesh) {
                const originalMaterial = child.material;
                child.material = new THREE.MeshPhongMaterial({
                    color: originalMaterial.color || 0xffffff,
                    emissive: 0x666666,
                    emissiveIntensity: 0.5,
                    shininess: 100
                });
            }
        });

        scene.add(miamiaModel);
    },
    undefined,
    function (error) {
        console.error('Error loading model:', error);
    }
);

// Add variables for the bump effect
let modelAppeared = false;
let bumpStartTime = 0;
const APPEARANCE_THRESHOLD = 0.005; // Show model when 80% of particles are near end

// Add these variables after the bump effect variables (around line 112)
let postBumpTime = 0;
const floatAmplitude = 0.1;
const floatSpeed = 1.5;
const rotationSpeed = 0.3;
const pulseAmount = 0.05;

// Modified animate function
let clock = new THREE.Clock();

// Ambient light for base illumination
const ambientLight = new THREE.AmbientLight(0x111111);
scene.add(ambientLight);

// Add dramatic spotlights
const spotLight1 = new THREE.SpotLight(0x4444ff, 3);
spotLight1.position.set(5, 5, 5);
spotLight1.angle = Math.PI / 4;
spotLight1.penumbra = 0.1;
spotLight1.decay = 2;
spotLight1.distance = 200;

const spotLight2 = new THREE.SpotLight(0xff4444, 3);
spotLight2.position.set(-5, -5, 5);
spotLight2.angle = Math.PI / 4;
spotLight2.penumbra = 0.1;
spotLight2.decay = 2;
spotLight2.distance = 200;

scene.add(spotLight1);
scene.add(spotLight2);

// Create glowing background
const backgroundGeometry = new THREE.PlaneGeometry(50, 50);
const backgroundMaterial = new THREE.MeshPhongMaterial({
    color: 0x000000,
    emissive: 0x0a0a2a,
    emissiveIntensity: 0.5,
    side: THREE.DoubleSide
});

const backgroundPlane = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
backgroundPlane.position.z = -5;
scene.add(backgroundPlane);

// Add rim lights for dramatic edge lighting
const rimLight1 = new THREE.SpotLight(0x00ffff, 2);
rimLight1.position.set(10, 0, -5);
rimLight1.angle = Math.PI / 3;
rimLight1.penumbra = 0.5;
rimLight1.decay = 1;

const rimLight2 = new THREE.SpotLight(0xff00ff, 2);
rimLight2.position.set(-10, 0, -5);
rimLight2.angle = Math.PI / 3;
rimLight2.penumbra = 0.5;
rimLight2.decay = 1;

scene.add(rimLight1);
scene.add(rimLight2);

function animate() {
    const delta = clock.getDelta();
    const positions = particles.attributes.position.array;
    let nearEndParticles = 0;
    
    for (let i = 0; i < particleCount; i++) {
        // Update positions based on velocity
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];

        // Update lifetimes and fade out
        lifetimes[i] -= delta;
        
        // Count particles that are near their end
        if (lifetimes[i] <= 0.5) {
            nearEndParticles++;
        }
        
        if (lifetimes[i] <= 0) {
            particleMaterial.opacity = 0;
        } else {
            particleMaterial.opacity = Math.min(1, lifetimes[i] / 2);
        }
    }

    // Show the model when enough particles are near their end
    if (nearEndParticles / particleCount >= APPEARANCE_THRESHOLD && miamiaModel && !modelAppeared) {
        modelAppeared = true;
        bumpStartTime = clock.getElapsedTime();
        miamiaModel.visible = true;
        
        // Ensure model is centered
        miamiaModel.position.set(0, 0, 0);
        camera.lookAt(miamiaModel.position);
    }

    // Apply bump effect
    if (modelAppeared && miamiaModel) {
        const timeSinceAppearance = clock.getElapsedTime() - bumpStartTime;
        
        // Animate background
        backgroundMaterial.emissiveIntensity = 0.5 + Math.sin(timeSinceAppearance * 1.5) * 0.2;
        
        // Animate rim lights
        rimLight1.intensity = 2 + Math.sin(timeSinceAppearance * 1.2) * 0.5;
        rimLight2.intensity = 2 + Math.cos(timeSinceAppearance * 1.2) * 0.5;

        if (timeSinceAppearance < 0.3) {
            // Original bump effect
            const bumpProgress = timeSinceAppearance / 0.3;
            const bumpAmount = Math.sin(bumpProgress * Math.PI) * 0.3;
            miamiaModel.scale.set(
                2 + bumpAmount,
                2 + bumpAmount,
                2 + bumpAmount
            );
        } else {
            // Post-bump effects
            postBumpTime = timeSinceAppearance - 0.3;
            
            // Floating motion
            const floatOffset = Math.sin(postBumpTime * floatSpeed) * floatAmplitude;
            miamiaModel.position.y = floatOffset;
            
            // Gentle rotation
            miamiaModel.rotation.y = Math.sin(postBumpTime * rotationSpeed) * Math.PI * 0.15;
            
            // Subtle breathing/pulsing effect
            const pulseScale = 2 + Math.sin(postBumpTime * 2) * pulseAmount;
            miamiaModel.scale.set(pulseScale, pulseScale, pulseScale);
        }
    }

    particles.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
}

// Optional: Add bloom effect for extra glow
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;