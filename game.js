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
const DROID_MOVE_INTERVAL_MS = 350;
const PLAYER_MOVE_INTERVAL_MS = 250;
const SABER_SWING_COOLDOWN_MS = 550;
const JUMP_AIR_TIME_MS = 900;
const DROID_MIN_FIRE_INTERVAL_MS = 330;
const DROID_MAX_FIRE_INTERVAL_MS = 850;
const DROID_BLASTER_RANGE_X = 5;
const DROID_BLASTER_RANGE_Y = 0;
const DROID_BLASTER_TRAVEL_FEET = 5;
const DROID_BLASTER_TRAVEL_MS_PER_FOOT = 120;
const DROID_STEP_INTERVAL_MS = 720;
const MIN_SPAWN_DISTANCE_FROM_PLAYER = 20;
const MIN_SPAWN_DISTANCE_BETWEEN_DROIDS = 10;
const ORIGIN_NO_SPAWN_RADIUS = 12;
const INITIAL_FRONT_SPAWN_BLOCK_Y = 8;
const MIN_DROID_SPAWN_X = 10;
const FOOTSTEP_PAN_AMOUNT = 1;
const STEREO_MAX_DISTANCE = 10;
const STEREO_PAN_STRENGTH = 2.25;
const STEREO_RIGHT_BIAS = 0.35;
const droidApproachMix = {
    minVolume: 0.12,
    blasterMinVolume: 0.35,
    distanceRange: 40,
    fadeOutRange: 24,
    droidBoost: 1.5,
    blasterBoost: 1.8
};
const deathMessage = document.createElement('div');
const coordAnnouncement = document.createElement('div'); // Coordinate display element
let jumpDistance = 0; // Track how many steps to move during a jump
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
    new Howl({ src: ['sounds/enemies/droid/droidstep1.wav'], preload: true }),
    new Howl({ src: ['sounds/enemies/droid/droidstep2.wav'], preload: true })
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
    if (!playback || !playback.sound || playback.id === null || playback.id === undefined) {
        return;
    }

    playback.sound.stop(playback.id);
}

function updateTrackedSound(playback, position, options = {}) {
    if (!playback || !playback.sound || playback.id === null || playback.id === undefined) {
        return;
    }

    const { volumeMultiplier = 1, minVolumeFloor = 0 } = options;
    playback.sound.volume(getVolumeForPosition(position, { volumeMultiplier, minVolumeFloor }), playback.id);

    const pan = getPanForPosition(position);
    if (typeof playback.sound.stereo === 'function') {
        playback.sound.stereo(pan, playback.id);
    }
}

function playSpatialSoundAtPosition(sound, position, options = {}) {
    if (!sound) return null;

    const { loop = false, playbackRate = 1, volumeMultiplier = 1, minVolumeFloor = 0 } = options;
    const id = sound.play();

    if (id === null || id === undefined) {
        return null;
    }

    sound.loop(loop, id);
    sound.rate(playbackRate, id);
    updateTrackedSound({ sound, id }, position, { volumeMultiplier, minVolumeFloor });

    return { sound, id };
}

