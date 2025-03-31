// ========== ENHANCED VIRTUAL MUSEUM WITH INDOOR SPACES ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue

// Enhanced color palette for more immersive experience
const museumColors = {
    // Exterior colors
    nature: 0x7DAA6E,      // Natural green
    sunset: 0xF7B267,      // Warm sunset
    twilight: 0x9B6B9E,    // Twilight purple
    sakura: 0xFFB7C5,      // Cherry blossom pink
    ocean: 0x6BAED6,       // Ocean blue
    forest: 0x2C5F2D,      // Forest green
    sand: 0xE6D2AC,        // Sand/stone
    mountain: 0x8A8580,    // Mountain stone
    
    // Interior colors
    wood: 0x8B5A2B,        // Wood tone
    marble: 0xF5F5F5,      // Marble/stone
    accent: 0xB76E79,      // Accent color
    floor: 0xBCA887,       // Floor color
    wall: 0xE8E0D5,        // Wall color
    ceiling: 0xFAF7F2,     // Ceiling color
    trim: 0x514644         // Trim/details
};

// Camera setup with improved near/far planes for indoor/outdoor transitions
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 10);

// Renderer with optimized settings
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: 'high-performance',
    precision: 'mediump'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
renderer.outputEncoding = THREE.sRGBEncoding; // Improved color rendering
document.body.appendChild(renderer.domElement);

// Texture loader with cache for better performance
const textureLoader = new THREE.TextureLoader();
const textureCache = {};

function loadTexture(url) {
    if (!textureCache[url]) {
        const texture = textureLoader.load(url);
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        textureCache[url] = texture;
    }
    return textureCache[url];
}

// ========== OPTIMIZED LIGHTING ==========
// Global lighting for outdoor areas
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xB1E1FF, 0xB97A20, 0.8);
scene.add(hemisphereLight);

// Optimized directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(50, 100, 30);
directionalLight.castShadow = true;

// Optimized shadow settings
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 10;
directionalLight.shadow.camera.far = 200;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.bias = -0.0005;
scene.add(directionalLight);

// Dynamic light manager for indoor/outdoor transitions
const lightManager = {
    indoor: [],
    outdoor: [directionalLight, hemisphereLight],
    currentState: "outdoor",
    
    // Add indoor lights (will be called when creating indoor spaces)
    addIndoorLight(light) {
        this.indoor.push(light);
        return light;
    },
    
    // Toggle between indoor and outdoor lighting
    setIndoor(isIndoor) {
        if (isIndoor && this.currentState !== "indoor") {
            // Transition to indoor lighting
            this.outdoor.forEach(light => light.intensity *= 0.3);
            this.indoor.forEach(light => scene.add(light));
            this.currentState = "indoor";
        } else if (!isIndoor && this.currentState !== "outdoor") {
            // Transition to outdoor lighting
            this.outdoor.forEach(light => light.intensity *= 3.33);
            this.indoor.forEach(light => scene.remove(light));
            this.currentState = "outdoor";
        }
    }
};

// ========== OPEN WORLD TERRAIN ==========
// Larger, more varied terrain
const terrainSize = 200;
const terrainSegments = 128;
const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);

// Create natural-looking terrain with height variation
const peaks = [];
for (let i = 0; i < 12; i++) {
    peaks.push({
        x: Math.random() * terrainSize - terrainSize/2,
        z: Math.random() * terrainSize - terrainSize/2,
        height: Math.random() * 5 + 2,
        radius: Math.random() * 15 + 10
    });
}

// Apply height variation to terrain
const vertices = terrainGeometry.attributes.position.array;
for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const z = vertices[i+2];
    
    // Base terrain with undulation
    let height = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
    
    // Add mountain peaks
    for (const peak of peaks) {
        const dx = x - peak.x;
        const dz = z - peak.z;
        const distance = Math.sqrt(dx*dx + dz*dz);
        if (distance < peak.radius) {
            height += peak.height * (1 - distance/peak.radius);
        }
    }
    
    vertices[i+1] = height;
}

// Update terrain normals
terrainGeometry.computeVertexNormals();

