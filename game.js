document.addEventListener('DOMContentLoaded', () => {
if (typeof Howl === 'undefined') {
    console.error('Howler.js failed to load.');
    return;
}

document.body.setAttribute('tabindex', '-1');
document.body.focus();

// Game variables
let playerHealth = 100;
const mapWidth = 100;
const mapHeight = 100;
let playerPosition = { x: 0, y: 0 }; // Player starts at (0, 0)
let isJumping = false;
let isBlocking = false;
let isSaberDrawn = false;
let droids = [];
let gameRunning = true;
let isMovingLeft = false;
let isMovingRight = false;
let footstepIndex = 0;
let droidSpawnInterval;
let droidInitialSpawnTimeout;
let totalDroidsSpawned = 0;
let totalDroidsKilled = 0;
let lastPlayerMoveTime = 0;
let lastDroidMoveTime = 0;
let lastSaberSwingTime = -Infinity;
const INITIAL_DROID_COUNT = 2;
const MAX_ACTIVE_DROIDS = 2;
const DROID_SPAWN_INTERVAL_MS = 6000;
const DROID_MOVE_INTERVAL_MS = 250;
const PLAYER_MOVE_INTERVAL_MS = 250;
const SABER_SWING_COOLDOWN_MS = 550;
const JUMP_AIR_TIME_MS = 900;
const JUMP_FORWARD_STEPS = 2;
const JUMP_DODGE_GRACE_MS = 700;
const DROID_MIN_FIRE_INTERVAL_MS = 330;
const DROID_MAX_FIRE_INTERVAL_MS = 850;
const DROID_BLASTER_RANGE_X = 5;
const DROID_BLASTER_RANGE_Y = 0;
const DROID_BLASTER_TRAVEL_FEET = 5;
const DROID_BLASTER_TRAVEL_MS_PER_FOOT = 120;
const DROID_STEP_INTERVAL_MS = 720;
const DROID_BASE_MOVE_SPEED = 1;
const DROID_FIRST_HUNTER_SPEED = 1.05;
const DROID_CHASE_DELAY_MS = 9000;
const MIN_SPAWN_DISTANCE_FROM_PLAYER = 12;
const MIN_SPAWN_DISTANCE_BETWEEN_DROIDS = 10;
const ORIGIN_NO_SPAWN_RADIUS = 12;
const INITIAL_FRONT_SPAWN_BLOCK_Y = 8;
const MIN_DROID_SPAWN_X = 10;
const FOOTSTEP_PAN_AMOUNT = 1;
const STEREO_MAX_DISTANCE = 10;
const DROID_VOICE_MIN_VOLUME = 0.28;
const DROID_VOICE_BOOST = 2;
// Disabled by default: HTMLMediaElement playback can be blocked for timer/spawn sounds.
const ENABLE_NATIVE_SPATIAL_FALLBACK = false;
const droidApproachMix = {
    minVolume: 0.08,
    blasterMinVolume: 0.15,
    distanceRange: 28,
    fadeOutRange: 24,
    droidBoost: 1.4,
    blasterBoost: 1.4
};
const deathMessage = document.createElement('div');
const coordAnnouncement = document.createElement('div'); // Coordinate display element
let jumpDistance = 0; // Track how many steps to move during a jump
let lastJumpLandTime = -Infinity;
let jumpStartTime = 0;
let jumpStartX = 0;
const menuElement = document.getElementById('menu');
const menuAnnouncement = document.getElementById('menu-announcement');
const menuModel = {
    main: ['Start Game', 'Options', 'Credits', 'Quit'],
    options: ['Audio Help', 'Back'],
    credits: ['Back']
};
const menuState = {
    active: true,
    current: 'main',
    selectedIndex: 0
};
let gameplayStarted = false;

// Add coordinate display element to the page
coordAnnouncement.id = 'coord-announcement';
coordAnnouncement.style.fontSize = '1em';
coordAnnouncement.style.color = 'blue';
coordAnnouncement.setAttribute('aria-live', 'polite'); // Announce text changes to screen readers
document.body.appendChild(coordAnnouncement);

// Audio files
const footstepsSounds = [
    new Howl({ src: ['sounds/player/step1.WAV'], preload: true }),
    new Howl({ src: ['sounds/player/step2.WAV'], preload: true })
];
const lightsaberSwingSounds = [
    new Howl({ src: ['sounds/weapons/saber/saberswing1.wav'], preload: true }),
    new Howl({ src: ['sounds/weapons/saber/saberswing2.wav'], preload: true }),
    new Howl({ src: ['sounds/weapons/saber/saberswing3.wav'], preload: true })
];
const saberHitSounds = [
    new Howl({ src: ['sounds/weapons/saber/saberhit1.wav'], preload: true }),
    new Howl({ src: ['sounds/weapons/saber/saberhit2.wav'], preload: true })
];
const droidSpawnSound = new Howl({ src: ['sounds/enemies/droid/roger.WAV'], preload: true });
const droidStepSounds = [
    new Howl({ src: ['sounds/enemies/droid/droidstep1.ogg'], preload: true }),
    new Howl({ src: ['sounds/enemies/droid/droidstep2.ogg'], preload: true })
];
const droidHitSound = new Howl({ src: ['sounds/enemies/droid/roger.WAV'], preload: true });
const droidDeath1Sound = new Howl({ src: ['sounds/deaths/droid/droiddeath.WAV'], preload: true });
const droidDeath2Sound = new Howl({ src: ['sounds/deaths/droid/death2.WAV'], preload: true });
const saberDrawSound = new Howl({ src: ['sounds/weapons/saber/drawsaber.wav'], preload: true });
const saberLoopSound = new Howl({ src: ['sounds/weapons/saber/saberloop.wav'], preload: true, loop: true });
const saberBlockSounds = [
    new Howl({ src: ['sounds/weapons/saber/saberblock1.wav'], preload: true }),
    new Howl({ src: ['sounds/weapons/saber/saberblock2.wav'], preload: true })
];
const blasterFireSound = new Howl({ src: ['sounds/weapons/blaster/blaster.wav'], preload: true });
const blasterRicoSounds = [
    new Howl({ src: ['sounds/weapons/blaster/rico1.WAV'], preload: true }),
    new Howl({ src: ['sounds/weapons/blaster/rico2.WAV'], preload: true }),
    new Howl({ src: ['sounds/weapons/blaster/rico3.WAV'], preload: true }),
    new Howl({ src: ['sounds/weapons/blaster/rico4.WAV'], preload: true }),
    new Howl({ src: ['sounds/weapons/blaster/rico5.WAV'], preload: true })
];
const playerDeathSound = new Howl({ src: ['sounds/deaths/droid/droiddeath.WAV'], preload: true });
const jumpSound = new Howl({ src: ['sounds/player/jump.wav'], preload: true });
const landSound = new Howl({ src: ['sounds/player/land.wav'], preload: true });
const menuMoveSound = new Howl({ src: ['sounds/UI/MENUMOVE.WAV'], preload: true });
const menuSelectSound = new Howl({ src: ['sounds/UI/MENUSELECT.WAV'], preload: true });
const menuBackSound = new Howl({ src: ['sounds/UI/MENUBACK.WAV'], preload: true });
const menuNoEntrySound = new Howl({ src: ['sounds/UI/MENUNOENTRY.WAV'], preload: true });
let saberLoopId = null;
let activeSpatialAudioInstances = [];
let ownedNativeAudioContext = null;

const allSounds = [
    ...footstepsSounds,
    ...lightsaberSwingSounds,
    ...saberHitSounds,
    droidSpawnSound,
    ...droidStepSounds,
    droidHitSound,
    droidDeath1Sound,
    droidDeath2Sound,
    saberDrawSound,
    saberLoopSound,
    ...saberBlockSounds,
    blasterFireSound,
    ...blasterRicoSounds,
    playerDeathSound,
    jumpSound,
    landSound,
    menuMoveSound,
    menuSelectSound,
    menuBackSound,
    menuNoEntrySound
];
allSounds.forEach(sound => sound.load());

const healthAnnouncement = document.getElementById('health-announcement');

// Helper to play non-positional sounds safely.
function playSound(sound, restart = true) {
    if (!sound) return null;
    if (restart && sound.playing()) {
        sound.stop();
    }
    if (!restart && sound.playing()) {
        return null;
    }
    return sound.play();
}

function stopTrackedSound(playback) {
    if (!playback) {
        return;
    }

    if (playback.engine === 'native') {
        if (playback.audio) {
            playback.audio.pause();
            playback.audio.currentTime = 0;
        }

        if (playback.sourceNode) playback.sourceNode.disconnect();
        if (playback.gainNode) playback.gainNode.disconnect();
        if (playback.pannerNode) playback.pannerNode.disconnect();
        return;
    }

    if (!playback.sound || playback.id === null || playback.id === undefined) {
        return;
    }

    playback.sound.stop(playback.id);
}

function getSharedAudioContext() {
    if (Howler && Howler.ctx) {
        return Howler.ctx;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
        return null;
    }

    if (!ownedNativeAudioContext) {
        ownedNativeAudioContext = new AudioCtx();
    }

    return ownedNativeAudioContext;
}

function getHowlSourcePath(sound) {
    if (!sound) return null;
    if (typeof sound._src === 'string') return sound._src;
    if (Array.isArray(sound._src) && sound._src.length) return sound._src[0];
    return null;
}

function canUseNativeSpatialPlayback() {
    if (!ENABLE_NATIVE_SPATIAL_FALLBACK) {
        return false;
    }

    const ctx = getSharedAudioContext();
    return !!(ctx && typeof ctx.createStereoPanner === 'function');
}

function createNativeSpatialPlayback(sound, position, options = {}) {
    const ctx = getSharedAudioContext();
    const srcPath = getHowlSourcePath(sound);
    if (!ctx || !srcPath) {
        return null;
    }

    const {
        loop = false,
        playbackRate = 1,
        volumeMultiplier = 1,
        minVolumeFloor = 0,
        droid = null,
        track = true
    } = options;

    const audio = new Audio(srcPath);
    audio.preload = 'auto';
    audio.loop = loop;
    audio.playbackRate = playbackRate;

    const sourceNode = ctx.createMediaElementSource(audio);
    const gainNode = ctx.createGain();
    const pannerNode = ctx.createStereoPanner();

    sourceNode.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(ctx.destination);

    const playback = {
        engine: 'native',
        sound,
        id: null,
        audio,
        sourceNode,
        gainNode,
        pannerNode,
        position,
        droid,
        options: { volumeMultiplier, minVolumeFloor }
    };

    updateTrackedSound(playback, position, { volumeMultiplier, minVolumeFloor });

    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    audio.play().catch(() => {});

    if (track) {
        activeSpatialAudioInstances.push(playback);
    } else {
        audio.addEventListener('ended', () => stopTrackedSound(playback), { once: true });
    }

    return playback;
}

function playOneShotPanned(sound, pan, volume = 1) {
    const clampedPan = Math.max(-1, Math.min(1, pan));

    if (canUseNativeSpatialPlayback()) {
        const ctx = getSharedAudioContext();
        const srcPath = getHowlSourcePath(sound);
        if (ctx && srcPath) {
            const audio = new Audio(srcPath);
            const sourceNode = ctx.createMediaElementSource(audio);
            const gainNode = ctx.createGain();
            const pannerNode = ctx.createStereoPanner();

            gainNode.gain.value = volume;
            pannerNode.pan.value = clampedPan;

            sourceNode.connect(gainNode);
            gainNode.connect(pannerNode);
            pannerNode.connect(ctx.destination);

            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }

            audio.play().catch(() => {});
            audio.addEventListener('ended', () => {
                sourceNode.disconnect();
                gainNode.disconnect();
                pannerNode.disconnect();
            }, { once: true });

            return null;
        }
    }

    const id = playSound(sound);
    if (id !== null && typeof sound.stereo === 'function') {
        sound.stereo(clampedPan, id);
    }

    return id;
}

function updateTrackedSound(playback, position, options = {}) {
    if (!playback || !position) {
        return;
    }

    const { volumeMultiplier = 1, minVolumeFloor = 0 } = options;
    const spatialVolume = getVolumeForPosition(position, { volumeMultiplier, minVolumeFloor });
    const pan = getPanForPosition(position);

    if (playback.engine === 'native') {
        if (playback.gainNode) {
            playback.gainNode.gain.value = spatialVolume;
        }
        if (playback.pannerNode) {
            playback.pannerNode.pan.value = pan;
        }
        return;
    }

    if (!playback.sound || playback.id === null || playback.id === undefined) {
        return;
    }

    playback.sound.volume(spatialVolume, playback.id);

    if (typeof playback.sound.stereo === 'function') {
        playback.sound.stereo(pan, playback.id);
    }
}

function playSpatialSoundAtPosition(sound, position, options = {}) {
    if (!sound || !position) {
        return null;
    }

    if (canUseNativeSpatialPlayback()) {
        const nativePlayback = createNativeSpatialPlayback(sound, position, options);
        if (nativePlayback) {
            return nativePlayback;
        }
    }

    const {
        loop = false,
        playbackRate = 1,
        volumeMultiplier = 1,
        minVolumeFloor = 0,
        track = true,
        droid = null
    } = options;

    const pan = getPanForPosition(position);
    const volume = getVolumeForPosition(position, {
        volumeMultiplier,
        minVolumeFloor
    });

    // Set defaults before starting playback.
    if (typeof sound.stereo === 'function') {
        sound.stereo(pan);
    }
    sound.volume(volume);
    sound.loop(loop);
    sound.rate(playbackRate);

    const id = sound.play();

    if (id === null || id === undefined) {
        return null;
    }

    // Set the exact playing instance too.
    if (typeof sound.stereo === 'function') {
        sound.stereo(pan, id);
    }
    sound.volume(volume, id);
    sound.loop(loop, id);
    sound.rate(playbackRate, id);

    console.log(
        `Spatial sound: playerX=${getPerceivedPlayerPosition().x}, ` +
        `soundX=${position.x}, pan=${pan}, id=${id}`
    );

    if (track) {
        activeSpatialAudioInstances.push({
            sound,
            id,
            position,
            droid,
            options: { volumeMultiplier, minVolumeFloor }
        });
    }

    return { sound, id };
}

function startSaberLoop() {
    if (saberLoopId !== null && saberLoopSound.playing(saberLoopId)) {
        return;
    }
    saberLoopId = saberLoopSound.play();
    saberLoopSound.loop(true, saberLoopId);
}

function stopSaberLoop() {
    if (saberLoopId !== null) {
        saberLoopSound.stop(saberLoopId);
        saberLoopId = null;
        return;
    }
    saberLoopSound.stop();
}

function getOutputChannelCount() {
    const ctx = getSharedAudioContext();
    if (!ctx || !ctx.destination) {
        return 'unknown';
    }

    const maxChannels = typeof ctx.destination.maxChannelCount === 'number' ? ctx.destination.maxChannelCount : 0;
    const activeChannels = typeof ctx.destination.channelCount === 'number' ? ctx.destination.channelCount : 0;
    const channels = Math.max(maxChannels, activeChannels);

    return channels > 0 ? channels : 'unknown';
}

function playStereoTestBlaster(pan, volume = 0.95) {
    const id = blasterFireSound.play();
    if (id === null || id === undefined) {
        return false;
    }

    blasterFireSound.volume(volume, id);
    if (typeof blasterFireSound.stereo === 'function') {
        blasterFireSound.stereo(Math.max(-1, Math.min(1, pan)), id);
    }

    return true;
}
function playStereoTestTone() {
    const channels = getOutputChannelCount();
    const testPans = [-0.65, -0.35, 0, 0.35, 0.65];

    testPans.forEach((pan, index) => {
        setTimeout(() => {
            playStereoTestBlaster(pan, 0.95);
        }, index * 280);
    });

    announceMenu(`Linear stereo test: -0.65, -0.35, 0, 0.35, 0.65. Output channels: ${channels}`);
}

// Update health display
function updateHealthDisplay() {
    healthAnnouncement.textContent = `Health: ${playerHealth}`;
}

function announceMenu(text) {
    if (!menuAnnouncement) return;
    menuAnnouncement.textContent = '';
    setTimeout(() => {
        menuAnnouncement.textContent = text;
    }, 10);
}

function renderMenu() {
    if (!menuElement) return;

    const items = menuModel[menuState.current];
    menuElement.innerHTML = '';

    items.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.tabIndex = -1;
        button.textContent = item;
        if (index === menuState.selectedIndex) {
            button.classList.add('is-selected');
        }
        menuElement.appendChild(button);
    });
}