function trackSpatialLoop(droid, playback, options = {}) {
    if (!playback) return;
    activeSpatialAudioInstances.push({ droid, sound: playback.sound, id: playback.id, options });
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

// Play exactly one footstep per movement step.
function getPlayerFootstepPan() {
    return footstepIndex % 2 === 0 ? -FOOTSTEP_PAN_AMOUNT : FOOTSTEP_PAN_AMOUNT;
}

function playPlayerFootstepStep() {
    const sound = footstepsSounds[footstepIndex % 2];
    const id = playSound(sound);
    if (id !== null && typeof sound.stereo === 'function') {
        sound.stereo(getPlayerFootstepPan(), id);
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
        } else {
            jumpDistance++;
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
        stepLoop: null
    };
    droids.push(droid);

    playSpatialSoundAtPosition(droidSpawnSound, droid.position, { volumeMultiplier: droidApproachMix.droidBoost });

    if (droid.stepSound) {
        droid.stepLoop = playSpatialSoundAtPosition(droid.stepSound, droid.position, {
            loop: true,
            playbackRate: 1,
            volumeMultiplier: droidApproachMix.droidBoost
        });
        if (droid.stepLoop) {
            trackSpatialLoop(droid, droid.stepLoop, { volumeMultiplier: droidApproachMix.droidBoost });
        }
    }

    if (droid.isBoss) {
        playSpatialSoundAtPosition(droidDeath2Sound, droid.position, { volumeMultiplier: droidApproachMix.droidBoost });
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
    // Jumping creates a dodge window for incoming blaster shots.
    if (isJumping) {
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
        if (Math.abs(droid.position.x - playerPosition.x) <= DROID_BLASTER_RANGE_X && Math.abs(droid.position.y - playerPosition.y) <= DROID_BLASTER_RANGE_Y) {
            playSpatialSoundAtPosition(blasterFireSound, droid.position, {
                volumeMultiplier: droidApproachMix.blasterBoost,
                minVolumeFloor: droidApproachMix.blasterMinVolume
            });

            const travelFeet = Math.min(DROID_BLASTER_TRAVEL_FEET, getDistance(droid.position, playerPosition));
            const impactDelayMs = Math.max(90, Math.floor(travelFeet * DROID_BLASTER_TRAVEL_MS_PER_FOOT));

            setTimeout(() => {
                if (!gameRunning) return;
                if (!droids.includes(droid)) return;
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
    return {
        x: isJumping ? Math.min(mapWidth, playerPosition.x + jumpDistance) : playerPosition.x,
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

function calculatePan(listenerX, soundX, maximumDistance = STEREO_MAX_DISTANCE) {
    const relativeX = soundX - listenerX;
    let pan = (relativeX / maximumDistance) * STEREO_PAN_STRENGTH;

    if (relativeX > 0) {
        pan += STEREO_RIGHT_BIAS;
    }

    return Math.max(-1, Math.min(1, pan));
}

function getPanForPosition(position) {
    const perceivedPlayerPosition = getPerceivedPlayerPosition();
    return calculatePan(perceivedPlayerPosition.x, position.x);
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
        if (!droids.includes(entry.droid)) {
            stopTrackedSound(entry);
            return false;
        }

        updateTrackedSound(entry, entry.droid.position, entry.options);
        return true;
    });
}

// Handle droid movement and actions
function moveDroid(droid) {
    // Side-scroller movement: droids walk from right to left across the world.
    droid.position.x -= 1;

    // Check if droid falls into the abyss
    if (droid.position.x < Math.max(-1, playerPosition.x - 6) || droid.position.x > mapWidth || droid.position.y < 0 || droid.position.y > mapHeight) {
        const deathSoundPath = droid.isBoss ? droidDeath2Sound : droidDeath1Sound;
        playSpatialSoundAtPosition(deathSoundPath, { ...droid.position }, { volumeMultiplier: droidApproachMix.droidBoost });
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
                jumpDistance = 0; // Reset the jump distance counter
                playSound(jumpSound);

                // Automatically land after a short airtime.
                setTimeout(() => {
                    playerPosition.x = Math.min(mapWidth, playerPosition.x + jumpDistance); // Move the player based on jump distance
                    jumpDistance = 0; // Reset the jump distance counter
                    isJumping = false;
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
                        playSpatialSoundAtPosition(hitSoundPath, { ...droid.position }, { volumeMultiplier: droidApproachMix.droidBoost });
                        setTimeout(() => {
                            droid.health -= 1;
                            droidHit = true;
                            if (droid.health === 1) {
                                playSpatialSoundAtPosition(droidHitSound, droid.position, { volumeMultiplier: droidApproachMix.droidBoost });
                            }
                            if (droid.health <= 0) {
                                const deathSoundPath = droid.isBoss ? droidDeath2Sound : droidDeath1Sound;
                                playSpatialSoundAtPosition(deathSoundPath, { ...droid.position }, { volumeMultiplier: droidApproachMix.droidBoost });
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