// Load grass texture for terrain
const grassTexture = loadTexture('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(terrainSize/25, terrainSize/25);

// Terrain material with texture
const terrainMaterial = new THREE.MeshStandardMaterial({
    map: grassTexture,
    color: museumColors.nature,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: false
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.rotation.x = -Math.PI / 2;
terrain.receiveShadow = true;
scene.add(terrain);

// ========== OBJECT MANAGEMENT & OPTIMIZATION ==========
// Object pooling and instance management
const museumObjects = {
    exhibits: [],
    landmarks: [],
    decorations: [],
    indoorSpaces: [],
    
    // Add method for better memory management and optimization
    add(object, category = 'decorations') {
        this[category].push(object);
        scene.add(object);
        return object;
    },
    
    // Remove method with cleanup
    remove(object, category = 'decorations') {
        const index = this[category].indexOf(object);
        if (index !== -1) {
            this[category].splice(index, 1);
            scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
    },
    
    // Update visible objects based on distance from camera (optimization)
    updateVisibility(cameraPosition, maxDistance = 100) {
        const categories = ['exhibits', 'decorations', 'landmarks'];
        categories.forEach(category => {
            this[category].forEach(obj => {
                const distance = cameraPosition.distanceTo(obj.position);
                obj.visible = distance <= maxDistance;
            });
        });
    }
};

// ========== INDOOR BUILDING CREATION ==========
// Create a museum building with multiple floors, stairs and exhibits
function createMuseumBuilding(x, z, size = 20, floors = 2) {
    // Group to hold all building parts
    const building = new THREE.Group();
    building.position.set(x, 0, z);
    scene.add(building);
    
    // Get height at position for the building foundation
    const baseHeight = getHeightAtPosition(x, z);
    
    // Materials for building
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: museumColors.wall,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: museumColors.floor,
        roughness: 0.8,
        metalness: 0.2
    });
    
    const marbleMaterial = new THREE.MeshStandardMaterial({ 
        color: museumColors.marble,
        roughness: 0.3,
        metalness: 0.2
    });
    
    const woodMaterial = new THREE.MeshStandardMaterial({ 
        color: museumColors.wood,
        roughness: 0.9,
        metalness: 0.1
    });
    
    // Load wood texture for floors
    const woodTexture = loadTexture('https://threejs.org/examples/textures/hardwood2_diffuse.jpg');
    woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(size/3, size/3);
    
    const woodFloorMaterial = new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: 0xFFFFFF,
        roughness: 0.8,
        metalness: 0.1
    });
    
    // Building dimensions
    const floorHeight = 4;
    const wallThickness = 0.5;
    const doorWidth = 4;
    const doorHeight = 3;
    const windowSize = 1.5;
    
    // Track indoor spaces for collision detection and lighting management
    const indoorSpaces = [];
    
    // Create foundations and entrance steps
    const foundationHeight = 0.5;
    const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(size + 4, foundationHeight, size + 4),
        marbleMaterial
    );
    foundation.position.set(0, baseHeight + foundationHeight/2, 0);
    foundation.receiveShadow = true;
    building.add(foundation);
    
    // Entrance steps
    const stepCount = 5;
    const stepWidth = 8;
    const stepDepth = 0.4;
    const stepHeight = foundationHeight / stepCount;
    
    for (let i = 0; i < stepCount; i++) {
        const step = new THREE.Mesh(
            new THREE.BoxGeometry(stepWidth, stepHeight, (i+1) * stepDepth),
            marbleMaterial
        );
        step.position.set(
            0, 
            baseHeight + (i+0.5) * stepHeight, 
            size/2 + 2 + i * stepDepth/2
        );
        step.receiveShadow = true;
        step.castShadow = true;
        building.add(step);
    }
    
    // Create floors
    for (let floor = 0; floor < floors; floor++) {
        // Calculate the Y position for this floor
        const floorY = baseHeight + foundationHeight + floor * floorHeight;
        
        // Create main floor
        const floorMesh = new THREE.Mesh(
            new THREE.BoxGeometry(size, 0.2, size),
            woodFloorMaterial
        );
        floorMesh.position.set(0, floorY, 0);
        floorMesh.receiveShadow = true;
        building.add(floorMesh);
        
        // Create ceiling (except for top floor)
        if (floor < floors - 1) {
            const ceiling = new THREE.Mesh(
                new THREE.BoxGeometry(size, 0.2, size),
                new THREE.MeshStandardMaterial({ color: museumColors.ceiling })
            );
            ceiling.position.set(0, floorY + floorHeight - 0.1, 0);
            ceiling.receiveShadow = true;
            building.add(ceiling);
        } else {
            // Top floor gets a roof
            const roofHeight = 2;
            const roof = new THREE.Mesh(
                new THREE.ConeGeometry(size/1.414, roofHeight, 4),
                new THREE.MeshStandardMaterial({ color: museumColors.trim })
            );
            roof.position.set(0, floorY + floorHeight + roofHeight/2, 0);
            roof.rotation.y = Math.PI/4;
            roof.castShadow = true;
            building.add(roof);
        }
        
        // Create walls with doorways and windows
        // Front wall with entrance
        if (floor === 0) {
            // Ground floor has entrance door
            createWallWithDoor(
                0, floorY + floorHeight/2, size/2, 
                size, floorHeight, wallThickness,
                doorWidth, doorHeight, 
                true
            );
        } else {
            // Upper floors have windows instead
            createWallWithWindows(
                0, floorY + floorHeight/2, size/2, 
                size, floorHeight, wallThickness,
                windowSize, 3, true
            );
        }
        
        // Back wall with windows
        createWallWithWindows(
            0, floorY + floorHeight/2, -size/2, 
            size, floorHeight, wallThickness,
            windowSize, 3, true
        );
        
        // Left wall with windows
        createWallWithWindows(
            size/2, floorY + floorHeight/2, 0, 
            size, floorHeight, wallThickness,
            windowSize, 3, false
        );
        
        // Right wall with windows
        createWallWithWindows(
            -size/2, floorY + floorHeight/2, 0, 
            size, floorHeight, wallThickness,
            windowSize, 3, false
        );
        
        // Register the indoor space
        const indoorSpace = {
            min: new THREE.Vector3(x - size/2 + wallThickness, floorY, z - size/2 + wallThickness),
            max: new THREE.Vector3(x + size/2 - wallThickness, floorY + floorHeight, z + size/2 - wallThickness),
            floorY: floorY
        };
        indoorSpaces.push(indoorSpace);
        museumObjects.indoorSpaces.push(indoorSpace);
        
        // Add indoor lights
        const indoorLight1 = new THREE.PointLight(0xFFFFCC, 0.8, size * 1.5);
        indoorLight1.position.set(x - size/4, floorY + floorHeight - 0.5, z - size/4);
        lightManager.addIndoorLight(indoorLight1);
        
        const indoorLight2 = new THREE.PointLight(0xFFFFCC, 0.8, size * 1.5);
        indoorLight2.position.set(x + size/4, floorY + floorHeight - 0.5, z + size/4);
        lightManager.addIndoorLight(indoorLight2);
        
        // Add exhibits and furniture for this floor
        addIndoorExhibits(x, z, floorY, size, floor);
    }
    
    // Add a staircase connecting floors
    for (let floor = 0; floor < floors - 1; floor++) {
        const startY = baseHeight + foundationHeight + floor * floorHeight;
        const stairLength = size * 0.7;
        const stairWidth = size * 0.3;
        const stepCount = 16;
        const stepHeight = floorHeight / stepCount;
        const stepDepth = stairLength / stepCount;
        
        // Create the stair steps
        for (let step = 0; step < stepCount; step++) {
            const stepMesh = new THREE.Mesh(
                new THREE.BoxGeometry(stairWidth, stepHeight, stepDepth),
                woodMaterial
            );
            
            stepMesh.position.set(
                x - size/4, 
                startY + stepHeight * (step + 0.5), 
                z - size/4 + stepDepth * step + stepDepth/2
            );
            
            stepMesh.castShadow = true;
            stepMesh.receiveShadow = true;
            scene.add(stepMesh);
            
            // Add stair handrail (every 4 steps)
            if (step % 4 === 0) {
                const handrailHeight = 1;
                const handrail = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.05, 0.05, handrailHeight, 8),
                    new THREE.MeshStandardMaterial({ color: museumColors.trim })
                );
                
                handrail.position.set(
                    x - size/4 + stairWidth/2 - 0.1, 
                    startY + stepHeight * step + handrailHeight/2, 
                    z - size/4 + stepDepth * step
                );
                
                handrail.castShadow = true;
                scene.add(handrail);
                
                // Add connecting rail to next post
                if (step < stepCount - 4) {
                    const railLength = stepDepth * 4;
                    const rail = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.03, 0.03, railLength, 8),
                        new THREE.MeshStandardMaterial({ color: museumColors.trim })
                    );
                    
                    rail.rotation.x = Math.PI / 2;
                    rail.rotation.z = Math.atan2(stepHeight * 4, railLength);
                    
                    rail.position.set(
                        x - size/4 + stairWidth/2 - 0.1,
                        startY + stepHeight * (step + 2),
                        z - size/4 + stepDepth * (step + 2)
                    );
                    
                    rail.castShadow = true;
                    scene.add(rail);
                }
            }
        }
    }
    
    // Create wall with door helper function
    function createWallWithDoor(x, y, z, width, height, thickness, doorWidth, doorHeight, isXAligned) {
        // Calculate dimensions for wall pieces
        const sideWidth = (width - doorWidth) / 2;
        
        // Create wall pieces (3 parts: left of door, above door, right of door)
        const wallMeshes = [];
        
        if (isXAligned) {
            // Left wall segment
            wallMeshes.push(new THREE.Mesh(
                new THREE.BoxGeometry(sideWidth, height, thickness),
                wallMaterial
            ));
            wallMeshes[0].position.set(x - doorWidth/2 - sideWidth/2, y, z);
            
            // Right wall segment
            wallMeshes.push(new THREE.Mesh(
                new THREE.BoxGeometry(sideWidth, height, thickness),
                wallMaterial
            ));
            wallMeshes[1].position.set(x + doorWidth/2 + sideWidth/2, y, z);
            
            // Top wall segment
            wallMeshes.push(new THREE.Mesh(
                new THREE.BoxGeometry(doorWidth, height - doorHeight, thickness),
                wallMaterial
            ));
            wallMeshes[2].position.set(x, y + doorHeight/2, z);
        } else {
            // Left wall segment
            wallMeshes.push(new THREE.Mesh(
                new THREE.BoxGeometry(thickness, height, sideWidth),
                wallMaterial
            ));
            wallMeshes[0].position.set(x, y, z - doorWidth/2 - sideWidth/2);
            
            // Right wall segment
            wallMeshes.push(new THREE.Mesh(
                new THREE.BoxGeometry(thickness, height, sideWidth),
                wallMaterial
            ));
            wallMeshes[1].position.set(x, y, z + doorWidth/2 + sideWidth/2);
            
            // Top wall segment
            wallMeshes.push(new THREE.Mesh(
                new THREE.BoxGeometry(thickness, height - doorHeight, doorWidth),
                wallMaterial
            ));
            wallMeshes[2].position.set(x, y + doorHeight/2, z);
        }
        
        // Add wall segments to building
        wallMeshes.forEach(mesh => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            building.add(mesh);
        });
        
        // Add door frame
        const doorFrameMaterial = new THREE.MeshStandardMaterial({ 
            color: museumColors.wood,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Door threshold
        const threshold = new THREE.Mesh(
            new THREE.BoxGeometry(isXAligned ? doorWidth + 0.2 : thickness + 0.2, 0.1, isXAligned ? thickness + 0.2 : doorWidth + 0.2),
            doorFrameMaterial
        );
        threshold.position.set(x, y - height/2 + 0.05, z);
        building.add(threshold);
        
        // Door sides
        const doorSide1 = new THREE.Mesh(
            new THREE.BoxGeometry(isXAligned ? 0.1 : thickness + 0.2, doorHeight, isXAligned ? thickness + 0.2 : 0.1),
            doorFrameMaterial
        );
        doorSide1.position.set(
            isXAligned ? x - doorWidth/2 : x,
            y - height/2 + doorHeight/2, 
            isXAligned ? z : z - doorWidth/2
        );
        building.add(doorSide1);
        
        const doorSide2 = new THREE.Mesh(
            new THREE.BoxGeometry(isXAligned ? 0.1 : thickness + 0.2, doorHeight, isXAligned ? thickness + 0.2 : 0.1),
            doorFrameMaterial
        );
        doorSide2.position.set(
            isXAligned ? x + doorWidth/2 : x,
            y - height/2 + doorHeight/2, 
            isXAligned ? z : z + doorWidth/2
        );
        building.add(doorSide2);
        
        // Door top
        const doorTop = new THREE.Mesh(
            new THREE.BoxGeometry(isXAligned ? doorWidth + 0.2 : thickness + 0.2, 0.1, isXAligned ? thickness + 0.2 : doorWidth + 0.2),
            doorFrameMaterial
        );
        doorTop.position.set(x, y - height/2 + doorHeight, z);
        building.add(doorTop);
        
        return wallMeshes;
    }
    
    // Create wall with windows helper function
    function createWallWithWindows(x, y, z, width, height, thickness, windowSize, windowCount, isXAligned) {
        // Calculate window spacing
        const spacing = width / (windowCount + 1);
        
        // Create the main wall
        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(
                isXAligned ? width : thickness, 
                height, 
                isXAligned ? thickness : width
            ),
            wallMaterial
        );
        wall.position.set(x, y, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        building.add(wall);
        
// Add windows
const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    transmission: 0.95,
    metalness: 0.1
});