function enterMenu(menuKey) {
    menuState.current = menuKey;
    menuState.selectedIndex = 0;
    renderMenu();
    announceMenu(`${menuModel[menuKey][0]} selected`);
}

function moveMenuSelection(direction) {
    const items = menuModel[menuState.current];
    const maxIndex = items.length - 1;
    const nextIndex = menuState.selectedIndex + direction;

    if (nextIndex < 0) {
        menuState.selectedIndex = maxIndex;
    } else if (nextIndex > maxIndex) {
        menuState.selectedIndex = 0;
    } else {
        menuState.selectedIndex = nextIndex;
    }

    playSound(menuMoveSound);
    renderMenu();
    announceMenu(`${items[menuState.selectedIndex]} selected`);
}

function startGame() {
    if (gameplayStarted) return;
    gameplayStarted = true;
    menuState.active = false;

    if (menuElement) {
        menuElement.style.display = 'none';
    }

    announceMenu('Game started');

    update();
    startSpawningDroids();
    document.addEventListener('keydown', handlePlayerActions);
    document.addEventListener('keyup', handlePlayerActionsKeyUp);
}

function tryGoBack() {
    if (menuState.current === 'main') {
        playSound(menuNoEntrySound);
        announceMenu('Already at main menu');
        return;
    }

    playSound(menuBackSound);
    enterMenu('main');
}

