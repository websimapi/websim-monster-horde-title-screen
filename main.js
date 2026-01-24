// Main entry point for the title screen logic

document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    checkGameState();
    setupEventListeners();
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

    newGameBtn.addEventListener('click', () => {
        console.log("New Game clicked");
        // Placeholder for new game logic
        alert("Starting a new game...");
        
        // Simulate creating a save so continue becomes available next time (if we had real logic)
        // localStorage.setItem('hasSave', 'true');
    });

    settingsBtn.addEventListener('click', () => {
        console.log("Settings clicked");
        // Placeholder for settings logic
        alert("Opening settings...");
    });
    
    continueBtn.addEventListener('click', () => {
        if (!continueBtn.disabled) {
            console.log("Continue clicked");
        }
    });
}