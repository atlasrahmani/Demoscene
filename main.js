import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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

// Replace video setup (lines 93-113) with image setup
const textureLoader = new THREE.TextureLoader();
const imageTexture = textureLoader.load('./images/funny.png', (texture) => {
    // Calculate aspect ratio once the texture is loaded
    const imageAspect = texture.image.width / texture.image.height;
    const planeWidth = 30; // Base width
    const planeHeight = planeWidth / imageAspect;
    
    // Update plane geometry with correct aspect ratio
    imagePlane.dispose(); // Clean up old geometry
    const newGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    imageMesh.geometry = newGeometry;
});
imageTexture.minFilter = THREE.LinearFilter;
imageTexture.magFilter = THREE.LinearFilter;

const imageMaterial = new THREE.MeshBasicMaterial({
    map: imageTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
});

const imagePlane = new THREE.PlaneGeometry(1, 1); // Temporary size, will be updated
const imageMesh = new THREE.Mesh(imagePlane, imageMaterial);
imageMesh.position.z = -5;
scene.add(imageMesh);

camera.position.z = 10;

// Load the miamia model
// let miamiaModel;
// const loader = new GLTFLoader();
// loader.load(
//     './models/miamia.glb',
//     function (gltf) {
//         miamiaModel = gltf.scene;
//         miamiaModel.scale.set(2, 2, 2);  // Make it bigger (increase these numbers for larger size)
//         miamiaModel.position.set(0, 0, 0);
//         miamiaModel.visible = false;

//         // Add emissive material to all meshes in the model
//         miamiaModel.traverse((child) => {
//             if (child.isMesh) {
//                 const originalMaterial = child.material;
//                 child.material = new THREE.MeshPhongMaterial({
//                     color: originalMaterial.color || 0xffffff,
//                     emissive: 0x666666,
//                     emissiveIntensity: 0.5,
//                     shininess: 100
//                 });
//             }
//         });

//         scene.add(miamiaModel);
//     },
//     undefined,
//     function (error) {
//         console.error('Error loading model:', error);
//     }
// );

// Add variables for the bump effect
let modelAppeared = false;
let bumpStartTime = 0;
const APPEARANCE_THRESHOLD = 0.005; // Show model when 80% of particles are near end

// Add these variables after the bump effect variables (around line 112)
let postBumpTime = 0;
const floatAmplitude = 0.05;
const floatSpeed = 0.5;
const rotationSpeed = 0.1;
const pulseAmount = 0.02;

// Add these variables near the other effect variables
const MODEL_DISPLAY_DURATION = 10; // Duration in seconds
let modelShouldHide = false;

// Add this variable near other state variables (around line 156)
let explosionComplete = false;

// Add after explosionComplete variable
const IMAGE_DISPLAY_DURATION = 3; // 3 seconds for image display
let imageStartTime = 0;
let swarmStarted = false;

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

// Set up post-processing
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,    // strength
    0.4,    // radius
    0.85    // threshold
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Add near the top of your file
const textOverlay = document.querySelector('.text-overlay');

// Add after the image setup
const SWARM_COUNT = 1000;
const swarmGeometry = new THREE.BufferGeometry();
const swarmPositions = new Float32Array(SWARM_COUNT * 3);
const swarmVelocities = new Float32Array(SWARM_COUNT * 3);
const swarmAccelerations = new Float32Array(SWARM_COUNT * 3);
const swarmColors = new Float32Array(SWARM_COUNT * 3);
const swarmTrails = [];

function initSwarm() {
    // Initialize particles
    for (let i = 0; i < SWARM_COUNT; i++) {
        const i3 = i * 3;
        // Random positions in a sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = Math.random() * 2;
        
        swarmPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
        swarmPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        swarmPositions[i3 + 2] = r * Math.cos(phi);
        
        // Random velocities
        swarmVelocities[i3] = (Math.random() - 0.5) * 0.1;
        swarmVelocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
        swarmVelocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
        
        // Neon colors
        swarmColors[i3] = 0.5 + Math.random() * 0.5;     // R
        swarmColors[i3 + 1] = 0.5 + Math.random() * 0.5; // G
        swarmColors[i3 + 2] = 0.5 + Math.random() * 0.5; // B
        
        // Initialize trail
        swarmTrails[i] = {
            positions: [],
            maxLength: 20 + Math.random() * 30
        };
    }
    
    swarmGeometry.setAttribute('position', new THREE.BufferAttribute(swarmPositions, 3));
    swarmGeometry.setAttribute('color', new THREE.BufferAttribute(swarmColors, 3));
    
    const swarmMaterial = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.6
    });
    
    const swarmSystem = new THREE.Points(swarmGeometry, swarmMaterial);
    scene.add(swarmSystem);
}