function selectMenuItem() {
    const selectedItem = menuModel[menuState.current][menuState.selectedIndex];

    if (selectedItem === 'Back') {
        tryGoBack();
        return;
    }

    playSound(menuSelectSound);

    if (menuState.current === 'main' && selectedItem === 'Start Game') {
        startGame();
        return;
    }

    if (menuState.current === 'main' && selectedItem === 'Options') {
        enterMenu('options');
        return;
    }

    if (menuState.current === 'main' && selectedItem === 'Credits') {
        enterMenu('credits');
        announceMenu('Credits. Galactic Adventures audio prototype. Back selected');
        return;
    }

    if (menuState.current === 'main' && selectedItem === 'Quit') {
        playSound(menuNoEntrySound);
        announceMenu('Quit is not available in browser');
        return;
    }

    if (menuState.current === 'options' && selectedItem === 'Audio Help') {
        announceMenu('Menu uses arrow keys to move, enter to select, and escape to go back');
        return;
    }
}

function handleMenuInput(event) {
    if (!menuState.active) return;

    switch (event.key) {
        case 'ArrowUp':
            event.preventDefault();
            moveMenuSelection(-1);
            break;
        case 'ArrowDown':
            event.preventDefault();
            moveMenuSelection(1);
            break;
        case 'Enter':
        case ' ': {
            event.preventDefault();
            selectMenuItem();
            break;
        }
        case 'Escape':
        case 'Backspace':
            event.preventDefault();
            tryGoBack();
            break;
    }
}