// Add windows to the walls where appropriate
function addWindows(house) {
    // Define window dimensions
    const windowWidth = 1.2;
    const windowHeight = 1.8;
    const windowThickness = 0.05;
    const windowOffsetY = 1.5; // Height from floor
    
    // Create window frames
    const windowGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowThickness);
    
    // Add windows to front wall
    for (let i = 0; i < 2; i++) {
        const xOffset = (i === 0) ? -3 : 3;
        
        const windowPane = new THREE.Mesh(windowGeometry, glassMaterial);
        windowPane.position.set(xOffset, windowOffsetY + windowHeight/2, -4.9);
        scene.add(windowPane);
        house.windows.push(windowPane);
        
        // Add decorative frame around window
        const frameGeometry = new THREE.BoxGeometry(windowWidth + 0.2, windowHeight + 0.2, 0.15);
        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x5c3a21,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const windowFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        windowFrame.position.set(xOffset, windowOffsetY + windowHeight/2, -4.95);
        scene.add(windowFrame);
        house.windows.push(windowFrame);
    }
    
    // Add windows to side walls
    for (let i = 0; i < 2; i++) {
        const zOffset = (i === 0) ? -2 : 2;
        
        const windowPane = new THREE.Mesh(windowGeometry, glassMaterial);
        windowPane.position.set(-5.9, windowOffsetY + windowHeight/2, zOffset);
        windowPane.rotation.y = Math.PI / 2;
        scene.add(windowPane);
        house.windows.push(windowPane);
        
        // Add window frame
        const frameGeometry = new THREE.BoxGeometry(windowWidth + 0.2, windowHeight + 0.2, 0.15);
        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x5c3a21,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const windowFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        windowFrame.position.set(-5.95, windowOffsetY + windowHeight/2, zOffset);
        windowFrame.rotation.y = Math.PI / 2;
        scene.add(windowFrame);
        house.windows.push(windowFrame);
    }
    
    // Add skylights to the roof
    const skylightGeometry = new THREE.PlaneGeometry(1.5, 1.5);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
            const skylight = new THREE.Mesh(skylightGeometry, glassMaterial);
            skylight.position.set(-2 + i * 2, 5.3, -1 + j * 2);
            skylight.rotation.x = -Math.PI / 4;
            scene.add(skylight);
            house.windows.push(skylight);
        }
    }
}

// Create Interior Furniture
function addInteriorFurniture(house) {
    // Art display pedestals
    const pedestalGeometry = new THREE.BoxGeometry(1, 1.2, 1);
    const pedestalMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        roughness: 0.7,
        metalness: 0.1
    });
    
    // Create art pedestals in a grid on the first floor
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
            const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
            pedestal.position.set(-3 + i * 3, 0.6, -3 + j * 3);
            pedestal.castShadow = true;
            pedestal.receiveShadow = true;
            scene.add(pedestal);
            house.furniture.push(pedestal);
            
            // Add artwork on top of pedestal
            const artIndex = i * 2 + j;
            const artWidth = 0.8;
            const artHeight = 1.2;
            
            // Create display item (could be a sculpture or painting)
            if (artIndex % 2 === 0) {
                // Create a simple sculpture
                const sculptureGeometry = new THREE.TorusKnotGeometry(0.3, 0.1, 64, 16);
                const sculptureMaterial = new THREE.MeshStandardMaterial({
                    color: animeColors[Object.keys(animeColors)[artIndex % Object.keys(animeColors).length]],
                    roughness: 0.5,
                    metalness: 0.8
                });
                
                const sculpture = new THREE.Mesh(sculptureGeometry, sculptureMaterial);
                sculpture.position.set(-3 + i * 3, 1.7, -3 + j * 3);
                sculpture.castShadow = true;
                scene.add(sculpture);
                house.furniture.push(sculpture);
            } else {
                // Create a simple framed artwork
                const frameGeometry = new THREE.BoxGeometry(artWidth + 0.1, artHeight + 0.1, 0.05);
                const frameMaterial = new THREE.MeshStandardMaterial({
                    color: 0x5c3a21,
                    roughness: 0.8,
                    metalness: 0.2
                });
                
                const frame = new THREE.Mesh(frameGeometry, frameMaterial);
                frame.position.set(-3 + i * 3, 1.8, -3 + j * 3);
                frame.castShadow = true;
                scene.add(frame);
                house.furniture.push(frame);
                
                // Add canvas inside frame
                const canvasGeometry = new THREE.PlaneGeometry(artWidth, artHeight);
                const canvasMaterial = new THREE.MeshStandardMaterial({
                    color: animeColors[Object.keys(animeColors)[artIndex % Object.keys(animeColors).length]],
                    roughness: 0.5,
                    metalness: 0.1
                });
                
                const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
                canvas.position.set(-3 + i * 3, 1.8, -2.98 + j * 3);
                scene.add(canvas);
                house.furniture.push(canvas);
            }
        }
    }
    
    // Add second floor gallery wall displays
    const galleryWallMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0f0f0,
        roughness: 0.7,
        metalness: 0.1
    });
    
    // Create gallery wall
    const galleryWall = new THREE.Mesh(
        new THREE.BoxGeometry(9, 3, 0.2),
        galleryWallMaterial
    );
    galleryWall.position.set(0, 4.5, 3);
    scene.add(galleryWall);
    house.furniture.push(galleryWall);
    
    // Add framed artwork to gallery wall
    for (let i = 0; i < 3; i++) {
        const frameGeometry = new THREE.BoxGeometry(1.8, 1.3, 0.1);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x5c3a21,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(-3 + i * 3, 4.5, 2.85);
        scene.add(frame);
        house.furniture.push(frame);
        
        // Create artwork
        const artGeometry = new THREE.PlaneGeometry(1.6, 1.1);
        const artMaterial = new THREE.MeshStandardMaterial({
            color: animeColors[Object.keys(animeColors)[(i + 3) % Object.keys(animeColors).length]],
            roughness: 0.6,
            metalness: 0.1
        });
        
        const art = new THREE.Mesh(artGeometry, artMaterial);
        art.position.set(-3 + i * 3, 4.5, 2.8);
        scene.add(art);
        house.furniture.push(art);
    }
    
    // Add seating area on first floor
    const benchGeometry = new THREE.BoxGeometry(3, 0.5, 0.8);
    const benchMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.1
    });
    
    const bench = new THREE.Mesh(benchGeometry, benchMaterial);
    bench.position.set(0, 0.25, 4);
    bench.castShadow = true;
    bench.receiveShadow = true;
    scene.add(bench);
    house.furniture.push(bench);
    
    // Add information desk
    const deskGeometry = new THREE.BoxGeometry(2, 1, 1);
    const deskMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.1
    });
    
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.set(3.5, 0.5, 4);
    desk.castShadow = true;
    desk.receiveShadow = true;
    scene.add(desk);
    house.furniture.push(desk);
    
    // Add a computer on the desk
    const computerBaseGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.4);
    const computerScreenGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.05);
    const computerMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.8
    });
    
    const computerBase = new THREE.Mesh(computerBaseGeometry, computerMaterial);
    computerBase.position.set(3.5, 1.05, 4);
    scene.add(computerBase);
    house.furniture.push(computerBase);
    
    const computerScreen = new THREE.Mesh(computerScreenGeometry, computerMaterial);
    computerScreen.position.set(3.5, 1.35, 3.9);
    computerScreen.rotation.x = -Math.PI / 8;
    scene.add(computerScreen);
    house.furniture.push(computerScreen);
    
    // Add screen display
    const screenDisplayGeometry = new THREE.PlaneGeometry(0.55, 0.35);
    const screenDisplayMaterial = new THREE.MeshBasicMaterial({
        color: 0x66CCFF,
        emissive: 0x66CCFF,
        emissiveIntensity: 0.5
    });
    
    const screenDisplay = new THREE.Mesh(screenDisplayGeometry, screenDisplayMaterial);
    screenDisplay.position.set(3.5, 1.35, 3.877);
    screenDisplay.rotation.x = -Math.PI / 8;
    scene.add(screenDisplay);
    house.furniture.push(screenDisplay);
}