// Light beam setup
const BEAM_COUNT = 4;
const lightBeams = [];
const beamColors = [
    0x00ffff, // cyan
    0xff00ff, // magenta
    0x4444ff, // blue
    0xff4444  // red
];

// Simulated beat timing
const BEAT_INTERVAL = 500; // milliseconds
let lastBeatTime = 0;
let beatIntensity = 0;

// Create sweeping light beams
for (let i = 0; i < BEAM_COUNT; i++) {
    const beam = new THREE.SpotLight(beamColors[i], 2);
    beam.angle = Math.PI / 8;
    beam.penumbra = 0.2;
    beam.decay = 1;
    beam.distance = 100;
    
    // Position beams at different angles
    const angle = (i / BEAM_COUNT) * Math.PI * 2;
    beam.position.set(
        Math.cos(angle) * 10,
        Math.sin(angle) * 10,
        5
    );
    
    // Add beam properties for animation
    beam.userData = {
        baseIntensity: 2,
        rotationSpeed: 0.2 + Math.random() * 0.3,
        rotationOffset: angle,
        pulsePhase: Math.random() * Math.PI * 2
    };
    
    scene.add(beam);
    lightBeams.push(beam);
}

// Simulated beat analyzer
function updateBeat(time) {
    const beatTime = time * 1000; // Convert to milliseconds
    if (beatTime - lastBeatTime >= BEAT_INTERVAL) {
        beatIntensity = 1;
        lastBeatTime = beatTime;
    } else {
        // Decay beat intensity
        beatIntensity *= 0.95;
    }
    return beatIntensity;
}

// Camera animation setup
const cameraTargets = [
    new THREE.Vector3(0, 0, 10),    // Default position
    new THREE.Vector3(10, 5, 8),    // Right side view
    new THREE.Vector3(-10, -5, 8),  // Left side view
    new THREE.Vector3(0, 8, 12),    // Top view
    new THREE.Vector3(0, -8, 12)    // Bottom view
];

const cameraSettings = {
    currentTarget: 0,
    transitionTime: 0,
    transitionDuration: 2,
    shakeIntensity: 0,
    maxShake: 0.3,
    zoomLevel: 1,
    baseZoom: 10
};

function updateCamera(time, delta, beatStrength) {
    // Change camera target on strong beats
    if (beatStrength > 0.8 && Math.random() > 0.7) {
        cameraSettings.currentTarget = (cameraSettings.currentTarget + 1) % cameraTargets.length;
        cameraSettings.transitionTime = 0;
        cameraSettings.shakeIntensity = cameraSettings.maxShake;
    }

    // Update transition
    if (cameraSettings.transitionTime < cameraSettings.transitionDuration) {
        cameraSettings.transitionTime += delta;
        const progress = Math.min(1, cameraSettings.transitionTime / cameraSettings.transitionDuration);
        
        // Smooth easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // Get current and next positions
        const currentPos = cameraTargets[cameraSettings.currentTarget];
        const nextPos = cameraTargets[(cameraSettings.currentTarget + 1) % cameraTargets.length];
        
        // Interpolate position
        camera.position.lerpVectors(currentPos, nextPos, eased);
    }

    // Camera shake effect
    if (cameraSettings.shakeIntensity > 0) {
        const shake = cameraSettings.shakeIntensity;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        camera.position.z += (Math.random() - 0.5) * shake;
        
        // Decay shake intensity
        cameraSettings.shakeIntensity *= 0.95;
    }

    // Zoom effect based on beat
    const targetZoom = cameraSettings.baseZoom - (beatStrength * 2);
    cameraSettings.zoomLevel = THREE.MathUtils.lerp(
        cameraSettings.zoomLevel,
        targetZoom,
        delta * 3
    );
    camera.position.multiplyScalar(cameraSettings.zoomLevel / camera.position.length());

    // Random whip-pan on strong beats
    if (beatStrength > 0.9 && Math.random() > 0.8) {
        const randomAngle = (Math.random() - 0.5) * Math.PI * 0.5;
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(randomAngle);
        camera.position.applyMatrix4(rotationMatrix);
    }

    // Always look at center with slight offset
    const lookAtPos = new THREE.Vector3(
        Math.sin(time) * 0.5,
        Math.cos(time * 0.7) * 0.5,
        0
    );
    camera.lookAt(lookAtPos);
}