// Display the "You died!" message, stop saber loop, and disable all controls when player health reaches 0
function gameOver() {
    activeSpatialAudioInstances.forEach(entry => stopTrackedSound(entry));
    gameRunning = false;
    activeSpatialAudioInstances = [];

    // Stop the lightsaber loop if it's still playing
    if (isSaberDrawn) {
        stopSaberLoop();
    }

    // Announce that health is 0 first, then show the death message
    updateHealthDisplay();
    setTimeout(() => {
        deathMessage.innerText = 'You died!';
        deathMessage.style.fontSize = '2em';
        deathMessage.style.color = 'red';
        document.body.appendChild(deathMessage);
    }, 500); // Short delay to allow the health announcement to complete

    // Stop player footsteps
    stopPlayerFootsteps();

    // Stop droids from shooting or moving
    clearTimeout(droidSpawnInterval);
    clearTimeout(droidInitialSpawnTimeout);
    droids.forEach(droid => clearInterval(droid.fireInterval));

    // Disable all actions
    document.removeEventListener('keydown', handlePlayerActions);
    document.removeEventListener('keyup', handlePlayerActionsKeyUp);
}

// Announce health when H is pressed
document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.key !== 't' && event.key !== 'T') return;

    event.preventDefault();
    playStereoTestTone();
});

