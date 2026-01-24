// Main entry point for the title screen logic
import { translations } from './translations.js';
import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    checkGameState();
    setupEventListeners();
    updateLanguage('en'); // Default language
});

let audioContext = null;
let bgmBuffer = null;
let bgmSource = null;
let isPlaying = false;

async function initAudio() {
    try {
        const response = await fetch('eerie_music.mp3');
        const arrayBuffer = await response.arrayBuffer();
        
        // We initialize the context lazily on user interaction usually, 
        // but we'll prepare the data here.
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        bgmBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
    } catch (error) {
        console.error("Failed to load audio:", error);
    }
}

function playMusic() {
    if (!audioContext || !bgmBuffer || isPlaying) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    bgmSource = audioContext.createBufferSource();
    bgmSource.buffer = bgmBuffer;
    bgmSource.loop = true;
    
    // Create a gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.5; // 50% volume
    
    bgmSource.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    bgmSource.start(0);
    isPlaying = true;
}

function checkGameState() {
    const continueBtn = document.getElementById('btn-continue');
    
    // Simulating checking for a save file.
    // In a real game, we might check localStorage.getItem('saveData')
    const hasSaveGame = false; // Hardcoded to false as per instructions
    
    if (hasSaveGame) {
        continueBtn.disabled = false;
        continueBtn.classList.remove('disabled');
    } else {
        continueBtn.disabled = true;
        continueBtn.title = "No saved game found";
    }
}

function setupEventListeners() {
    const newGameBtn = document.getElementById('btn-new-game');
    const settingsBtn = document.getElementById('btn-settings');
    const continueBtn = document.getElementById('btn-continue');
    
    // We need a user interaction to start the audio context on many browsers
    document.body.addEventListener('click', () => {
        if (!isPlaying) {
            playMusic();
        }
    }, { once: true });

    // Settings Navigation
    const mainMenu = document.querySelector('.menu-container:not(#settings-view):not(#character-creation-view)');
    const settingsMenu = document.getElementById('settings-view');
    const charMenu = document.getElementById('character-creation-view');
    
    const settingsBackBtn = document.getElementById('btn-settings-back');
    const charBackBtn = document.getElementById('btn-char-back');

    newGameBtn.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        charMenu.classList.remove('hidden');
        initThreeJS();
    });

    charBackBtn.addEventListener('click', () => {
        charMenu.classList.add('hidden');
        mainMenu.classList.remove('hidden');
        // Optional: Dispose threejs to save resources if needed, 
        // but keeping it alive for re-entry is smoother for now.
    });

    function openSettings() {
        mainMenu.classList.add('hidden');
        settingsMenu.classList.remove('hidden');
    }

    function closeSettings() {
        settingsMenu.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    }

    settingsBtn.addEventListener('click', openSettings);
    settingsBackBtn.addEventListener('click', closeSettings);

    // Settings Logic
    const languageSelect = document.getElementById('setting-language');
    const gammaSlider = document.getElementById('setting-gamma');
    const app = document.getElementById('app');

    gammaSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        // 100 is default (100% brightness). 
        // 50 is dark (50%), 150 is bright (150%)
        const brightness = val / 100;
        app.style.filter = `brightness(${brightness})`;
    });

    languageSelect.addEventListener('change', (e) => {
        updateLanguage(e.target.value);
    });
    
    continueBtn.addEventListener('click', () => {
        if (!continueBtn.disabled) {
            console.log("Continue clicked");
        }
    });
}

// --- Three.js Character Creator ---
let scene, camera, renderer, characterGroup, controls;
let animationId;

