// ========== INITIAL SETUP ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ========== ENHANCED LIGHTING ==========
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Add subtle light from windows
const windowLight = new THREE.RectAreaLight(0xffffff, 2, 20, 20);
windowLight.position.set(0, 10, -15);
windowLight.rotation.x = Math.PI;
scene.add(windowLight);

// ========== MUSEUM ARCHITECTURE ==========
const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.7,
    metalness: 0.3
});

const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
    roughness: 0.5
});

// Create grand hall with 3 floors
const floorHeight = 6;
const museumWidth = 40;
const museumDepth = 30;

// Generate floors
for (let floor = 0; floor < 3; floor++) {
    const yPos = floor * floorHeight;
    
    // Floor
    const floorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(museumWidth, museumDepth),
        floorMaterial
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = yPos;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    
    // Ceiling (except top floor)
    if (floor < 2) {
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(museumWidth, museumDepth),
            new THREE.MeshStandardMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.7
            })
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = yPos + floorHeight;
        scene.add(ceiling);
    }
    
    // Outer walls
    const outerWalls = [
        { x: -museumWidth/2, z: 0, rotationY: Math.PI/2, width: museumDepth, height: floorHeight },
        { x: museumWidth/2, z: 0, rotationY: -Math.PI/2, width: museumDepth, height: floorHeight },
        { x: 0, z: -museumDepth/2, rotationY: 0, width: museumWidth, height: floorHeight },
        { x: 0, z: museumDepth/2, rotationY: Math.PI, width: museumWidth, height: floorHeight }
    ];
    
    outerWalls.forEach(wall => {
        const wallMesh = new THREE.Mesh(
            new THREE.BoxGeometry(wall.width, wall.height, 0.3),
            wallMaterial
        );
        wallMesh.position.set(wall.x, yPos + wall.height/2, wall.z);
        wallMesh.rotation.y = wall.rotationY;
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        scene.add(wallMesh);
    });
    
    // Add decorative columns
    for (let i = -museumWidth/2 + 5; i < museumWidth/2; i += 10) {
        const column = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.8, floorHeight, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        column.position.set(i, yPos + floorHeight/2, -museumDepth/2 + 2);
        scene.add(column);
    }
    
    // Add paintings (10 per floor)
    addPaintings(yPos, floor);
    
    // Add stairs/elevators between floors
    if (floor < 2) {
        const stairs = new THREE.Mesh(
            new THREE.BoxGeometry(4, floorHeight, 3),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 })
        );
        stairs.position.set(museumWidth/2 - 3, yPos + floorHeight/2, 0);
        scene.add(stairs);
        
        const elevator = new THREE.Mesh(
            new THREE.BoxGeometry(3, floorHeight, 3),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        elevator.position.set(-museumWidth/2 + 3, yPos + floorHeight/2, 0);
        scene.add(elevator);
    }
}