// Announce health when H is pressed
document.addEventListener('keydown', (event) => {
    if (menuState.active) return;
    if (event.key === 'h' || event.key === 'H') {
        updateHealthDisplay();
    }
});

// Announce player coordinates when C is pressed (without dialog, just text output)
document.addEventListener('keydown', (event) => {
    if (menuState.active) return;
    if (event.key === 'c' || event.key === 'C') {
        coordAnnouncement.innerText = `Player position: X: ${playerPosition.x}, Y: ${playerPosition.y}`;
    }
});

// Toggle lightsaber with key "1" (space can also draw it)
document.addEventListener('keydown', (event) => {
    if (menuState.active) return;
    if (!gameRunning) return; // Stop actions when the game is over

    if (event.key === '1') {
        if (!isSaberDrawn) {
            playSound(saberDrawSound);
            startSaberLoop();
            isSaberDrawn = true;
        } else {
            stopSaberLoop();
            isSaberDrawn = false;
            isBlocking = false;
        }
    }
});

// Play exactly one centered footstep per movement step.
function playPlayerFootstepStep() {
    const sound = footstepsSounds[footstepIndex % 2];
    const id = playSound(sound);
    if (id !== null && typeof sound.stereo === 'function') {
        sound.stereo(0, id);
    }
    footstepIndex++;
}

function stopPlayerFootsteps() {
    // Discrete step playback does not need interval cleanup.
}

function movePlayerStep(direction) {
    if (direction === -1) {
        const nextX = Math.max(0, playerPosition.x - 1);
        if (nextX !== playerPosition.x) {
            playerPosition.x = nextX;
            playPlayerFootstepStep();
        }
        return;
    }

    if (direction === 1) {
        if (!isJumping) {
            playerPosition.x = Math.min(mapWidth, playerPosition.x + 1);
            playPlayerFootstepStep();
        }
    }
}

function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

function getDynamicDroidPopulationTarget() {
    return MAX_ACTIVE_DROIDS;
}

function isDirectlyInFrontOfPlayer(position) {
    // Only block spawns immediately ahead of the player, not all right-side spawns.
    const deltaX = position.x - playerPosition.x;
    return deltaX > 0 && deltaX <= INITIAL_FRONT_SPAWN_BLOCK_Y;
}

// Function to prevent droids from piling up and ensure unique random positions
function getRandomPosition(options = {}) {
    const { avoidFront = false } = options;
    let position;
    let isTooCloseToDroid;
    let isTooCloseToPlayer;
    let isInOriginNoSpawnZone;
    let isDirectlyInFront;
    let attempts = 0;
    do {
        // Keep droids spawning on the right side so they approach toward the player.
        const minSpawnX = Math.max(MIN_DROID_SPAWN_X, playerPosition.x + MIN_SPAWN_DISTANCE_FROM_PLAYER);
        const maxSpawnX = mapWidth;
        const spawnX = minSpawnX >= maxSpawnX ? maxSpawnX : randomInRange(minSpawnX, maxSpawnX);
        position = { x: spawnX, y: 0 };
        isTooCloseToDroid = droids.some(droid => {
            const dx = droid.position.x - position.x;
            const dy = droid.position.y - position.y;
            return Math.sqrt(dx * dx + dy * dy) < MIN_SPAWN_DISTANCE_BETWEEN_DROIDS;
        });

        const playerDx = playerPosition.x - position.x;
        const playerDy = playerPosition.y - position.y;
        isTooCloseToPlayer = Math.sqrt(playerDx * playerDx + playerDy * playerDy) < MIN_SPAWN_DISTANCE_FROM_PLAYER;

        const originDx = position.x;
        const originDy = position.y;
        isInOriginNoSpawnZone = Math.sqrt(originDx * originDx + originDy * originDy) < ORIGIN_NO_SPAWN_RADIUS;

        isDirectlyInFront = avoidFront && isDirectlyInFrontOfPlayer(position);
        attempts += 1;
    } while ((isTooCloseToDroid || isTooCloseToPlayer || isInOriginNoSpawnZone || isDirectlyInFront) && attempts < 300);
    return position;
}