// Add Interior Lighting
function addInteriorLighting(house) {
    // Add ceiling lights to first floor
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            // Create light fixture
            const fixtureGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
            const fixtureMaterial = new THREE.MeshStandardMaterial({
                color: 0xd4af37,
                roughness: 0.3,
                metalness: 0.8
            });
            
            const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
            fixture.position.set(-2 + i * 4, 2.9, -2 + j * 4);
            scene.add(fixture);
            house.lights.push(fixture);
            
            // Add point light
            const pointLight = new THREE.PointLight(0xffffcc, 0.8, 10);
            pointLight.position.copy(fixture.position);
            pointLight.position.y -= 0.1;
            pointLight.castShadow = true;
            
            // Optimize shadow map settings
            pointLight.shadow.mapSize.width = 512; 
            pointLight.shadow.mapSize.height = 512;
            pointLight.shadow.camera.near = 0.1;
            pointLight.shadow.camera.far = 10;
            
            scene.add(pointLight);
            house.lights.push(pointLight);
        }
    }
    
    // Add ceiling lights to second floor
    for (let i = 0; i < 2; i++) {
        // Create light fixture
        const fixtureGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
        const fixtureMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            roughness: 0.3,
            metalness: 0.8
        });
        
        const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
        fixture.position.set(-2 + i * 4, 5.9, 0);
        scene.add(fixture);
        house.lights.push(fixture);
        
        // Add point light
        const pointLight = new THREE.PointLight(0xffffcc, 0.8, 10);
        pointLight.position.copy(fixture.position);
        pointLight.position.y -= 0.1;
        pointLight.castShadow = true;
        
        // Optimize shadow map settings
        pointLight.shadow.mapSize.width = 512;
        pointLight.shadow.mapSize.height = 512;
        pointLight.shadow.camera.near = 0.1;
        pointLight.shadow.camera.far = 10;
        
        scene.add(pointLight);
        house.lights.push(pointLight);
    }
    
    // Add spotlights for artwork
    function addSpotlight(x, y, z, targetX, targetY, targetZ) {
        const spotlight = new THREE.SpotLight(0xffffff, 1.5);
        spotlight.position.set(x, y, z);
        spotlight.angle = Math.PI / 6;
        spotlight.penumbra = 0.3;
        spotlight.decay = 1.5;
        spotlight.distance = 8;
        
        // Create target for the spotlight
        const target = new THREE.Object3D();
        target.position.set(targetX, targetY, targetZ);
        scene.add(target);
        spotlight.target = target;
        
        // Optimize spotlight shadows
        spotlight.castShadow = true;
        spotlight.shadow.mapSize.width = 512;
        spotlight.shadow.mapSize.height = 512;
        spotlight.shadow.camera.near = 0.5;
        spotlight.shadow.camera.far = 10;
        
        scene.add(spotlight);
        house.lights.push(spotlight);
        house.lights.push(target);
    }
    
    // Add spotlights for gallery wall
    addSpotlight(-3, 6, 1, -3, 4.5, 3);
    addSpotlight(0, 6, 1, 0, 4.5, 3);
    addSpotlight(3, 6, 1, 3, 4.5, 3);
}

// Create a "House" object to track all house components
const house = {
    structure: [],
    stairs: [],
    floors: [],
    windows: [],
    doors: [],
    furniture: [],
    lights: []
};

// Create the house
createHouse(house);

// Add windows to the house
addWindows(house);

// Add interior furniture
addInteriorFurniture(house);

// Add interior lighting
addInteriorLighting(house);

// Add door interaction
function setupDoorInteraction() {
    // Track door state (open/closed)
    let doorOpen = false;
    
    // Add interaction to door
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'e') {
            // Check if player is near the door
            const doorPosition = new THREE.Vector3(0, 0, -5);
            const playerPosition = camera.position.clone();
            const distance = doorPosition.distanceTo(playerPosition);
            
            if (distance < 3) {
                // Toggle door state
                doorOpen = !doorOpen;
                
                // Animate door
                if (doorOpen) {
                    // Open door animation
                    house.doors.forEach(door => {
                        gsap.to(door.rotation, { 
                            y: Math.PI / 2, 
                            duration: 1, 
                            ease: "power2.inOut" 
                        });
                    });
                } else {
                    // Close door animation
                    house.doors.forEach(door => {
                        gsap.to(door.rotation, { 
                            y: 0, 
                            duration: 1, 
                            ease: "power2.inOut" 
                        });
                    });
                }
            }
        }
    });
    
    // Add instruction for door interaction
    const doorInstruction = document.createElement('div');
    doorInstruction.style.position = 'absolute';
    doorInstruction.style.bottom = '10px';
    doorInstruction.style.width = '100%';
    doorInstruction.style.textAlign = 'center';
    doorInstruction.style.color = 'white';
    doorInstruction.style.fontFamily = 'Arial';
    doorInstruction.style.fontSize = '14px';
    doorInstruction.innerHTML = 'Press "E" near doors to open/close them';
    document.body.appendChild(doorInstruction);
}

// Setup door interaction
setupDoorInteraction();

// ========== UPDATE COLLISION DETECTION FOR HOUSE ==========
// Update collision detection to include house structures
const originalCheckCollision = checkCollision;
checkCollision = function(position, radius) {
    // First check original collisions (terrain, pavilions, decorations)
    if (originalCheckCollision(position, radius)) {
        return true;
    }
    
    // Then check house collisions
    
    // Check house walls
    for (const wall of house.structure) {
        // Skip ceiling elements
        if (wall.position.y > position.y + 2) {
            continue;
        }
        
        // Simple box collision check
        if (wall.geometry instanceof THREE.BoxGeometry) {
            const wallBounds = new THREE.Box3().setFromObject(wall);
            
            // Create player bounding cylinder
            const playerPosition = new THREE.Vector3(position.x, position.y, position.z);
            
            // Check if player is within radius distance of any wall face
            if (boxCylinderCollision(wallBounds, playerPosition, radius, 1.7)) {
                return true;
            }
        }
    }
    
    // Check furniture collisions
    for (const furniture of house.furniture) {
        // Skip small or decorative items
        if (furniture.geometry instanceof THREE.PlaneGeometry) {
            continue;
        }
        
        const furnitureBounds = new THREE.Box3().setFromObject(furniture);
        const playerPosition = new THREE.Vector3(position.x, position.y, position.z);
        
        if (boxCylinderCollision(furnitureBounds, playerPosition, radius, 1.7)) {
            return true;
        }
    }
    
    // Door collision if door is closed
    if (house.doors.length > 0 && Math.abs(house.doors[0].rotation.y) < 0.1) {
        const doorBounds = new THREE.Box3().setFromObject(house.doors[0]);
        const playerPosition = new THREE.Vector3(position.x, position.y, position.z);
        
        if (boxCylinderCollision(doorBounds, playerPosition, radius, 1.7)) {
            return true;
        }
    }
    
    return false;
};

// Helper function to check collision between box and cylinder (player)
function boxCylinderCollision(box, cylinderCenter, cylinderRadius, cylinderHeight) {
    // First check horizontal distance (XZ plane)
    const boxCenter = new THREE.Vector3();
    box.getCenter(boxCenter);
    
    // Get box extents
    const boxExtents = new THREE.Vector3();
    box.getSize(boxExtents).multiplyScalar(0.5);
    
    // Check if player's bounding cylinder intersects with the box
    const dx = Math.abs(cylinderCenter.x - boxCenter.x);
    const dz = Math.abs(cylinderCenter.z - boxCenter.z);
    const dy = Math.abs(cylinderCenter.y - boxCenter.y);
    
    // Closest point on box to cylinder center in XZ plane
    const closestX = Math.max(boxCenter.x - boxExtents.x, Math.min(cylinderCenter.x, boxCenter.x + boxExtents.x));
    const closestZ = Math.max(boxCenter.z - boxExtents.z, Math.min(cylinderCenter.z, boxCenter.z + boxExtents.z));
    
    // Distance from closest point to cylinder center
    const distanceXZ = Math.sqrt(
        Math.pow(cylinderCenter.x - closestX, 2) +
        Math.pow(cylinderCenter.z - closestZ, 2)
    );
    
    // Check horizontal collision
// Check horizontal collision
if (distanceXZ < cylinderRadius) {
    // Check vertical collision
    if (cylinderCenter.y - cylinderHeight/2 < boxCenter.y + boxExtents.y &&
        cylinderCenter.y + cylinderHeight/2 > boxCenter.y - boxExtents.y) {
        return true;
    }
}

return false;
}

// ========== IMPLEMENT LEVEL OF DETAIL (LOD) ==========
// Create LOD system for models to improve performance
function createLODObject(highPolyGeometry, mediumPolyGeometry, lowPolyGeometry, material, position) {
    const lod = new THREE.LOD();
    
    // High detail level (close distance)
    const highDetailMesh = new THREE.Mesh(highPolyGeometry, material);
    lod.addLevel(highDetailMesh, 0);
    
    // Medium detail level (medium distance)
    const medDetailMesh = new THREE.Mesh(mediumPolyGeometry, material);
    lod.addLevel(medDetailMesh, 10);
    
    // Low detail level (far distance)
    const lowDetailMesh = new THREE.Mesh(lowPolyGeometry, material);
    lod.addLevel(lowDetailMesh, 30);
    
    lod.position.copy(position);
    scene.add(lod);
    
    return lod;
}

