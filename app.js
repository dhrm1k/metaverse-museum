// ========== SETUP THREE.JS ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ========== IMPROVED LIGHTING ==========
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
directionalLight.castShadow = true;
scene.add(directionalLight);

// ========== FLOOR & WALLS ==========
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ========== WORKING PAINTINGS ==========
const paintingData = [
    { 
        name: "Mona Lisa", 
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
        position: { x: -6, y: 2, z: -5 },
        rotationY: Math.PI / 2
    },
    {
        name: "Starry Night",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        position: { x: 6, y: 2, z: -5 },
        rotationY: -Math.PI / 2
    },
    {
        name: "The Scream",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg",
        position: { x: -6, y: 2, z: 5 },
        rotationY: Math.PI / 2
    },
    {
        name: "Girl with a Pearl Earring",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/800px-1665_Girl_with_a_Pearl_Earring.jpg",
        position: { x: 6, y: 2, z: 5 },
        rotationY: -Math.PI / 2
    }
];

const textureLoader = new THREE.TextureLoader();
paintingData.forEach((painting) => {
    textureLoader.load(
        painting.url,
        (texture) => {
            const paintingMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(4, 3),
                new THREE.MeshStandardMaterial({ 
                    map: texture,
                    side: THREE.DoubleSide
                })
            );
            paintingMesh.position.set(painting.position.x, painting.position.y, painting.position.z);
            paintingMesh.rotation.y = painting.rotationY;
            scene.add(paintingMesh);
        },
        undefined,
        (error) => {
            console.error("Error loading texture:", painting.name, error);
            const fallbackMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                emissive: 0x888888
            });
            const paintingMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(4, 3),
                fallbackMaterial
            );
            paintingMesh.position.set(painting.position.x, painting.position.y, painting.position.z);
            paintingMesh.rotation.y = painting.rotationY;
            scene.add(paintingMesh);
        }
    );
});
// ========== IMPROVED FPS CONTROLS ==========
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const moveSpeed = 0.2;
const rotationSpeed = 0.002;

// Create a camera group for better movement control
const cameraGroup = new THREE.Group();
scene.add(cameraGroup);
cameraGroup.position.set(0, 1.6, 0); // Set initial position at eye level
cameraGroup.add(camera);
camera.position.set(0, 0, 0); // Reset camera position relative to group

// Store rotation values
let pitch = 0; // Vertical rotation (up/down)
let yaw = 0;   // Horizontal rotation (left/right)

document.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w': moveForward = true; break;
        case 's': moveBackward = true; break;
        case 'a': moveLeft = true; break;
        case 'd': moveRight = true; break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w': moveForward = false; break;
        case 's': moveBackward = false; break;
        case 'a': moveLeft = false; break;
        case 'd': moveRight = false; break;
    }
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        // Update rotation angles
        yaw -= e.movementX * rotationSpeed;
        pitch -= e.movementY * rotationSpeed;
        
        // Limit vertical rotation to prevent flipping
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        
        // Apply rotations to camera group
        cameraGroup.rotation.set(pitch, yaw, 0, 'YXZ');
    }
});

renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

// ========== SMOOTH ANIMATION LOOP ==========
function animate() {
    requestAnimationFrame(animate);

    // Get forward direction from camera group's rotation
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraGroup.quaternion);
    forward.y = 0; // Keep movement horizontal
    forward.normalize();

    // Calculate right direction perpendicular to forward
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    
    // Apply movement relative to camera direction
    if (moveForward) cameraGroup.position.addScaledVector(forward, moveSpeed);
    if (moveBackward) cameraGroup.position.addScaledVector(forward, -moveSpeed);
    if (moveLeft) cameraGroup.position.addScaledVector(right, moveSpeed);
    if (moveRight) cameraGroup.position.addScaledVector(right, -moveSpeed);

    // Keep camera at fixed height
    cameraGroup.position.y = 1.6;

    renderer.render(scene, camera);
}
animate();

// ========== SMOOTH ANIMATION LOOP ==========
function animate() {
    requestAnimationFrame(animate);

    // Movement - completely smooth with no vertical variation
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; // Keep movement horizontal
    direction.normalize();

    const sideDirection = new THREE.Vector3(-direction.z, 0, direction.x); // Perpendicular to forward
    
    if (moveForward) camera.position.addScaledVector(direction, moveSpeed);
    if (moveBackward) camera.position.addScaledVector(direction, -moveSpeed);
    if (moveLeft) camera.position.addScaledVector(sideDirection, moveSpeed);
    if (moveRight) camera.position.addScaledVector(sideDirection, -moveSpeed);

    // Keep camera at fixed height
    camera.position.y = 1.6;

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});