// Initialize droids - Spawn them at random positions across the map
function spawnDroid(options = {}) {
    const { avoidFront = false } = options;
    totalDroidsSpawned += 1;
    const isBoss = totalDroidsSpawned % 10 === 0;
    const stepSound = droidStepSounds[totalDroidsSpawned % droidStepSounds.length];
    const droid = {
        id: totalDroidsSpawned,
        position: getRandomPosition({ avoidFront }),
        health: isBoss ? 2 : 1,
        isBoss,
        stepSound,
        stepLoop: null,
        direction: -1,
        moveProgress: 0,
        moveSpeed: totalDroidsSpawned === 1 ? DROID_FIRST_HUNTER_SPEED : DROID_BASE_MOVE_SPEED,
        lostTargetStartTime: null
    };
    droids.push(droid);

    playSpatialSoundAtPosition(droidSpawnSound, droid.position, {
        volumeMultiplier: droidApproachMix.droidBoost * DROID_VOICE_BOOST,
        minVolumeFloor: DROID_VOICE_MIN_VOLUME
    });

    if (droid.stepSound) {
        droid.stepLoop = playSpatialSoundAtPosition(droid.stepSound, droid.position, {
            loop: true,
            playbackRate: 1,
            volumeMultiplier: droidApproachMix.droidBoost,
            minVolumeFloor: droidApproachMix.minVolume,
            droid
        });
    }

    if (droid.isBoss) {
        playSpatialSoundAtPosition(droidDeath2Sound, droid.position, {
            volumeMultiplier: droidApproachMix.droidBoost,
            minVolumeFloor: droidApproachMix.minVolume
        });
    }

    droidFireAtRandom(droid); // Make this droid fire at random intervals
}

function getDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function removeDroid(droid) {
    clearInterval(droid.fireInterval);

    if (droid.stepLoop) {
        stopTrackedSound(droid.stepLoop);
    }

    droids = droids.filter(candidate => candidate !== droid);
}

function applyDroidBlasterImpact(droid) {
    // Jumping (plus a short landing grace window) creates a dodge window for incoming blaster shots.
    if (isJumping || (performance.now() - lastJumpLandTime) <= JUMP_DODGE_GRACE_MS) {
        return;
    }

    if (isBlocking) {
        const blockSound = saberBlockSounds[Math.floor(Math.random() * saberBlockSounds.length)];
        if (droid) {
            playSpatialSoundAtPosition(blockSound, droid.position, { volumeMultiplier: droidApproachMix.droidBoost });
        } else {
            playSound(blockSound);
        }
        return;
    }

    playerHealth -= 10;
    updateHealthDisplay();

    const ricoSound = blasterRicoSounds[Math.floor(Math.random() * blasterRicoSounds.length)];
    if (droid) {
        playSpatialSoundAtPosition(ricoSound, droid.position, {
            volumeMultiplier: droidApproachMix.blasterBoost,
            minVolumeFloor: droidApproachMix.blasterMinVolume
        });
    } else {
        const ricoId = playSound(ricoSound);
        if (ricoId !== null && typeof ricoSound.stereo === 'function') {
            ricoSound.stereo(0, ricoId);
        }
    }

    if (playerHealth <= 0) {
        playerHealth = 0;
        updateHealthDisplay();
        playSound(playerDeathSound);
        gameOver();
    }
}

// Make each droid fire quickly with a short travel delay before impact.
function droidFireAtRandom(droid) {
    const fireInterval = randomInRange(DROID_MIN_FIRE_INTERVAL_MS, DROID_MAX_FIRE_INTERVAL_MS);
    droid.fireInterval = setInterval(() => {
        if (!gameRunning) return;

        // Let jumps be a real dodge mechanic by pausing incoming fire while airborne.
        if (isJumping) return;

        const targetPosition = getPerceivedPlayerPosition();
        if (Math.abs(droid.position.x - targetPosition.x) <= DROID_BLASTER_RANGE_X && Math.abs(droid.position.y - targetPosition.y) <= DROID_BLASTER_RANGE_Y) {
            playSpatialSoundAtPosition(blasterFireSound, droid.position, {
                volumeMultiplier: droidApproachMix.blasterBoost,
                minVolumeFloor: droidApproachMix.blasterMinVolume
            });

            const travelFeet = Math.min(DROID_BLASTER_TRAVEL_FEET, getDistance(droid.position, targetPosition));
            const impactDelayMs = Math.max(90, Math.floor(travelFeet * DROID_BLASTER_TRAVEL_MS_PER_FOOT));

            setTimeout(() => {
                if (!gameRunning) return;
                if (!droids.includes(droid)) return;
                if (isJumping) return;
                applyDroidBlasterImpact(droid);
            }, impactDelayMs);
        }
    }, fireInterval);
}