function initThreeJS() {
    const container = document.getElementById('char-canvas-container');
    
    // If already initialized, just ensure resize
    if (renderer) {
        onWindowResize();
        return;
    }

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Dark grey background
    // Add some fog for depth
    scene.fog = new THREE.Fog(0x111111, 5, 20);

    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(3, 2, 4);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 8;
    controls.enablePan = false;
    // Limit vertical angle to prevent going under the floor
    controls.maxPolarAngle = Math.PI / 2 - 0.1;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5); // Soft white light
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 5, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    
    const rimLight = new THREE.SpotLight(0x4a9c2d, 5); // Greenish rim light from monster theme
    rimLight.position.set(-5, 2, -5);
    rimLight.lookAt(0,0,0);
    scene.add(rimLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create the Cat
    createCatModel();

    // Initialize UI for customization
    initCharacterCustomization();

    // Handle Resize
    window.addEventListener('resize', onWindowResize);
    
    // Start Animation Loop
    animate();
}

function initCharacterCustomization() {
    const sizeSlider = document.getElementById('char-size-slider');
    const colorContainer = document.getElementById('color-options');
    const patternContainer = document.getElementById('pattern-options');

    // Data for customization
    const colors = [
        { id: 'black', hex: '#1a1a1a', i18n: 'colVoid', locked: false },
        { id: 'orange', hex: '#e67e22', i18n: 'colPumpkin', locked: false },
        { id: 'white', hex: '#eeeeee', i18n: 'colGhost', locked: true },
        { id: 'purple', hex: '#663399', i18n: 'colShadow', locked: true }
    ];

    const patterns = [
        { id: 'none', i18n: 'patSolid', locked: false },
        { id: 'spots', i18n: 'patSpots', locked: false },
        { id: 'stripes', i18n: 'patStripes', locked: true },
        { id: 'calico', i18n: 'patCalico', locked: true }
    ];

    // State
    const state = {
        size: 1,
        colorId: 'black',
        patternId: 'none'
    };

    // Render Color Options
    colorContainer.innerHTML = '';
    colors.forEach(col => {
        const btn = document.createElement('button');
        btn.className = `swatch-btn ${col.locked ? 'locked' : ''} ${state.colorId === col.id ? 'selected' : ''}`;
        btn.style.backgroundColor = col.hex;
        btn.title = col.i18n; // Simplified
        if (!col.locked) {
            btn.onclick = () => {
                state.colorId = col.id;
                updateCatAppearance(state, colors);
                updateUI();
            };
        }
        colorContainer.appendChild(btn);
    });

    // Render Pattern Options
    patternContainer.innerHTML = '';
    patterns.forEach(pat => {
        const btn = document.createElement('button');
        btn.className = `swatch-btn ${pat.locked ? 'locked' : ''} ${state.patternId === pat.id ? 'selected' : ''}`;
        
        // Visual representation of pattern
        if (pat.id === 'none') {
            btn.style.background = '#444'; 
            btn.textContent = '🚫';
        } else if (pat.id === 'spots') {
            btn.style.background = 'radial-gradient(circle, #000 20%, #666 20%)';
            btn.style.backgroundSize = '10px 10px';
        } else {
             // Default locked look handles it
        }

        if (!pat.locked) {
            btn.onclick = () => {
                state.patternId = pat.id;
                updateCatAppearance(state, colors);
                updateUI();
            };
        }
        patternContainer.appendChild(btn);
    });

    function updateUI() {
        // Update selection classes
        Array.from(colorContainer.children).forEach((btn, i) => {
            btn.classList.toggle('selected', colors[i].id === state.colorId);
        });
        Array.from(patternContainer.children).forEach((btn, i) => {
            btn.classList.toggle('selected', patterns[i].id === state.patternId);
        });
    }

    // Size Slider
    sizeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (characterGroup) {
            characterGroup.scale.set(val, val, val);
        }
    });
}

function updateCatAppearance(state, colors) {
    if (!characterGroup || !characterGroup.userData.mainMaterial) return;

    const colorObj = colors.find(c => c.id === state.colorId);
    const material = characterGroup.userData.mainMaterial;

    // Generate Texture
    const texture = createProceduralTexture(colorObj.hex, state.patternId);
    
    material.map = texture;
    material.color.setHex(0xffffff); // Use texture color directly
    material.needsUpdate = true;
}

