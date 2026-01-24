// Main entry point for the title screen logic
import { translations } from './translations.js';

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

    newGameBtn.addEventListener('click', () => {
        console.log("New Game clicked");
        // Placeholder for new game logic
        alert("Starting a new game...");
    });

    // Settings Navigation
    const mainMenu = document.querySelector('.menu-container:not(#settings-view)');
    const settingsMenu = document.getElementById('settings-view');
    const settingsBackBtn = document.getElementById('btn-settings-back');

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