// Continuous droid spawning with slower pacing and kill-based population scaling.
function startSpawningDroids() {
    clearTimeout(droidInitialSpawnTimeout);
    clearTimeout(droidSpawnInterval);

    const spawnTick = () => {
        if (!gameRunning) return;

        const targetPopulation = getDynamicDroidPopulationTarget();
        if (droids.length < targetPopulation) {
            spawnDroid({ avoidFront: droids.length === 0 });
        }

        droidSpawnInterval = setTimeout(spawnTick, DROID_SPAWN_INTERVAL_MS);
    };

    // Delay the first droid wave so game start is quiet and readable.
    droidInitialSpawnTimeout = setTimeout(() => {
        if (!gameRunning) return;

        spawnTick();
    }, DROID_SPAWN_INTERVAL_MS);
}

function getPerceivedPlayerPosition() {
    if (isJumping) {
        const elapsed = Math.max(0, performance.now() - jumpStartTime);
        const progress = Math.min(1, elapsed / JUMP_AIR_TIME_MS);
        const jumpTargetX = Math.min(mapWidth, jumpStartX + jumpDistance);
        const perceivedX = jumpStartX + ((jumpTargetX - jumpStartX) * progress);

        return {
            x: perceivedX,
            y: playerPosition.y
        };
    }

    return {
        x: playerPosition.x,
        y: playerPosition.y
    };
}

function getRelativePositionToPlayer(objectPosition) {
    const perceivedPlayerPosition = getPerceivedPlayerPosition();
    return {
        dx: objectPosition.x - perceivedPlayerPosition.x,
        dy: objectPosition.y - perceivedPlayerPosition.y
    };
}

function calculatePan(listenerX, soundX) {
    const relativeX = soundX - listenerX;
    return Math.max(-1, Math.min(1, relativeX / STEREO_MAX_DISTANCE));
}

function getPanForPosition(position) {
    const playerX = getPerceivedPlayerPosition().x;
    return calculatePan(playerX, position.x);
}

function getDroidPan(droid) {
    return getPanForPosition(droid.position);
}

function getVolumeForPosition(position, options = {}) {
    const { dx, dy } = getRelativePositionToPlayer(position);
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    const { volumeMultiplier = 1, minVolumeFloor = 0 } = options;
    let volume = 0;

    if (distance <= droidApproachMix.distanceRange) {
        volume = Math.max(droidApproachMix.minVolume, 1 - (distance / droidApproachMix.distanceRange));
    } else {
        const overflow = distance - droidApproachMix.distanceRange;
        const fadeFactor = 1 - (overflow / droidApproachMix.fadeOutRange);
        volume = Math.max(0, droidApproachMix.minVolume * fadeFactor);
    }

    volume *= volumeMultiplier;
    volume = Math.max(minVolumeFloor, volume);

    return Math.min(1, volume);
}

function updateTrackedDroidPanning() {
    if (!activeSpatialAudioInstances.length) return;

    activeSpatialAudioInstances = activeSpatialAudioInstances.filter(entry => {
        if (entry.engine === 'native') {
            if (!entry.audio || (entry.audio.ended && !entry.audio.loop)) {
                stopTrackedSound(entry);
                return false;
            }
        } else if (!entry.sound.playing(entry.id)) {
            return false;
        }

        if (entry.droid && !droids.includes(entry.droid)) {
            stopTrackedSound(entry);
            return false;
        }

        const trackedPosition = entry.droid ? entry.droid.position : entry.position;
        if (!trackedPosition) {
            return false;
        }

        updateTrackedSound(entry, trackedPosition, entry.options);
        return true;
    });
}

// Handle droid movement and actions
function moveDroid(droid) {
    const now = performance.now();
    const playerDeltaX = playerPosition.x - droid.position.x;
    const isMovingAwayFromPlayer = (playerDeltaX * droid.direction) < 0;

    // Only turn and chase after moving away from the player for a while.
    if (isMovingAwayFromPlayer) {
        if (droid.lostTargetStartTime === null) {
            droid.lostTargetStartTime = now;
        }

        if ((now - droid.lostTargetStartTime) >= DROID_CHASE_DELAY_MS) {
            droid.direction = playerDeltaX >= 0 ? 1 : -1;
            droid.lostTargetStartTime = null;
        }
    } else {
        droid.lostTargetStartTime = null;
    }

    droid.moveProgress += droid.moveSpeed;
    while (droid.moveProgress >= 1) {
        const nextX = droid.position.x + droid.direction;
        if (nextX < 0 || nextX > mapWidth) {
            // Stop at edge; delayed chase logic will decide if/when to turn around.
            droid.position.x = Math.max(0, Math.min(mapWidth, droid.position.x));
            break;
        }

        droid.position.x = nextX;
        droid.moveProgress -= 1;
    }

    // Safety cleanup for invalid coordinates.
    if (droid.position.y < 0 || droid.position.y > mapHeight) {
        removeDroid(droid);
    }
}