// ========== CREATE INDOOR MUSEUM BUILDING ==========
// Create a main museum building with indoor elements
function createMuseumBuilding() {
    // Building dimensions
    const buildingWidth = 35;
    const buildingLength = 45;
    const buildingHeight = 12;
    const wallThickness = 0.5;
    
    // Building materials
    const exteriorMaterial = new THREE.MeshStandardMaterial({
        color: 0xE6E6E6,
        roughness: 0.7,
        metalness: 0.1
    });
    
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x896A45,
        roughness: 0.8,
        metalness: 0.1
    });
    
    const accentMaterial = new THREE.MeshStandardMaterial({
        color: 0x614B35,
        roughness: 0.6,
        metalness: 0.2
    });
    
    // Create building position at center area
    const buildingX = 0;
    const buildingZ = -20;
    const groundLevel = getHeightAtPosition(buildingX, buildingZ);
    
    // Create floors (ground and second)
    
    // Ground floor
    const groundFloor = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth, 0.5, buildingLength),
        floorMaterial
    );
    groundFloor.position.set(buildingX, groundLevel + 0.25, buildingZ);
    groundFloor.receiveShadow = true;
    scene.add(groundFloor);
    
    // Second floor
    const secondFloor = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth - 2 * wallThickness, 0.5, buildingLength - 2 * wallThickness),
        floorMaterial
    );
    secondFloor.position.set(buildingX, groundLevel + buildingHeight/2, buildingZ);
    secondFloor.receiveShadow = true;
    scene.add(secondFloor);
    
    // Create an opening in the second floor for a grand staircase
    const openingWidth = 10;
    const openingLength = 15;
    const opening = new THREE.Mesh(
        new THREE.BoxGeometry(openingWidth, 1, openingLength),
        new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0 })
    );
    opening.position.set(buildingX, groundLevel + buildingHeight/2, buildingZ + 5);
    scene.add(opening);
    
    // Use CSG to cut the opening in the second floor
    const secondFloorCSG = CSG.fromMesh(secondFloor);
    const openingCSG = CSG.fromMesh(opening);
    const finalFloorCSG = secondFloorCSG.subtract(openingCSG);
    
    // Replace the original second floor with the cut version
    scene.remove(secondFloor);
    const finalSecondFloor = CSG.toMesh(finalFloorCSG, secondFloor.matrix, floorMaterial);
    finalSecondFloor.receiveShadow = true;
    scene.add(finalSecondFloor);
    
    // Create exterior walls
    const walls = [
        // Front wall with entrance gap
        createWall(
            buildingX - buildingWidth/2 + 7.5, groundLevel + buildingHeight/2, buildingZ + buildingLength/2,
            15, buildingHeight, wallThickness,
            exteriorMaterial
        ),
        createWall(
            buildingX + buildingWidth/2 - 7.5, groundLevel + buildingHeight/2, buildingZ + buildingLength/2,
            15, buildingHeight, wallThickness,
            exteriorMaterial
        ),
        // Back wall
        createWall(
            buildingX, groundLevel + buildingHeight/2, buildingZ - buildingLength/2,
            buildingWidth, buildingHeight, wallThickness,
            exteriorMaterial
        ),
        // Left wall
        createWall(
            buildingX - buildingWidth/2, groundLevel + buildingHeight/2, buildingZ,
            wallThickness, buildingHeight, buildingLength,
            exteriorMaterial
        ),
        // Right wall
        createWall(
            buildingX + buildingWidth/2, groundLevel + buildingHeight/2, buildingZ,
            wallThickness, buildingHeight, buildingLength,
            exteriorMaterial
        )
    ];
    
    // Add entrance header
    const entranceHeader = new THREE.Mesh(
        new THREE.BoxGeometry(15, 4, wallThickness),
        exteriorMaterial
    );
    entranceHeader.position.set(buildingX, groundLevel + buildingHeight - 2, buildingZ + buildingLength/2);
    entranceHeader.castShadow = true;
    entranceHeader.receiveShadow = true;
    scene.add(entranceHeader);
    
    // Create grand staircase
    createGrandStaircase(
        buildingX, 
        groundLevel + 0.5, 
        buildingZ, 
        accentMaterial
    );
    
    // Create second floor interior walls to divide exhibit spaces
    const interiorWalls = [
        // Gallery divider wall 1
        createWall(
            buildingX - 8, groundLevel + buildingHeight * 0.75, buildingZ - 10,
            wallThickness, buildingHeight/2, 20,
            exteriorMaterial
        ),
        // Gallery divider wall 2
        createWall(
            buildingX + 8, groundLevel + buildingHeight * 0.75, buildingZ - 10,
            wallThickness, buildingHeight/2, 20,
            exteriorMaterial
        )
    ];
    
    // Add columns for architectural detail
    const columnPositions = [
        // Front columns
        { x: buildingX - buildingWidth/2 + 4, z: buildingZ + buildingLength/2 - 2 },
        { x: buildingX + buildingWidth/2 - 4, z: buildingZ + buildingLength/2 - 2 },
        // Interior columns
        { x: buildingX - buildingWidth/3, z: buildingZ },
        { x: buildingX + buildingWidth/3, z: buildingZ },
        { x: buildingX - buildingWidth/3, z: buildingZ - buildingLength/3 },
        { x: buildingX + buildingWidth/3, z: buildingZ - buildingLength/3 }
    ];
    
    columnPositions.forEach(pos => {
        createColumn(pos.x, groundLevel, pos.z, buildingHeight, 0.8, accentMaterial);
    });
    
    // Create roof
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth + 2, 1, buildingLength + 2),
        accentMaterial
    );
    roof.position.set(buildingX, groundLevel + buildingHeight, buildingZ);
    roof.receiveShadow = true;
    roof.castShadow = true;
    scene.add(roof);
    
    // Add roof details
    const roofDetail = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth - 5, 2, buildingLength - 5),
        accentMaterial
    );
    roofDetail.position.set(buildingX, groundLevel + buildingHeight + 1.5, buildingZ);
    roofDetail.receiveShadow = true;
    roofDetail.castShadow = true;
    scene.add(roofDetail);
    
    // Create indoor exhibit spaces
    createIndoorExhibits(buildingX, groundLevel, buildingZ, buildingWidth, buildingLength, buildingHeight);
    
    // Add windows
    createWindows(buildingX, groundLevel, buildingZ, buildingWidth, buildingLength, buildingHeight);
    
    // Return building info for navigation and collision
    return {
        position: { x: buildingX, y: groundLevel, z: buildingZ },
        dimensions: { width: buildingWidth, height: buildingHeight, length: buildingLength },
        entrancePosition: { x: buildingX, y: groundLevel, z: buildingZ + buildingLength/2 }
    };
}

// Helper function to create a wall
function createWall(x, y, z, width, height, depth, material) {
    const wall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        material
    );
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    
    // Add to museum objects for collision detection
    museumObjects.decorations.push(wall);
    
    return wall;
}

// Helper function to create a column
function createColumn(x, y, z, height, radius, material) {
    // Create column base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 2.5, height * 0.05, radius * 2.5),
        material
    );
    base.position.set(x, y + height * 0.025, z);
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);
    
    // Create column shaft
    const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.8, radius, height * 0.9, 16),
        material
    );
    shaft.position.set(x, y + height * 0.475, z);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    scene.add(shaft);
    
    // Create column capital
    const capital = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 2.2, height * 0.05, radius * 2.2),
        material
    );
    capital.position.set(x, y + height * 0.95, z);
    capital.castShadow = true;
    capital.receiveShadow = true;
    scene.add(capital);
    
    // Add to museum objects for collision detection
    museumObjects.decorations.push(base);
    museumObjects.decorations.push(shaft);
    museumObjects.decorations.push(capital);
    
    return { base, shaft, capital };
}

// Helper function to create a grand staircase
function createGrandStaircase(centerX, baseY, centerZ, material) {
    // Staircase parameters
    const width = 8; 
    const stepDepth = 0.8;
    const stepHeight = 0.25;
    const stepCount = 24; // Enough steps to reach second floor
    const landingStep = 12; // Landing halfway up
    
    let currentY = baseY;
    let currentZ = centerZ + 10; // Start stairs at the front area
    
    // First flight (bottom to landing)
    for (let i = 0; i < landingStep; i++) {
        const step = new THREE.Mesh(
            new THREE.BoxGeometry(width, stepHeight, stepDepth),
            material
        );
        step.position.set(centerX, currentY + stepHeight/2, currentZ);
        step.castShadow = true;
        step.receiveShadow = true;
        scene.add(step);
        
        // Add to museum objects for collision detection
        museumObjects.decorations.push(step);
        
        // Move to next step position
        currentY += stepHeight;
        currentZ -= stepDepth;
    }
    
    // Landing platform
    const landing = new THREE.Mesh(
        new THREE.BoxGeometry(width, stepHeight, width),
        material
    );
    landing.position.set(centerX, currentY + stepHeight/2, currentZ - width/2);
    landing.castShadow = true;
    landing.receiveShadow = true;
    scene.add(landing);
    museumObjects.decorations.push(landing);
    
    currentZ -= width;
    
    // Second flight (landing to second floor)
    // Change direction for second flight (180 degree turn)
    for (let i = 0; i < stepCount - landingStep; i++) {
        const step = new THREE.Mesh(
            new THREE.BoxGeometry(width, stepHeight, stepDepth),
            material
        );
        step.position.set(centerX, currentY + stepHeight/2, currentZ);
        step.castShadow = true;
        step.receiveShadow = true;
        scene.add(step);
        
        // Add to museum objects for collision detection
        museumObjects.decorations.push(step);
        
        // Move to next step position
        currentY += stepHeight;
        currentZ += stepDepth;
    }
    
    // Add decorative railings
    createStaircaseRailings(centerX, baseY, centerZ, width, stepDepth, stepHeight, stepCount, landingStep, material);
}