// ========== ADD 30+ PAINTINGS ==========
function addPaintings(yPos, floor) {
    const paintingUrls = [
        // Floor 1: Renaissance
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/800px-1665_Girl_with_a_Pearl_Earring.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/The_School_of_Athens.jpg/1920px-The_School_of_Athens.jpg",
        // Floor 2: Modern
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Pablo_Picasso%2C_1901-02%2C_Femme_au_caf%C3%A9_%28Absinthe_Drinker%29%2C_oil_on_canvas%2C_73_x_54_cm%2C_Hermitage_Museum.jpg/800px-Pablo_Picasso%2C_1901-02%2C_Femme_au_caf%C3%A9_%28Absinthe_Drinker%29%2C_oil_on_canvas%2C_73_x_54_cm%2C_Hermitage_Museum.jpg",
        // Floor 3: Contemporary
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Andy_Warhol%2C_1967%2C_Marilyn_Monroe%2C_synthetic_polymer%2C_silk-screen_ink_on_canvas.jpg/800px-Andy_Warhol%2C_1967%2C_Marilyn_Monroe%2C_synthetic_polymer%2C_silk-screen_ink_on_canvas.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Banksy_Girl_with_Balloon.jpg/800px-Banksy_Girl_with_Balloon.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Yayoi_Kusama_2013.jpg/800px-Yayoi_Kusama_2013.jpg"
    ];
    
    const textureLoader = new THREE.TextureLoader();
    const paintingSize = { width: 3, height: 2 };
    
    // Place 10 paintings per floor
    for (let i = 0; i < 10; i++) {
        const paintingIndex = (floor * 3) + (i % 3); // Cycle through available paintings
        textureLoader.load(paintingUrls[paintingIndex], (texture) => {
            const painting = new THREE.Mesh(
                new THREE.PlaneGeometry(paintingSize.width, paintingSize.height),
                new THREE.MeshStandardMaterial({
                    map: texture,
                    side: THREE.DoubleSide
                })
            );
            
            // Position paintings on walls
            const wallPosition = i % 4; // Distribute across 4 walls
            let x, z, rotationY;
            
            switch(wallPosition) {
                case 0: // Left wall
                    x = -museumWidth/2 + 0.2;
                    z = -museumDepth/2 + 3 + (i * 2.5);
                    rotationY = Math.PI/2;
                    break;
                case 1: // Right wall
                    x = museumWidth/2 - 0.2;
                    z = -museumDepth/2 + 3 + (i * 2.5);
                    rotationY = -Math.PI/2;
                    break;
                case 2: // Back wall
                    x = -museumWidth/2 + 5 + (i * 3.5);
                    z = -museumDepth/2 + 0.2;
                    rotationY = Math.PI;
                    break;
                case 3: // Front wall
                    x = -museumWidth/2 + 5 + (i * 3.5);
                    z = museumDepth/2 - 0.2;
                    rotationY = 0;
                    break;
            }
            
            painting.position.set(x, yPos + 1.5, z);
            painting.rotation.y = rotationY;
            scene.add(painting);
        });
    }
}

// ========== FLOOR NAVIGATION ==========
const floorInfo = [
    { name: "Renaissance Art", y: 0 },
    { name: "Modern Art", y: floorHeight },
    { name: "Contemporary Art", y: floorHeight * 2 }
];
let currentFloor = 0;
const floorIndicator = document.getElementById('floor-indicator');

// Click to teleport between floors
document.addEventListener('click', () => {
    if (!document.pointerLockElement) return;
    
    currentFloor = (currentFloor + 1) % 3;
    camera.position.y = floorInfo[currentFloor].y + 1.6;
    floorIndicator.textContent = `Floor ${currentFloor + 1}: ${floorInfo[currentFloor].name}`;
});

// ========== ENHANCED CONTROLS ==========
const controls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
};

document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w': case 'arrowup': controls.forward = true; break;
        case 's': case 'arrowdown': controls.backward = true; break;
        case 'a': case 'arrowleft': controls.left = true; break;
        case 'd': case 'arrowright': controls.right = true; break;
        case 'e': controls.up = true; break;
        case 'q': controls.down = true; break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w': case 'arrowup': controls.forward = false; break;
        case 's': case 'arrowdown': controls.backward = false; break;
        case 'a': case 'arrowleft': controls.left = false; break;
        case 'd': case 'arrowright': controls.right = false; break;
        case 'e': controls.up = false; break;
        case 'q': controls.down = false; break;
    }
});

// Mouse look
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        camera.rotation.y -= e.movementX * 0.002;
        camera.rotation.x -= e.movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
});

// Enable pointer lock
renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

