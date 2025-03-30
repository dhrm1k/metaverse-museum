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
                    side: THREE.DoubleSide // Ensure visible from both sides
                })
            );
            paintingMesh.position.set(painting.position.x, painting.position.y, painting.position.z);
            paintingMesh.rotation.y = painting.rotationY;
            scene.add(paintingMesh);
        },
        undefined,
        (error) => {
            console.error("Error loading texture:", painting.name, error);
            // Fallback: Use colored plane if texture fails
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

// ========== FPS CONTROLS (Same as Before) ==========
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const moveSpeed = 0.2;

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
        camera.rotation.y -= e.movementX * 0.002;
        camera.rotation.x -= e.movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
});

renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

// ========== ANIMATION LOOP ==========
function animate() {
    requestAnimationFrame(animate);

    // Movement
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    if (moveForward) camera.position.addScaledVector(direction, moveSpeed);
    if (moveBackward) camera.position.addScaledVector(direction, -moveSpeed);
    if (moveLeft) camera.position.addScaledVector(new THREE.Vector3(-direction.z, 0, direction.x), moveSpeed);
    if (moveRight) camera.position.addScaledVector(new THREE.Vector3(direction.z, 0, -direction.x), moveSpeed);

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});