// Helper function to create staircase railings
function createStaircaseRailings(centerX, baseY, centerZ, width, stepDepth, stepHeight, stepCount, landingStep, material) {
    const railingThickness = 0.1;
    const railingHeight = 1.0;
    const postSpacing = 2;
    
    // Left railing posts first flight
    let currentY = baseY;
    let currentZ = centerZ + 10;
    
    for (let i = 0; i <= landingStep; i += postSpacing) {
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(railingThickness, railingHeight, railingThickness),
            material
        );
        post.position.set(
            centerX - width/2, 
            currentY + railingHeight/2, 
            currentZ
        );
        post.castShadow = true;
        scene.add(post);
        museumObjects.decorations.push(post);
        
        if (i < landingStep) {
            currentY += stepHeight * postSpacing;
            currentZ -= stepDepth * postSpacing;
        }
    }
    
    // Right railing posts first flight
    currentY = baseY;
    currentZ = centerZ + 10;
    
    for (let i = 0; i <= landingStep; i += postSpacing) {
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(railingThickness, railingHeight, railingThickness),
            material
        );
        post.position.set(
            centerX + width/2, 
            currentY + railingHeight/2, 
            currentZ
        );
        post.castShadow = true;
        scene.add(post);
        museumObjects.decorations.push(post);
        
        if (i < landingStep) {
            currentY += stepHeight * postSpacing;
            currentZ -= stepDepth * postSpacing;
        }
    }
    
    // Second flight railings
    currentY = baseY + stepHeight * landingStep;
    currentZ = centerZ + 10 - stepDepth * landingStep - width;
    
    // Left railing posts second flight
    for (let i = 0; i <= stepCount - landingStep; i += postSpacing) {
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(railingThickness, railingHeight, railingThickness),
            material
        );
        post.position.set(
            centerX - width/2, 
            currentY + railingHeight/2, 
            currentZ
        );
        post.castShadow = true;
        scene.add(post);
        museumObjects.decorations.push(post);
        
        if (i < stepCount - landingStep) {
            currentY += stepHeight * postSpacing;
            currentZ += stepDepth * postSpacing;
        }
    }
    
    // Right railing posts second flight
    currentY = baseY + stepHeight * landingStep;
    currentZ = centerZ + 10 - stepDepth * landingStep - width;
    
    for (let i = 0; i <= stepCount - landingStep; i += postSpacing) {
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(railingThickness, railingHeight, railingThickness),
            material
        );
        post.position.set(
            centerX + width/2, 
            currentY + railingHeight/2, 
            currentZ
        );
        post.castShadow = true;
        scene.add(post);
        museumObjects.decorations.push(post);
        
        if (i < stepCount - landingStep) {
            currentY += stepHeight * postSpacing;
            currentZ += stepDepth * postSpacing;
        }
    }
    
    // Add horizontal railings
    // First flight - left side
    const leftRailingFirst = new THREE.Mesh(
        new THREE.BoxGeometry(railingThickness, railingThickness, stepDepth * landingStep),
        material
    );
    leftRailingFirst.position.set(
        centerX - width/2,
        baseY + railingHeight,
        centerZ + 10 - stepDepth * landingStep/2
    );
    scene.add(leftRailingFirst);
    
    // First flight - right side
    const rightRailingFirst = new THREE.Mesh(
        new THREE.BoxGeometry(railingThickness, railingThickness, stepDepth * landingStep),
        material
    );
    rightRailingFirst.position.set(
        centerX + width/2,
        baseY + railingHeight,
        centerZ + 10 - stepDepth * landingStep/2
    );
    scene.add(rightRailingFirst);
    
    // Second flight - left side
    const leftRailingSecond = new THREE.Mesh(
        new THREE.BoxGeometry(railingThickness, railingThickness, stepDepth * (stepCount - landingStep)),
        material
    );
    leftRailingSecond.position.set(
        centerX - width/2,
        baseY + railingHeight + stepHeight * landingStep,
        centerZ + 10 - stepDepth * landingStep - width + stepDepth * (stepCount - landingStep)/2
    );
    scene.add(leftRailingSecond);
    
    // Second flight - right side
    const rightRailingSecond = new THREE.Mesh(
        new THREE.BoxGeometry(railingThickness, railingThickness, stepDepth * (stepCount - landingStep)),
        material
    );
    rightRailingSecond.position.set(
        centerX + width/2,
        baseY + railingHeight + stepHeight * landingStep,
        centerZ + 10 - stepDepth * landingStep - width + stepDepth * (stepCount - landingStep)/2
    );
    scene.add(rightRailingSecond);
}

