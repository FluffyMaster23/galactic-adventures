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
    const PLAYER_MOVE_INTERVAL_MS = 260;
    const SABER_SWING_COOLDOWN_MS = 550;
    const JUMP_AIR_TIME_MS = 900;
    const DROID_MIN_FIRE_INTERVAL_MS = 350;
    const DROID_MAX_FIRE_INTERVAL_MS = 850;
    const DROID_BLASTER_RANGE_X = 5;
    const DROID_BLASTER_RANGE_Y = 0;
    const DROID_BLASTER_TRAVEL_FEET = 4;
    const DROID_BLASTER_TRAVEL_MS_PER_FOOT = 120;
    const DROID_STEP_INTERVAL_MS = 720;
    const MIN_SPAWN_DISTANCE_FROM_PLAYER = 20;
    const MIN_SPAWN_DISTANCE_BETWEEN_DROIDS = 10;
    const ORIGIN_NO_SPAWN_RADIUS = 12;
    const INITIAL_FRONT_SPAWN_BLOCK_Y = 8;
    const DROID_CENTER_DEAD_ZONE_X = 1;
    const MIN_DROID_SPAWN_X = 10;
    const FOOTSTEP_PAN_AMOUNT = 1;
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
    function makeHowl(src, extraOptions = {}) {
        return new Howl({
            src: [src],
            preload: true,
            ...extraOptions
        });
    }

    const footstepsSounds = [makeHowl('sounds/player/step1.WAV'), makeHowl('sounds/player/step2.WAV')]; // Player footsteps
    const lightsaberSwingSounds = [
        makeHowl('sounds/weapons/saber/saberswing1.wav'),
        makeHowl('sounds/weapons/saber/saberswing2.wav'),
        makeHowl('sounds/weapons/saber/saberswing3.wav')
    ];
    const saberHitSounds = [makeHowl('sounds/weapons/saber/saberhit1.wav'), makeHowl('sounds/weapons/saber/saberhit2.wav')]; // Lightsaber hit sounds
    const droidSpawnSound = makeHowl('sounds/enemies/droid/roger.WAV');
    const droidStepSounds = [
        makeHowl('sounds/enemies/droid/droidstep1.wav'),
        makeHowl('sounds/enemies/droid/droidstep2.wav')
    ];
    const droidHitSound = makeHowl('sounds/enemies/droid/roger.WAV');
    const droidDeath1Sound = makeHowl('sounds/deaths/droid/droiddeath.WAV');
    const droidDeath2Sound = makeHowl('sounds/deaths/droid/death2.WAV');
    const saberDrawSound = makeHowl('sounds/weapons/saber/drawsaber.wav');
    const saberLoopSound = makeHowl('sounds/weapons/saber/saberloop.wav', { loop: true });
    const saberBlockSounds = [
        makeHowl('sounds/weapons/saber/saberblock1.wav'),
        makeHowl('sounds/weapons/saber/saberblock2.wav')
    ];
    const blasterFireSound = makeHowl('sounds/weapons/blaster/blaster.wav');
    const blasterRicoSounds = [
        makeHowl('sounds/weapons/blaster/rico1.WAV'),
        makeHowl('sounds/weapons/blaster/rico2.WAV'),
        makeHowl('sounds/weapons/blaster/rico3.WAV'),
        makeHowl('sounds/weapons/blaster/rico4.WAV'),
        makeHowl('sounds/weapons/blaster/rico5.WAV')
    ];
    const playerDeathSound = makeHowl('sounds/deaths/droid/droiddeath.WAV');
    const jumpSound = makeHowl('sounds/player/jump.wav'); // New jump sound
    const landSound = makeHowl('sounds/player/land.wav'); // New landing sound
    const menuMoveSound = makeHowl('sounds/UI/MENUMOVE.WAV');
    const menuSelectSound = makeHowl('sounds/UI/MENUSELECT.WAV');
    const menuBackSound = makeHowl('sounds/UI/MENUBACK.WAV');
    const menuNoEntrySound = makeHowl('sounds/UI/MENUNOENTRY.WAV');
    const rawSpatialDroidStepPaths = [
        'sounds/enemies/droid/droidstep1.wav',
        'sounds/enemies/droid/droidstep2.wav'
    ];
    const rawSpatialSaberHitPaths = [
        'sounds/weapons/saber/saberhit1.wav',
        'sounds/weapons/saber/saberhit2.wav'
    ];
    const rawSpatialSoundPaths = {
        droidSpawn: 'sounds/enemies/droid/roger.WAV',
        droidHit: 'sounds/enemies/droid/roger.WAV',
        droidDeath1: 'sounds/deaths/droid/droiddeath.WAV',
        droidDeath2: 'sounds/deaths/droid/death2.WAV',
        blaster: 'sounds/weapons/blaster/blaster.wav'
    };
    let saberLoopId = null;
    let activeSpatialAudioInstances = [];
    let spatialAudioContext = null;
    const spatialBufferCache = new Map();

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

    function getSpatialAudioContext() {
        if (spatialAudioContext) {
            return spatialAudioContext;
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            return null;
        }

        spatialAudioContext = new AudioContextClass();
        return spatialAudioContext;
    }

    function getSpatialBuffer(src) {
        if (spatialBufferCache.has(src)) {
            return spatialBufferCache.get(src);
        }

        const context = getSpatialAudioContext();
        if (!context) {
            return Promise.resolve(null);
        }

        const bufferPromise = fetch(src)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => context.decodeAudioData(arrayBuffer.slice(0)))
            .catch(() => null);

        spatialBufferCache.set(src, bufferPromise);
        return bufferPromise;
    }

    function createSpatialAudioInstance(src, options = {}) {
        const { loop = false, playbackRate = 1 } = options;
        const context = getSpatialAudioContext();
        if (!context) return null;

        const gainNode = context.createGain();
        const stereoPanner = context.createStereoPanner();
        gainNode.connect(stereoPanner);
        stereoPanner.connect(context.destination);

        return {
            src,
            loop,
            playbackRate,
            sourceNode: null,
            gainNode,
            stereoPanner,
            stopped: false
        };
    }

    function stopSpatialAudioInstance(instance) {
        if (!instance) return;
        instance.stopped = true;

        if (instance.sourceNode) {
            try {
                instance.sourceNode.stop();
            } catch (error) {
                // Ignore stop errors for already finished nodes.
            }
        }

        try {
            if (instance.sourceNode) {
                instance.sourceNode.disconnect();
            }
            instance.gainNode.disconnect();
            instance.stereoPanner.disconnect();
        } catch (error) {
            // Ignore disconnect errors for already detached nodes.
        }
    }

    function updateSpatialAudioInstance(instance, position, options = {}) {
        if (!instance) return;

        const { volumeMultiplier = 1, minVolumeFloor = 0 } = options;
        instance.gainNode.gain.value = getVolumeForPosition(position, { volumeMultiplier, minVolumeFloor });
        instance.stereoPanner.pan.value = getPanForPosition(position);
    }

    function playSpatialSoundAtPosition(src, position, options = {}) {
        const { loop = false, playbackRate = 1, volumeMultiplier = 1, minVolumeFloor = 0 } = options;
        const context = getSpatialAudioContext();
        const instance = createSpatialAudioInstance(src, { loop, playbackRate });
        if (!context || !instance) {
            return;
        }

        updateSpatialAudioInstance(instance, position, { volumeMultiplier, minVolumeFloor });

        context.resume()
            .then(() => getSpatialBuffer(src))
            .then(buffer => {
                if (!buffer || instance.stopped) {
                    stopSpatialAudioInstance(instance);
                    return;
                }

                const sourceNode = context.createBufferSource();
                sourceNode.buffer = buffer;
                sourceNode.loop = loop;
                sourceNode.playbackRate.value = playbackRate;
                sourceNode.connect(instance.gainNode);
                instance.sourceNode = sourceNode;

                sourceNode.onended = () => {
                    if (!instance.loop) {
                        stopSpatialAudioInstance(instance);
                    }
                };

                sourceNode.start();
            })
            .catch(() => {
                stopSpatialAudioInstance(instance);
            });

        return instance;
    }

    function trackSpatialLoop(droid, instance, options = {}) {
        activeSpatialAudioInstances.push({ droid, instance, options });
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
        activeSpatialAudioInstances.forEach(entry => {
            stopSpatialAudioInstance(entry.instance);
        });
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
        const centeredX = playerPosition.x - (mapWidth / 2);
        return Math.max(-1, Math.min(1, centeredX / (mapWidth / 2)));
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
        return position.x > playerPosition.x && Math.abs(position.y - playerPosition.y) <= INITIAL_FRONT_SPAWN_BLOCK_Y;
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
        const stepSoundPath = rawSpatialDroidStepPaths[totalDroidsSpawned % rawSpatialDroidStepPaths.length];
        const droid = {
            id: totalDroidsSpawned,
            position: getRandomPosition({ avoidFront }),
            health: isBoss ? 2 : 1,
            isBoss,
            stepSoundPath,
            stepLoop: null
        };
        droids.push(droid);

        playSpatialSoundAtPosition(rawSpatialSoundPaths.droidSpawn, droid.position, { volumeMultiplier: droidApproachMix.droidBoost });

        if (droid.stepSoundPath) {
            droid.stepLoop = playSpatialSoundAtPosition(droid.stepSoundPath, droid.position, {
                loop: true,
                playbackRate: 1,
                volumeMultiplier: droidApproachMix.droidBoost
            });
            if (droid.stepLoop) {
                trackSpatialLoop(droid, droid.stepLoop, { volumeMultiplier: droidApproachMix.droidBoost });
            }
        }

        if (droid.isBoss) {
            playSpatialSoundAtPosition(rawSpatialSoundPaths.droidDeath2, droid.position, { volumeMultiplier: droidApproachMix.droidBoost });
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
            stopSpatialAudioInstance(droid.stepLoop);
        }

        droids = droids.filter(candidate => candidate !== droid);
    }

    function applyDroidBlasterImpact() {
        // Jumping creates a dodge window for incoming blaster shots.
        if (isJumping) {
            return;
        }

        if (isBlocking) {
            const blockSound = saberBlockSounds[Math.floor(Math.random() * saberBlockSounds.length)];
            playSound(blockSound);
            return;
        }

        playerHealth -= 10;
        updateHealthDisplay();

        const ricoSound = blasterRicoSounds[Math.floor(Math.random() * blasterRicoSounds.length)];
        playSound(ricoSound);

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
                playSpatialSoundAtPosition(rawSpatialSoundPaths.blaster, droid.position, {
                    volumeMultiplier: droidApproachMix.blasterBoost,
                    minVolumeFloor: droidApproachMix.blasterMinVolume
                });

                const travelFeet = Math.min(DROID_BLASTER_TRAVEL_FEET, getDistance(droid.position, playerPosition));
                const impactDelayMs = Math.max(90, Math.floor(travelFeet * DROID_BLASTER_TRAVEL_MS_PER_FOOT));

                setTimeout(() => {
                    if (!gameRunning) return;
                    if (!droids.includes(droid)) return;
                    applyDroidBlasterImpact();
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

    function getPanForPosition(position) {
        const { dx } = getRelativePositionToPlayer(position);
        if (Math.abs(dx) <= DROID_CENTER_DEAD_ZONE_X) {
            return 0;
        }

        return dx > 0 ? 1 : -1;
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
                stopSpatialAudioInstance(entry.instance);
                return false;
            }

            updateSpatialAudioInstance(entry.instance, entry.droid.position, entry.options);
            return true;
        });
    }

    // Handle droid movement and actions
    function moveDroid(droid) {
        // Side-scroller movement: droids walk from right to left across the world.
        droid.position.x -= 1;

        // Check if droid falls into the abyss
        if (droid.position.x < Math.max(-1, playerPosition.x - 6) || droid.position.x > mapWidth || droid.position.y < 0 || droid.position.y > mapHeight) {
            const deathSoundPath = droid.isBoss ? rawSpatialSoundPaths.droidDeath2 : rawSpatialSoundPaths.droidDeath1;
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
                            const hitSoundPath = rawSpatialSaberHitPaths[Math.floor(Math.random() * rawSpatialSaberHitPaths.length)];
                            playSpatialSoundAtPosition(hitSoundPath, { ...droid.position }, { volumeMultiplier: droidApproachMix.droidBoost });
                            setTimeout(() => {
                                droid.health -= 1;
                                droidHit = true;
                                if (droid.health === 1) {
                                    playSpatialSoundAtPosition(rawSpatialSoundPaths.droidHit, droid.position, { volumeMultiplier: droidApproachMix.droidBoost });
                                }
                                if (droid.health <= 0) {
                                    const deathSoundPath = droid.isBoss ? rawSpatialSoundPaths.droidDeath2 : rawSpatialSoundPaths.droidDeath1;
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