// Handle player actions and interactions
function handlePlayerActions(event) {
    if (!gameRunning) return; // Actions are only possible if the game is running and the player isn't dead

    switch (event.key) {
        case 'ArrowLeft':
            event.preventDefault();
            isMovingLeft = true;
            if (event.repeat) {
                break;
            }
            if (!isJumping) {
                movePlayerStep(-1);
                lastPlayerMoveTime = performance.now();
            }
            break;
        case 'ArrowRight':
            event.preventDefault();
            isMovingRight = true;
            if (event.repeat) {
                break;
            }
            movePlayerStep(1);
            lastPlayerMoveTime = performance.now();
            break;
        case 'ArrowUp': // Use arrow up for jumping only
            if (!isJumping) {
                isJumping = true;
                jumpDistance = JUMP_FORWARD_STEPS;
                jumpStartX = playerPosition.x;
                jumpStartTime = performance.now();
                playSound(jumpSound);

                // Automatically land after a short airtime.
                setTimeout(() => {
                    playerPosition.x = Math.min(mapWidth, jumpStartX + jumpDistance);
                    jumpDistance = 0;
                    isJumping = false;
                    lastJumpLandTime = performance.now();
                    playSound(landSound); // Play landing sound
                }, JUMP_AIR_TIME_MS);
            }
            break;
        case ' ': // Spacebar for lightsaber swing
            event.preventDefault();
            if (!isSaberDrawn) {
                playSound(saberDrawSound);
                startSaberLoop();
                isSaberDrawn = true;
                isBlocking = false;
                return;
            }
            if (event.repeat) {
                isBlocking = true;
                startSaberLoop(); // Keep saber hum active while blocking
            } else {
                const now = performance.now();
                if (now - lastSaberSwingTime < SABER_SWING_COOLDOWN_MS) {
                    break;
                }

                isBlocking = false;
                let droidHit = false;
                // Play a random saber swing sound to vary attack feel.
                const swingSound = lightsaberSwingSounds[Math.floor(Math.random() * lightsaberSwingSounds.length)];
                lastSaberSwingTime = now;
                playSound(swingSound);

                droids.forEach(droid => {
                    // Make sure droids are hittable within 5 steps distance
                    if (Math.abs(droid.position.x - playerPosition.x) <= 5 && Math.abs(droid.position.y - playerPosition.y) <= 5) {
                        // Play saber hit sound and then check if the droid is hit
                        const hitSoundPath = saberHitSounds[Math.floor(Math.random() * saberHitSounds.length)];
                        playSpatialSoundAtPosition(
                            hitSoundPath,
                            droid.position,
                            { volumeMultiplier: droidApproachMix.droidBoost }
                        );
                        setTimeout(() => {
                            droid.health -= 1;
                            droidHit = true;
                            if (droid.health === 1) {
                                playSpatialSoundAtPosition(droidHitSound, droid.position, {
                                    volumeMultiplier: droidApproachMix.droidBoost * DROID_VOICE_BOOST,
                                    minVolumeFloor: DROID_VOICE_MIN_VOLUME
                                });
                            }
                            if (droid.health <= 0) {
                                const deathSoundPath = droid.isBoss ? droidDeath2Sound : droidDeath1Sound;
                                playSpatialSoundAtPosition(deathSoundPath, { ...droid.position }, {
                                    volumeMultiplier: droidApproachMix.droidBoost,
                                    minVolumeFloor: droidApproachMix.minVolume
                                });
                                totalDroidsKilled += 1;
                                removeDroid(droid);
                            }
                        }, 50); // Delay for the saber hit sound to finish before checking health
                    }
                });
            }
            break;
    }
}

// Stop footsteps when the arrow keys are released
function handlePlayerActionsKeyUp(event) {
    if (event.key === 'ArrowLeft') {
        isMovingLeft = false;
        stopPlayerFootsteps();
    }
    if (event.key === 'ArrowRight') {
        isMovingRight = false;
        stopPlayerFootsteps();
    }
    if (event.key === ' ') {
        isBlocking = false;
    }
}

// Droid movement and spawning
function update() {
    if (!gameRunning) return;

    const now = performance.now();

    if (now - lastPlayerMoveTime >= PLAYER_MOVE_INTERVAL_MS) {
        if (isMovingLeft && !isMovingRight && !isJumping) {
            movePlayerStep(-1);
        }
        if (isMovingRight && !isMovingLeft) {
            movePlayerStep(1);
        }
        lastPlayerMoveTime = now;
    }

    if (now - lastDroidMoveTime >= DROID_MOVE_INTERVAL_MS) {
        droids.forEach(droid => moveDroid(droid));
        lastDroidMoveTime = now;
    }

    updateTrackedDroidPanning();

    // Check if player falls into the abyss
    if (playerPosition.y < 0 || playerPosition.y > mapHeight) {
        playSound(playerDeathSound);
        gameOver(); // End the game when the player falls into the abyss
    }

    // Loop the game update
    if (gameRunning) {
        requestAnimationFrame(update);
    }
}

renderMenu();
announceMenu(`${menuModel.main[0]} selected`);
document.addEventListener('keydown', handleMenuInput);
});