// Helper function to create windows
function createWindows(centerX, baseY, centerZ, buildingWidth, buildingLength, buildingHeight) {
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x88CCFF,
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        metalness: 0.8
    });
    
    const windowFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.7,
        metalness: 0.3
    });
    
    const windowWidth = 3;
    const windowHeight = 4;
    const windowDepth = 0.1;
    const frameWidth = 0.2;
    
    // Define window positions on each wall
    // Left wall windows
    const leftWallX = centerX - buildingWidth/2;
    const windowPositionsLeft = [
        { z: centerZ + buildingLength/4, y: baseY + buildingHeight/4 },
        { z: centerZ, y: baseY + buildingHeight/4 },
        { z: centerZ - buildingLength/4, y: baseY + buildingHeight/4 },
        { z: centerZ + buildingLength/4, y: baseY + buildingHeight * 3/4 },
        { z: centerZ, y: baseY + buildingHeight * 3/4 },
        { z: centerZ - buildingLength/4, y: baseY + buildingHeight * 3/4 }
    ];
    
    // Right wall windows
    const rightWallX = centerX + buildingWidth/2;
    const windowPositionsRight = [
        { z: centerZ + buildingLength/4, y: baseY + buildingHeight/4 },
        { z: centerZ, y: baseY + buildingHeight/4 },
        { z: centerZ - buildingLength/4, y: baseY + buildingHeight/4 },
        { z: centerZ + buildingLength/4, y: baseY + buildingHeight * 3/4 },
        { z: centerZ, y: baseY + buildingHeight * 3/4 },
        { z: centerZ - buildingLength/4, y: baseY + buildingHeight * 3/4 }
    ];
    
    // Create windows on left and right walls
    [...windowPositionsLeft, ...windowPositionsRight].forEach(pos => {
        const windowWidth = 1.5;
        const windowHeight = 2;
        const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
        const windowMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xadd8e6,
            transparent: true,
            opacity: 0.7,
            roughness: 0.05,
            metalness: 0.9,
            reflectivity: 1.0,
            clearcoat: 1.0
        });
        
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            pos.x ?? (pos.z < centerZ ? rightWallX : leftWallX),
            pos.y,
            pos.z
        );
        window.rotation.y = pos.x ? 0 : Math.PI/2;
        scene.add(window);
    });
    
    // Create floors inside the building
    const floorCount = 2; // Ground floor + second floor
    const floorHeight = buildingHeight / floorCount;
    const floorThickness = 0.2;
    
    for (let i = 0; i < floorCount; i++) {
        // Skip ground floor (i=0) as it's already created as foundation
        if (i > 0) {
            const floorY = baseY + i * floorHeight;
            
            // Create main floor
            const floorGeometry = new THREE.BoxGeometry(buildingWidth - 1, floorThickness, buildingLength - 1);
            const floorMaterial = new THREE.MeshStandardMaterial({
                color: 0x8B4513, // Wooden floor color
                roughness: 0.8,
                metalness: 0.2
            });
            
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.position.set(centerX, floorY, centerZ);
            floor.receiveShadow = true;
            scene.add(floor);
        }
    }
    
    // Add interior dividing walls
    const interiorWallHeight = floorHeight - 0.5;
    const interiorWallThickness = 0.15;
    
    // First floor dividers
    const firstFloorY = baseY + floorHeight/2;
    
    // Central corridor
    const corridorWidth = 2.5;
    const corridorWallLength = buildingLength - 2;
    
    // Corridor walls
    const corridorWallGeometry = new THREE.BoxGeometry(interiorWallThickness, interiorWallHeight, corridorWallLength);
    const interiorWallMaterial = new THREE.MeshStandardMaterial({
        color: 0xE8E8E8, // Light colored interior walls
        roughness: 0.9,
        metalness: 0.1
    });
    
    const corridorLeftWall = new THREE.Mesh(corridorWallGeometry, interiorWallMaterial);
    corridorLeftWall.position.set(centerX - corridorWidth/2, firstFloorY + interiorWallHeight/2, centerZ);
    scene.add(corridorLeftWall);
    
    const corridorRightWall = new THREE.Mesh(corridorWallGeometry, interiorWallMaterial);
    corridorRightWall.position.set(centerX + corridorWidth/2, firstFloorY + interiorWallHeight/2, centerZ);
    scene.add(corridorRightWall);
    
    // Create room dividers
    const roomDividerLength = (buildingWidth - corridorWidth - 2) / 2;
    const roomDividerGeometry = new THREE.BoxGeometry(roomDividerLength, interiorWallHeight, interiorWallThickness);
    
    // Left rooms dividers
    const leftRoomDivider1 = new THREE.Mesh(roomDividerGeometry, interiorWallMaterial);
    leftRoomDivider1.position.set(centerX - corridorWidth/2 - roomDividerLength/2, firstFloorY + interiorWallHeight/2, centerZ + buildingLength/4);
    scene.add(leftRoomDivider1);
    
    const leftRoomDivider2 = new THREE.Mesh(roomDividerGeometry, interiorWallMaterial);
    leftRoomDivider2.position.set(centerX - corridorWidth/2 - roomDividerLength/2, firstFloorY + interiorWallHeight/2, centerZ - buildingLength/4);
    scene.add(leftRoomDivider2);
    
    // Right rooms dividers
    const rightRoomDivider1 = new THREE.Mesh(roomDividerGeometry, interiorWallMaterial);
    rightRoomDivider1.position.set(centerX + corridorWidth/2 + roomDividerLength/2, firstFloorY + interiorWallHeight/2, centerZ + buildingLength/4);
    scene.add(rightRoomDivider1);
    
    const rightRoomDivider2 = new THREE.Mesh(roomDividerGeometry, interiorWallMaterial);
    rightRoomDivider2.position.set(centerX + corridorWidth/2 + roomDividerLength/2, firstFloorY + interiorWallHeight/2, centerZ - buildingLength/4);
    scene.add(rightRoomDivider2);
    
    // Create doorways in the corridor walls
    const doorwayWidth = 1.2;
    const doorwayHeight = 2.2;
    
    // Function to create doorways
    function createDoorway(wallX, wallZ, isLeftSide) {
        const doorwayGeometry = new THREE.BoxGeometry(interiorWallThickness + 0.1, doorwayHeight, doorwayWidth);
        const doorwayMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            opacity: 0,
            transparent: true
        });
        
        const doorway = new THREE.Mesh(doorwayGeometry, doorwayMaterial);
        doorway.position.set(
            wallX,
            firstFloorY + doorwayHeight/2, 
            wallZ + (isLeftSide ? -buildingLength/6 : buildingLength/6)
        );
        
        // Add door frame
        const frameWidth = 0.1;
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x5C4033, // Brown wood
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Top frame
        const topFrameGeometry = new THREE.BoxGeometry(interiorWallThickness + frameWidth, frameWidth, doorwayWidth + frameWidth);
        const topFrame = new THREE.Mesh(topFrameGeometry, frameMaterial);
        topFrame.position.set(wallX, firstFloorY + doorwayHeight, wallZ + (isLeftSide ? -buildingLength/6 : buildingLength/6));
        scene.add(topFrame);
        
        // Side frames
        const sideFrameGeometry = new THREE.BoxGeometry(interiorWallThickness + frameWidth, doorwayHeight, frameWidth);
        
        const leftFrame = new THREE.Mesh(sideFrameGeometry, frameMaterial);
        leftFrame.position.set(
            wallX,
            firstFloorY + doorwayHeight/2,
            wallZ + (isLeftSide ? -buildingLength/6 : buildingLength/6) - doorwayWidth/2
        );
        scene.add(leftFrame);
        
        const rightFrame = new THREE.Mesh(sideFrameGeometry, frameMaterial);
        rightFrame.position.set(
            wallX,
            firstFloorY + doorwayHeight/2,
            wallZ + (isLeftSide ? -buildingLength/6 : buildingLength/6) + doorwayWidth/2
        );
        scene.add(rightFrame);
        
        scene.add(doorway);
        return doorway;
    }
    
    // Create doorways
    createDoorway(centerX - corridorWidth/2, centerZ, true);
    createDoorway(centerX - corridorWidth/2, centerZ, false);
    createDoorway(centerX + corridorWidth/2, centerZ, true);
    createDoorway(centerX + corridorWidth/2, centerZ, false);
    
    // Create grand staircase in the middle of the corridor
    function createStaircase() {
        const stairCount = 15;
        const stairWidth = corridorWidth * 0.8;
        const stairDepth = 0.3;
        const stairHeight = 0.2;
        const totalStairLength = stairCount * stairDepth;
        
        const stairGroup = new THREE.Group();
        
        // Create individual stairs
        for (let i = 0; i < stairCount; i++) {
            const stairGeometry = new THREE.BoxGeometry(stairWidth, stairHeight, stairDepth);
            const stairMaterial = new THREE.MeshStandardMaterial({
                color: 0x8B4513, // Wood color
                roughness: 0.8,
                metalness: 0.2
            });
            
            const stair = new THREE.Mesh(stairGeometry, stairMaterial);
            stair.position.set(
                centerX,
                baseY + i * stairHeight + stairHeight/2,
                centerZ - buildingLength/4 + totalStairLength/2 - i * stairDepth - stairDepth/2
            );
            
            stair.castShadow = true;
            stair.receiveShadow = true;
            stairGroup.add(stair);
            
            // Add stair railing
            if (i % 3 === 0) {
                const railingHeight = 0.8;
                const railingThickness = 0.05;
                
                const leftRailing = new THREE.Mesh(
                    new THREE.CylinderGeometry(railingThickness, railingThickness, railingHeight, 8),
                    new THREE.MeshStandardMaterial({ color: 0x5C4033 })
                );
                
                leftRailing.position.set(
                    centerX - stairWidth/2 + railingThickness,
                    baseY + i * stairHeight + railingHeight/2,
                    centerZ - buildingLength/4 + totalStairLength/2 - i * stairDepth - stairDepth/2
                );
                stairGroup.add(leftRailing);
                
                const rightRailing = new THREE.Mesh(
                    new THREE.CylinderGeometry(railingThickness, railingThickness, railingHeight, 8),
                    new THREE.MeshStandardMaterial({ color: 0x5C4033 })
                );
                
                rightRailing.position.set(
                    centerX + stairWidth/2 - railingThickness,
                    baseY + i * stairHeight + railingHeight/2,
                    centerZ - buildingLength/4 + totalStairLength/2 - i * stairDepth - stairDepth/2
                );
                stairGroup.add(rightRailing);
            }
        }
        
        // Add handrails on both sides
        const handrailHeight = 0.8;
        const handrailLength = totalStairLength;
        const handrailThickness = 0.05;
        
        const handrailGeometry = new THREE.BoxGeometry(handrailThickness, handrailThickness, handrailLength);
        const handrailMaterial = new THREE.MeshStandardMaterial({ color: 0x5C4033 });
        
        // Left handrail (angled)
        const leftHandrail = new THREE.Mesh(handrailGeometry, handrailMaterial);
        leftHandrail.position.set(
            centerX - stairWidth/2 + handrailThickness,
            baseY + stairCount * stairHeight * 0.5 + handrailHeight,
            centerZ - buildingLength/4 + handrailLength/2
        );
        
        // Rotate to match stair angle
        const stairAngle = Math.atan((stairCount * stairHeight) / handrailLength);
        leftHandrail.rotation.x = -stairAngle;
        stairGroup.add(leftHandrail);
        
        // Right handrail (angled)
        const rightHandrail = new THREE.Mesh(handrailGeometry, handrailMaterial);
        rightHandrail.position.set(
            centerX + stairWidth/2 - handrailThickness,
            baseY + stairCount * stairHeight * 0.5 + handrailHeight,
            centerZ - buildingLength/4 + handrailLength/2
        );
        rightHandrail.rotation.x = -stairAngle;
        stairGroup.add(rightHandrail);
        
        scene.add(stairGroup);
        
        return {
            position: {
                x: centerX,
                y: baseY,
                z: centerZ - buildingLength/4
            },
            dimensions: {
                width: stairWidth,
                height: stairCount * stairHeight,
                length: totalStairLength
            }
        };
    }
    
    // Create main staircase
    const mainStaircase = createStaircase();
    
    // Add furniture to rooms
    function addFurniture() {
        // Museum exhibit stands
        const exhibitStandGeometry = new THREE.CylinderGeometry(0.5, 0.6, 1.0, 8);
        const exhibitStandMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // Left rooms exhibits
        const leftRoomPositions = [
            { x: centerX - corridorWidth - roomDividerLength/2, z: centerZ + buildingLength/3 },
            { x: centerX - corridorWidth - roomDividerLength/2, z: centerZ },
            { x: centerX - corridorWidth - roomDividerLength/2, z: centerZ - buildingLength/3 }
        ];
        
        leftRoomPositions.forEach(pos => {
            const stand = new THREE.Mesh(exhibitStandGeometry, exhibitStandMaterial);
            stand.position.set(pos.x, firstFloorY + 0.5, pos.z);
            stand.castShadow = true;
            stand.receiveShadow = true;
            scene.add(stand);
            museumObjects.decorations.push(stand);
            
            // Add glass display case
            const glassGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 8);
            const glassMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3,
                roughness: 0,
                metalness: 0.9,
                clearcoat: 1.0,
                reflectivity: 1.0
            });
            
            const glass = new THREE.Mesh(glassGeometry, glassMaterial);
            glass.position.set(pos.x, firstFloorY + 1.0, pos.z);
            scene.add(glass);
            
            // Add exhibit inside glass
            const exhibitGeometry = new THREE.SphereGeometry(0.2, 16, 16);
            const exhibitMaterial = new THREE.MeshStandardMaterial({
                color: Math.random() < 0.5 ? animeColors.sunset : animeColors.ocean,
                roughness: 0.3,
                metalness: 0.8
            });
            
            const exhibit = new THREE.Mesh(exhibitGeometry, exhibitMaterial);
            exhibit.position.set(pos.x, firstFloorY + 1.0, pos.z);
            scene.add(exhibit);
            museumObjects.exhibits.push(exhibit);
        });
        
        // Right rooms exhibits
        const rightRoomPositions = [
            { x: centerX + corridorWidth + roomDividerLength/2, z: centerZ + buildingLength/3 },
            { x: centerX + corridorWidth + roomDividerLength/2, z: centerZ },
            { x: centerX + corridorWidth + roomDividerLength/2, z: centerZ - buildingLength/3 }
        ];
        
        rightRoomPositions.forEach(pos => {
            const stand = new THREE.Mesh(exhibitStandGeometry, exhibitStandMaterial);
            stand.position.set(pos.x, firstFloorY + 0.5, pos.z);
            stand.castShadow = true;
            stand.receiveShadow = true;
            scene.add(stand);
            museumObjects.decorations.push(stand);
            
            // Add artwork on wall display
            const artWidth = 1.5;
            const artHeight = 1.0;
            const wallArtGeometry = new THREE.BoxGeometry(0.1, artHeight, artWidth);
            const wallArtMaterial = new THREE.MeshStandardMaterial({
                color: Math.random() < 0.5 ? animeColors.sakura : animeColors.twilight,
                roughness: 0.6,
                metalness: 0.2
            });
            
            const wallArt = new THREE.Mesh(wallArtGeometry, wallArtMaterial);
            wallArt.position.set(
                centerX + buildingWidth/2 - 0.1,
                firstFloorY + artHeight/2 + 0.5,
                pos.z
            );
            wallArt.rotation.y = Math.PI/2;
            scene.add(wallArt);
            museumObjects.exhibits.push(wallArt);
            
            // Add frame
            const frameGeometry = new THREE.BoxGeometry(0.12, artHeight + 0.1, artWidth + 0.1);
            const frameMaterial = new THREE.MeshStandardMaterial({
                color: 0x5C4033,
                roughness: 0.8,
                metalness: 0.2
            });
            
            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            frame.position.copy(wallArt.position);
            frame.position.x -= 0.02;
            frame.rotation.y = Math.PI/2;
            scene.add(frame);
        });
        
        // Add seating in the corridor
        const benchGeometry = new THREE.BoxGeometry(corridorWidth * 0.6, 0.4, 1.2);
        const benchMaterial = new THREE.MeshStandardMaterial({
            color: 0x5C4033,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const bench1 = new THREE.Mesh(benchGeometry, benchMaterial);
        bench1.position.set(centerX, firstFloorY + 0.2, centerZ + buildingLength/3);
        bench1.castShadow = true;
        bench1.receiveShadow = true;
        scene.add(bench1);
        museumObjects.decorations.push(bench1);
        
        const bench2 = new THREE.Mesh(benchGeometry, benchMaterial);
        bench2.position.set(centerX, firstFloorY + 0.2, centerZ - buildingLength/6);
        bench2.castShadow = true;
        bench2.receiveShadow = true;
        scene.add(bench2);
        museumObjects.decorations.push(bench2);
    }
    
    // Add furniture and exhibits
    addFurniture();
    
    // Add lighting inside the building
    function addIndoorLighting() {
        // Ambient indoor light to ensure visibility
        const indoorAmbient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(indoorAmbient);
        
        // First floor corridor lights
        const corridorLightCount = 3;
        
        for (let i = 0; i < corridorLightCount; i++) {
            const light = new THREE.PointLight(0xfffce6, 0.8, 10, 2);
            const zPos = centerZ + buildingLength * (0.4 - i * 0.4);
            
            light.position.set(centerX, firstFloorY + floorHeight * 0.8, zPos);
            
            // Add simple light fixture
            const fixtureGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.1, 8);
            const fixtureMaterial = new THREE.MeshStandardMaterial({
                color: 0xC0C0C0,
                roughness: 0.5,
                metalness: 0.8,
                emissive: 0xffffcc,
                emissiveIntensity: 0.2
            });
            
            const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
            fixture.position.copy(light.position);
            scene.add(fixture);
            
            scene.add(light);
        }
        
        // Room accent lights
        const roomLightPositions = [
            // Left rooms
            { x: centerX - corridorWidth - roomDividerLength/2, z: centerZ + buildingLength/3 },
            { x: centerX - corridorWidth - roomDividerLength/2, z: centerZ - buildingLength/3 },
            // Right rooms
            { x: centerX + corridorWidth + roomDividerLength/2, z: centerZ + buildingLength/3 },
            { x: centerX + corridorWidth + roomDividerLength/2, z: centerZ - buildingLength/3 }
        ];
        
        roomLightPositions.forEach(pos => {
            const light = new THREE.SpotLight(0xfffce6, 1.5, 8, Math.PI/6, 0.5, 2);
            light.position.set(pos.x, firstFloorY + floorHeight * 0.8, pos.z);
            light.castShadow = true;
            
            // Optimize shadow map for performance
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            
            // Add light fixture
            const fixtureGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
            const fixtureMaterial = new THREE.MeshStandardMaterial({
                color: 0xC0C0C0,
                roughness: 0.5,
                metalness: 0.8,
                emissive: 0xffffcc,
                emissiveIntensity: 0.2
            });
            
            const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
            fixture.position.copy(light.position);
            scene.add(fixture);
            
            scene.add(light);
        });
    }
    
    // Add indoor lighting
    addIndoorLighting();
    
    return {
        position: { x: centerX, y: baseY, z: centerZ },
        dimensions: { width: buildingWidth, height: buildingHeight, length: buildingLength },
        entrances: [
            { x: centerX, y: baseY, z: centerZ + buildingLength/2 },
            { x: centerX, y: baseY, z: centerZ - buildingLength/2 }
        ],
        staircase: mainStaircase
    };
}

// ========== OPTIMIZE LOD AND PERFORMANCE ==========
// Implement Level of Detail (LOD) for distant objects
function createTreeWithLOD(x, z, height = 5) {
    // Get height at position
    const terrainY = getHeightAtPosition(x, z);
    
    // High detail tree for close viewing
    const highDetailTree = new THREE.Group();
    
    const trunkGeom = new THREE.CylinderGeometry(0.2, 0.3, height * 0.3, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = height * 0.15;
    trunk.castShadow = true;
    highDetailTree.add(trunk);
    
    // Add 3 layers of foliage
    const foliageMat = new THREE.MeshStandardMaterial({ 
        color: animeColors.forest,
        roughness: 0.8
    });
    
    for (let i = 0; i < 3; i++) {
        const foliageSize = height * (0.6 - i * 0.1);
        const foliageGeom = new THREE.ConeGeometry(foliageSize * 0.5, foliageSize, 8);
        const foliage = new THREE.Mesh(foliageGeom, foliageMat);
        foliage.position.y = height * 0.3 + i * foliageSize * 0.7;
        foliage.castShadow = true;
        highDetailTree.add(foliage);
    }
    
    // Medium detail tree for medium distance
    const mediumDetailTree =