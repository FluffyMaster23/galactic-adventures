document.addEventListener('DOMContentLoaded', () => {
    if (typeof Howl === 'undefined') {
        console.error('Howler.js failed to load.');
        return;
    }

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
    let totalDroidsSpawned = 0;
    let totalDroidsKilled = 0;
    let lastPlayerMoveTime = 0;
    let lastDroidMoveTime = 0;
    let lastSaberSwingTime = -Infinity;
    let saberSwingIndex = 0;
    const INITIAL_DROID_COUNT = 3;
    const DROID_SPAWN_INTERVAL_MS = 6000;
    const DROID_MOVE_INTERVAL_MS = 250;
    const PLAYER_MOVE_INTERVAL_MS = 260;
    const SABER_SWING_COOLDOWN_MS = 2000;
    const MIN_SPAWN_DISTANCE_FROM_PLAYER = 20;
    const MIN_SPAWN_DISTANCE_BETWEEN_DROIDS = 10;
    const ORIGIN_NO_SPAWN_RADIUS = 12;
    const deathMessage = document.createElement('div');
    const coordAnnouncement = document.createElement('div'); // Coordinate display element
    let jumpDistance = 0; // Track how many steps to move during a jump

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
        makeHowl('sounds/weapons/saber/saberswing1.mp3'),
        makeHowl('sounds/weapons/saber/saberswing2.mp3'),
        makeHowl('sounds/weapons/saber/saberswing3.mp3')
    ];
    const saberHitSounds = [makeHowl('sounds/weapons/saber/saberhit1.mp3'), makeHowl('sounds/weapons/saber/saberhit2.mp3')]; // Lightsaber hit sounds
    const droidSpawnSound = makeHowl('sounds/enemies/droid/roger.WAV');
    const droidHitSound = makeHowl('sounds/enemies/droid/roger.WAV');
    const droidDeath1Sound = makeHowl('sounds/deaths/droid/droiddeath.WAV');
    const droidDeath2Sound = makeHowl('sounds/deaths/droid/death2.WAV');
    const saberDrawSound = makeHowl('sounds/weapons/saber/drawsaber.mp3');
    const saberLoopSound = makeHowl('sounds/weapons/saber/saberloop.mp3', { loop: true });
    const saberBlockSounds = [
        makeHowl('sounds/weapons/saber/saberblock1.mp3'),
        makeHowl('sounds/weapons/saber/saberblock2.mp3')
    ];
    const blasterFireSound = makeHowl('sounds/weapons/blaster/blaster.mp3');
    const playerDeathSound = makeHowl('sounds/deaths/droid/droiddeath.WAV');
    const jumpSound = makeHowl('sounds/player/jump.mp3'); // New jump sound
    const landSound = makeHowl('sounds/player/land.mp3'); // New landing sound
    let saberLoopId = null;
    const SABER_LOOP_SPRITE = 'humLoop';
    let hasSaberLoopSprite = false;

    saberLoopSound.once('load', () => {
        // MP3 files can have encoder padding; trimming loop edges makes hum feel continuous.
        const durationMs = Math.floor(saberLoopSound.duration() * 1000);
        const trimMs = 60;
        const spriteDuration = Math.max(300, durationMs - (trimMs * 2));
        saberLoopSound._sprite[SABER_LOOP_SPRITE] = [trimMs, spriteDuration, true];
        hasSaberLoopSprite = true;
    });

    const allSounds = [
        ...footstepsSounds,
        ...lightsaberSwingSounds,
        ...saberHitSounds,
        droidSpawnSound,
        droidHitSound,
        droidDeath1Sound,
        droidDeath2Sound,
        saberDrawSound,
        saberLoopSound,
        ...saberBlockSounds,
        blasterFireSound,
        playerDeathSound,
        jumpSound,
        landSound
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

    function startSaberLoop() {
        if (saberLoopId !== null && saberLoopSound.playing(saberLoopId)) {
            return;
        }

        if (hasSaberLoopSprite) {
            saberLoopId = saberLoopSound.play(SABER_LOOP_SPRITE);
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

    // Display the "You died!" message, stop saber loop, and disable all controls when player health reaches 0
    function gameOver() {
        gameRunning = false;

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
        clearInterval(droidSpawnInterval);
        droids.forEach(droid => clearInterval(droid.fireInterval));

        // Disable all actions
        document.removeEventListener('keydown', handlePlayerActions);
        document.removeEventListener('keyup', handlePlayerActionsKeyUp);
    }

    // Announce health when H is pressed
    document.addEventListener('keydown', (event) => {
        if (event.key === 'h' || event.key === 'H') {
            updateHealthDisplay();
        }
    });

    // Announce player coordinates when C is pressed (without dialog, just text output)
    document.addEventListener('keydown', (event) => {
        if (event.key === 'c' || event.key === 'C') {
            coordAnnouncement.innerText = `Player position: X: ${playerPosition.x}, Y: ${playerPosition.y}`;
        }
    });

    // Toggle lightsaber with key "1" (space can also draw it)
    document.addEventListener('keydown', (event) => {
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
    function playPlayerFootstepStep() {
        const sound = footstepsSounds[footstepIndex % 2];
        playSound(sound);
        footstepIndex++;
    }

    function stopPlayerFootsteps() {
        // Discrete step playback does not need interval cleanup.
    }

    function movePlayerStep(direction) {
        if (direction === -1) {
            playerPosition.x = Math.max(0, playerPosition.x - 1);
            playPlayerFootstepStep();
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

    function getDynamicDroidPopulationTarget() {
        if (totalDroidsKilled < 10) return 2;
        if (totalDroidsKilled < 20) return 3;
        return 5;
    }

    // Function to prevent droids from piling up and ensure unique random positions
    function getRandomPosition() {
        let position;
        let isTooCloseToDroid;
        let isTooCloseToPlayer;
        let isInOriginNoSpawnZone;
        do {
            // Spawn anywhere in the world while respecting player distance.
            position = { x: Math.random() * mapWidth, y: Math.random() * mapHeight };
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
        } while (isTooCloseToDroid || isTooCloseToPlayer || isInOriginNoSpawnZone);
        return position;
    }

    // Initialize droids - Spawn them at random positions across the map
    function spawnDroid() {
        totalDroidsSpawned += 1;
        const isBoss = totalDroidsSpawned % 10 === 0;
        const droid = {
            id: totalDroidsSpawned,
            position: getRandomPosition(), // Random position on the right side of the map
            health: isBoss ? 2 : 1,
            isBoss
        };
        droids.push(droid);

        playSoundFromDroid(droid, droidSpawnSound); // Play roger when any droid spawns

        if (droid.isBoss) {
            playSoundFromDroid(droid, droidDeath2Sound); // Play death2 when boss appears
        }

        droidFireAtRandom(droid); // Make this droid fire at random intervals
    }

    // Make each droid fire at random intervals (between 2 and 5 seconds)
    function droidFireAtRandom(droid) {
        const fireInterval = Math.random() * 3000 + 2000; // Random interval between 2 and 5 seconds
        droid.fireInterval = setInterval(() => {
            if (!gameRunning) return;
            if (Math.abs(droid.position.x - playerPosition.x) <= 5 && Math.abs(droid.position.y - playerPosition.y) <= 5) { // Droids fire from 5 tiles away
                if (!isBlocking) {
                    playerHealth -= 10;
                    updateHealthDisplay();

                    if (playerHealth <= 0) {
                        playerHealth = 0;
                        updateHealthDisplay();
                        playSound(playerDeathSound);
                        gameOver(); // End game when health reaches 0
                    }
                } else {
                    const blockSound = saberBlockSounds[Math.floor(Math.random() * saberBlockSounds.length)];
                    playSound(blockSound); // Play blocking sound
                }

                playSoundFromDroid(droid, blasterFireSound); // Play independent blaster fire for each droid with panning
            }
        }, fireInterval);
    }

    // Continuous droid spawning with slower pacing and kill-based population scaling.
    function startSpawningDroids() {
        for (let i = 0; i < INITIAL_DROID_COUNT; i++) {
            spawnDroid();
        }

        droidSpawnInterval = setInterval(() => {
            const targetPopulation = getDynamicDroidPopulationTarget();
            if (droids.length < targetPopulation) {
                spawnDroid();
            }
        }, DROID_SPAWN_INTERVAL_MS);
    }

    // Calculate volume based on distance between player and droid
    function calculateVolume(distance) {
        const maxDistance = Math.sqrt(mapWidth * mapWidth + mapHeight * mapHeight);
        const volume = 1 - (distance / maxDistance);
        return Math.max(0, Math.min(1, volume)); // Ensure volume is between 0 and 1
    }

    // Calculate pan (stereo effect) based on droid's position relative to player
    function calculatePan(droidPosition, playerPosition, panBoost = 1) {
        const rawPan = ((droidPosition.x - playerPosition.x) / (mapWidth / 2)) * panBoost;
        if (Math.abs(rawPan) < 0.05) {
            return 0;
        }

        // Keep side positioning obvious: left sounds left, right sounds right.
        const minAudiblePan = 0.35;
        const signedPan = Math.sign(rawPan) * Math.max(minAudiblePan, Math.abs(rawPan));
        return Math.max(-1, Math.min(1, signedPan));
    }

    // Play sound from the droid's position with stereo effect
    function playSoundFromDroid(droid, sound) {
        const distance = Math.sqrt(
            Math.pow(droid.position.x - playerPosition.x, 2) +
            Math.pow(droid.position.y - playerPosition.y, 2)
        );
        const isBlaster = sound === blasterFireSound;
        const isSpawnCue = sound === droidSpawnSound;
        const pan = calculatePan(droid.position, playerPosition, isBlaster ? 2.2 : 1.4);
        const id = sound.play();
        const baseVolume = calculateVolume(distance);
        const finalVolume = isBlaster ? Math.max(0.45, baseVolume) : (isSpawnCue ? Math.max(0.4, baseVolume) : baseVolume);
        sound.volume(finalVolume, id);
        // Spatial positioning provides a stronger left/right placement cue than stereo alone.
        sound.pos(pan * 3, 0, -0.5, id);
        sound.stereo(pan, id); // Set stereo panning
    }

    // Handle droid movement and actions
    function moveDroid(droid) {
        // Move droid towards the player
        const deltaX = playerPosition.x - droid.position.x;
        const deltaY = playerPosition.y - droid.position.y;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            droid.position.x += Math.sign(deltaX);
        } else {
            droid.position.y += Math.sign(deltaY);
        }

        // Check if droid falls into the abyss
        if (droid.position.x < 0 || droid.position.x > mapWidth || droid.position.y < 0 || droid.position.y > mapHeight) {
            clearInterval(droid.fireInterval);
            droids = droids.filter(d => d !== droid);
            const deathSound = droid.isBoss ? droidDeath2Sound : droidDeath1Sound;
            playSoundFromDroid(droid, deathSound); // Play droid death sound
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

                    // Automatically land after 2 seconds
                    setTimeout(() => {
                        playerPosition.x = Math.min(mapWidth, playerPosition.x + jumpDistance); // Move the player based on jump distance
                        jumpDistance = 0; // Reset the jump distance counter
                        isJumping = false;
                        playSound(landSound); // Play landing sound
                    }, 2000); // 2-second air time
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
                    // Play saber swing sound
                    const swingSound = lightsaberSwingSounds[saberSwingIndex % lightsaberSwingSounds.length];
                    saberSwingIndex += 1;
                    lastSaberSwingTime = now;
                    playSound(swingSound);

                    droids.forEach(droid => {
                        // Make sure droids are hittable within 5 steps distance
                        if (Math.abs(droid.position.x - playerPosition.x) <= 5 && Math.abs(droid.position.y - playerPosition.y) <= 5) {
                            // Play saber hit sound and then check if the droid is hit
                            const hitSound = saberHitSounds[Math.floor(Math.random() * saberHitSounds.length)];
                            playSound(hitSound); // Play saber hit sound first
                            setTimeout(() => {
                                droid.health -= 1;
                                droidHit = true;
                                if (droid.health === 1) {
                                    playSoundFromDroid(droid, droidHitSound); // Play a droid hit cue when health drops to 1
                                }
                                if (droid.health <= 0) {
                                    const deathSound = droid.isBoss ? droidDeath2Sound : droidDeath1Sound;
                                    playSoundFromDroid(droid, deathSound); // Droid death sound when health is 0
                                    clearInterval(droid.fireInterval);
                                    totalDroidsKilled += 1;
                                    droids = droids.filter(d => d !== droid); // Remove droid from the game
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

    // Start the game loop and set up controls
    update();
    startSpawningDroids(); // Start droid spawning
    document.addEventListener('keydown', handlePlayerActions);
    document.addEventListener('keyup', handlePlayerActionsKeyUp);
});