// ========== ANIMATION LOOP ==========
function animate() {
    requestAnimationFrame(animate);

    // Movement
    const moveSpeed = 0.2;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    if (controls.forward) camera.position.addScaledVector(direction, moveSpeed);
    if (controls.backward) camera.position.addScaledVector(direction, -moveSpeed);
    if (controls.left) camera.position.addScaledVector(new THREE.Vector3(-direction.z, 0, direction.x), moveSpeed);
    if (controls.right) camera.position.addScaledVector(new THREE.Vector3(direction.z, 0, -direction.x), moveSpeed);
    
    // Vertical movement (elevator)
    if (controls.up && camera.position.y < floorHeight * 2 + 1.6) {
        camera.position.y += moveSpeed;
        if (camera.position.y >= floorInfo[currentFloor + 1]?.y + 1.6) {
            currentFloor++;
            floorIndicator.textContent = `Floor ${currentFloor + 1}: ${floorInfo[currentFloor].name}`;
        }
    }
    if (controls.down && camera.position.y > 1.6) {
        camera.position.y -= moveSpeed;
        if (camera.position.y <= floorInfo[currentFloor - 1]?.y + 1.6) {
            currentFloor--;
            floorIndicator.textContent = `Floor ${currentFloor + 1}: ${floorInfo[currentFloor].name}`;
        }
    }

    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ========== BOUNDARY CONSTRAINTS ==========
function checkBoundaries() {
    // Museum boundaries
    const halfWidth = museumWidth / 2 - 1; // Buffer to prevent clipping
    const halfDepth = museumDepth / 2 - 1;
    
    // Constrain X position (left/right walls)
    if (camera.position.x < -halfWidth) {
        camera.position.x = -halfWidth;
    } else if (camera.position.x > halfWidth) {
        camera.position.x = halfWidth;
    }
    
    // Constrain Z position (front/back walls)
    if (camera.position.z < -halfDepth) {
        camera.position.z = -halfDepth;
    } else if (camera.position.z > halfDepth) {
        camera.position.z = halfDepth;
    }
    
    // Constrain Y position (floor/ceiling)
    const currentFloorY = floorInfo[currentFloor].y;
    if (camera.position.y < currentFloorY + 1.6) { // 1.6 is eye level
        camera.position.y = currentFloorY + 1.6;
    } else if (camera.position.y > currentFloorY + floorHeight - 0.5) { // 0.5m buffer from ceiling
        camera.position.y = currentFloorY + floorHeight - 0.5;
    }
    
    // Prevent going through stairs/elevator unless near them
    const stairsX = museumWidth/2 - 3;
    const elevatorX = -museumWidth/2 + 3;
    const stairsZ = 0;
    
    // If not near stairs/elevator, constrain to current floor
    const nearStairs = (
        Math.abs(camera.position.x - stairsX) < 3 && 
        Math.abs(camera.position.z - stairsZ) < 2
    );
    
    const nearElevator = (
        Math.abs(camera.position.x - elevatorX) < 2 && 
        Math.abs(camera.position.z - stairsZ) < 2
    );
    
    if (!nearStairs && !nearElevator) {
        camera.position.y = floorInfo[currentFloor].y + 1.6;
    }
}

// ========== UPDATED ANIMATION LOOP ==========
function animate() {
    requestAnimationFrame(animate);

    // Movement
    const moveSpeed = 0.2;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    if (controls.forward) camera.position.addScaledVector(direction, moveSpeed);
    if (controls.backward) camera.position.addScaledVector(direction, -moveSpeed);
    if (controls.left) camera.position.addScaledVector(new THREE.Vector3(-direction.z, 0, direction.x), moveSpeed);
    if (controls.right) camera.position.addScaledVector(new THREE.Vector3(direction.z, 0, -direction.x), moveSpeed);
    
    // Vertical movement (elevator)
    if (controls.up) {
        camera.position.y += moveSpeed;
        if (camera.position.y >= floorInfo[currentFloor + 1]?.y + 1.6) {
            currentFloor = Math.min(2, currentFloor + 1);
            floorIndicator.textContent = `Floor ${currentFloor + 1}: ${floorInfo[currentFloor].name}`;
        }
    }
    if (controls.down) {
        camera.position.y -= moveSpeed;
        if (camera.position.y <= floorInfo[currentFloor - 1]?.y + 1.6) {
            currentFloor = Math.max(0, currentFloor - 1);
            floorIndicator.textContent = `Floor ${currentFloor + 1}: ${floorInfo[currentFloor].name}`;
        }
    }

    // Apply boundary constraints
    checkBoundaries();

    renderer.render(scene, camera);
}
animate();