function createProceduralTexture(colorHex, patternId) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fill Background
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 512, 512);

    if (patternId === 'spots') {
        // Determine spot color (darker or lighter)
        const col = new THREE.Color(colorHex);
        const hsl = {};
        col.getHSL(hsl);
        // If dark color, lighter spots. If light color, darker spots.
        const spotColor = hsl.l < 0.5 ? col.offsetHSL(0, 0, 0.2) : col.offsetHSL(0, 0, -0.2);
        
        ctx.fillStyle = `#${spotColor.getHexString()}`;

        // Draw random spots
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const r = 10 + Math.random() * 30;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

function createCatModel() {
    characterGroup = new THREE.Group();
    scene.add(characterGroup);

    // Initial Material State (Black, No Pattern)
    const initTexture = createProceduralTexture('#1a1a1a', 'none');
    
    const catMaterial = new THREE.MeshStandardMaterial({ 
        map: initTexture,
        color: 0xffffff,
        roughness: 0.6,
        metalness: 0.1
    });

    // Store for updates
    characterGroup.userData.mainMaterial = catMaterial;
    
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Glowing green
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xffaaaa, roughness: 0.4 });

    // 1. Body (Torso)
    const bodyGeo = new THREE.CapsuleGeometry(0.3, 0.7, 4, 8);
    // Rotate to be horizontal
    const body = new THREE.Mesh(bodyGeo, catMaterial);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.5; // Lift off ground
    body.castShadow = true;
    characterGroup.add(body);

    // 2. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0.5, 0.6, 0); // Front and up
    characterGroup.add(headGroup);

    // Head Mesh
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    // Slightly flatten the head
    headGeo.scale(1, 0.85, 1); 
    const head = new THREE.Mesh(headGeo, catMaterial);
    head.castShadow = true;
    headGroup.add(head);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.08, 0.15, 4);
    
    const earL = new THREE.Mesh(earGeo, catMaterial);
    earL.position.set(0.05, 0.2, 0.12);
    earL.rotation.set(-0.2, 0, 0.2); // Tilt
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, catMaterial);
    earR.position.set(0.05, 0.2, -0.12);
    earR.rotation.set(-0.2, 0, -0.2); // Tilt
    headGroup.add(earR);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 16, 16);
    
    const eyeL = new THREE.Mesh(eyeGeo, eyeMaterial);
    eyeL.position.set(0.18, 0.05, 0.08);
    // Flatten eye against face
    eyeL.scale.set(0.5, 1, 1);
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMaterial);
    eyeR.position.set(0.18, 0.05, -0.08);
    eyeR.scale.set(0.5, 1, 1);
    headGroup.add(eyeR);

    // Pupils (Slits)
    const pupilGeo = new THREE.BoxGeometry(0.01, 0.08, 0.02);
    const pupilL = new THREE.Mesh(pupilGeo, pupilMaterial);
    pupilL.position.set(0.21, 0.05, 0.08);
    headGroup.add(pupilL);

    const pupilR = new THREE.Mesh(pupilGeo, pupilMaterial);
    pupilR.position.set(0.21, 0.05, -0.08);
    headGroup.add(pupilR);

    // Snout
    const snoutGeo = new THREE.SphereGeometry(0.08, 16, 16);
    snoutGeo.scale(1, 0.6, 1.2);
    const snout = new THREE.Mesh(snoutGeo, catMaterial);
    snout.position.set(0.22, -0.05, 0);
    headGroup.add(snout);

    // Nose
    const noseGeo = new THREE.BufferGeometry();
    // Simple Triangle geometry for nose
    const noseVertices = new Float32Array([
        0, 0.03, 0,
        0, -0.03, 0.04,
        0, -0.03, -0.04
    ]);
    noseGeo.setAttribute('position', new THREE.BufferAttribute(noseVertices, 3));
    noseGeo.computeVertexNormals();
    const nose = new THREE.Mesh(noseGeo, noseMaterial);
    nose.position.set(0.29, -0.02, 0);
    nose.rotation.y = -Math.PI / 2; // Face forward
    headGroup.add(nose);

    // Whiskers
    const whiskerMat = new THREE.LineBasicMaterial({ color: 0x888888 });
    const whiskerGeo = new THREE.BufferGeometry();
    const whiskerPoints = [];
    // 3 whiskers per side
    for(let i=-1; i<=1; i++) {
        // Right side
        whiskerPoints.push(new THREE.Vector3(0.25, -0.05, 0.05));
        whiskerPoints.push(new THREE.Vector3(0.35, -0.05 + (i*0.02), 0.2));
        // Left side
        whiskerPoints.push(new THREE.Vector3(0.25, -0.05, -0.05));
        whiskerPoints.push(new THREE.Vector3(0.35, -0.05 + (i*0.02), -0.2));
    }
    whiskerGeo.setFromPoints(whiskerPoints);
    const whiskers = new THREE.LineSegments(whiskerGeo, whiskerMat);
    headGroup.add(whiskers);


    // 3. Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.5, 8);
    
    // Helper to create leg
    function createLeg(x, z) {
        const legGroup = new THREE.Group();
        legGroup.position.set(x, 0.4, z); // Shoulder pivot point
        
        const legMesh = new THREE.Mesh(legGeo, catMaterial);
        legMesh.position.y = -0.2; // Offset so pivot is at top
        legMesh.castShadow = true;
        
        legGroup.add(legMesh);
        characterGroup.add(legGroup);
        return legGroup;
    }

    const frontLeft = createLeg(0.3, 0.15);
    const frontRight = createLeg(0.3, -0.15);
    const backLeft = createLeg(-0.3, 0.15);
    const backRight = createLeg(-0.3, -0.15);

    // 4. Tail
    // Tail made of connected segments for potential animation
    const tailGroup = new THREE.Group();
    tailGroup.position.set(-0.4, 0.6, 0);
    characterGroup.add(tailGroup);

    // Just a curved tube for now using a CatmullRomCurve3
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-0.2, 0.1, 0),
        new THREE.Vector3(-0.3, 0.3, 0),
        new THREE.Vector3(-0.2, 0.5, 0) // S shape up
    ]);
    
    const tailGeo = new THREE.TubeGeometry(curve, 10, 0.04, 8, false);
    const tail = new THREE.Mesh(tailGeo, catMaterial);
    tail.castShadow = true;
    tailGroup.add(tail);

    // Store references for animation
    characterGroup.userData = {
        head: headGroup,
        tail: tailGroup,
        fl: frontLeft,
        fr: frontRight,
        bl: backLeft,
        br: backRight,
        time: 0
    };
}

function onWindowResize() {
    const container = document.getElementById('char-canvas-container');
    if (!container || !camera || !renderer) return;
    
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (controls) controls.update();
    
    // Idle Animation
    if (characterGroup && characterGroup.userData) {
        const data = characterGroup.userData;
        data.time += 0.02;

        // Breathing (Scale torso slightly? or just move head)
        // Let's just bob the head
        data.head.position.y = 0.6 + Math.sin(data.time) * 0.005;
        data.head.rotation.z = Math.sin(data.time * 0.5) * 0.05; // Look around slightly

        // Tail sway
        data.tail.rotation.z = Math.sin(data.time * 2) * 0.1;
        data.tail.rotation.y = Math.cos(data.time * 1.5) * 0.1;
    }

    renderer.render(scene, camera);
}

function updateLanguage(lang) {
    const t = translations[lang] || translations['en'];
    
    // Find all elements with data-i18n attribute
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });
}