function animate() {
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    const positions = particles.attributes.position.array;
    let nearEndParticles = 0;
    
    // Check if all particles have completed their lifetime
    let allParticlesComplete = true;
    for (let i = 0; i < particleCount; i++) {
        // Update positions based on velocity
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];

        // Update lifetimes and fade out
        lifetimes[i] -= delta;
        
        if (lifetimes[i] > 0) {
            allParticlesComplete = false;
            particleMaterial.opacity = Math.min(1, lifetimes[i] / 2);
        }
    }

    // When explosion is complete, show image
    if (allParticlesComplete && !explosionComplete) {
        explosionComplete = true;
        particleSystem.visible = false;
    }

    // Fade in image after explosion
    if (explosionComplete && imageMaterial.opacity < 1) {
        if (imageStartTime === 0) imageStartTime = time;
        imageMaterial.opacity += delta * 0.5;
        
        if (imageMaterial.opacity > 0.8 && !textOverlay.classList.contains('visible')) {
            textOverlay.classList.add('visible');
        }
        
        // Animate background and lights during fade-in
        backgroundMaterial.emissiveIntensity = 0.5 + Math.sin(time * 1.5) * 0.2;
        
        // Dynamic spotlight movement
        spotLight1.position.x = Math.sin(time * 0.5) * 5;
        spotLight1.position.y = Math.cos(time * 0.7) * 5;
        spotLight1.intensity = 3 + Math.sin(time * 2) * 1;
        
        spotLight2.position.x = -Math.sin(time * 0.6) * 5;
        spotLight2.position.y = -Math.cos(time * 0.8) * 5;
        spotLight2.intensity = 3 + Math.cos(time * 2) * 1;
    }

    // Add image timeout check and swarm initialization
    if (time - imageStartTime > IMAGE_DISPLAY_DURATION && !swarmStarted && explosionComplete) {
        swarmStarted = true;
        imageMesh.visible = false;
        textOverlay.classList.remove('visible');
        initSwarm();
    }

    particles.attributes.position.needsUpdate = true;
    composer.render();

    // Add to the animate function
    if (swarmStarted) {
        for (let i = 0; i < SWARM_COUNT; i++) {
            const i3 = i * 3;
            
            // Update accelerations
            swarmAccelerations[i3] = (Math.random() - 0.5) * 0.01;
            swarmAccelerations[i3 + 1] = (Math.random() - 0.5) * 0.01;
            swarmAccelerations[i3 + 2] = (Math.random() - 0.5) * 0.01;
            
            // Update velocities
            swarmVelocities[i3] += swarmAccelerations[i3];
            swarmVelocities[i3 + 1] += swarmAccelerations[i3 + 1];
            swarmVelocities[i3 + 2] += swarmAccelerations[i3 + 2];
            
            // Apply damping
            swarmVelocities[i3] *= 0.99;
            swarmVelocities[i3 + 1] *= 0.99;
            swarmVelocities[i3 + 2] *= 0.99;
            
            // Update positions
            swarmPositions[i3] += swarmVelocities[i3];
            swarmPositions[i3 + 1] += swarmVelocities[i3 + 1];
            swarmPositions[i3 + 2] += swarmVelocities[i3 + 2];
            
            // Update trails
            swarmTrails[i].positions.unshift([
                swarmPositions[i3],
                swarmPositions[i3 + 1],
                swarmPositions[i3 + 2]
            ]);
            
            if (swarmTrails[i].positions.length > swarmTrails[i].maxLength) {
                swarmTrails[i].positions.pop();
            }
        }
        
        swarmGeometry.attributes.position.needsUpdate = true;
    }

    // Update light beams
    const beatStrength = updateBeat(time);
    lightBeams.forEach((beam, index) => {
        // Rotate beam
        const rotationSpeed = beam.userData.rotationSpeed;
        const baseAngle = beam.userData.rotationOffset;
        const angle = baseAngle + time * rotationSpeed;
        
        beam.position.x = Math.cos(angle) * 10;
        beam.position.y = Math.sin(angle) * 10;
        
        // Point toward center with slight variation
        beam.lookAt(
            Math.sin(time * 0.5 + index) * 2,
            Math.cos(time * 0.7 + index) * 2,
            0
        );
        
        // Strobe and pulse effects
        const strobeIntensity = Math.random() > 0.9 ? 3 : 1;
        const pulseIntensity = Math.sin(time * 2 + beam.userData.pulsePhase) * 0.5 + 0.5;
        const beatBoost = beatStrength * 2;
        
        beam.intensity = beam.userData.baseIntensity * 
                        strobeIntensity * 
                        pulseIntensity + 
                        beatBoost;
        
        // Animate beam angle
        beam.angle = Math.PI / 8 + Math.sin(time * 3 + index) * 0.1;
    });
    
    // Add global strobe on strong beats
    if (beatStrength > 0.8) {
        scene.background = new THREE.Color(0x111111);
    } else {
        scene.background = new THREE.Color(0x000000);
    }

    // Update camera
    updateCamera(time, delta, beatStrength);
}

// Optional: Add bloom effect for extra glow
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

// Add window resize handler
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
});