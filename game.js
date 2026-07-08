document.addEventListener('DOMContentLoaded', () => {
    // Game variables
    let playerHealth = 100;
    const mapWidth = 100;
    const mapHeight = 100;
    let playerPosition = { x: 0, y: 0 }; // Player starts at (0, 0)
    let isJumping = false;
    let isBlocking = false;
    let isSaberDrawn = false;
    let droids = [{ id: 0, position: { x: 7, y: Math.floor(Math.random() * mapHeight) }, health: 2 }]; // First droid starts at (7, random y)
    let gameRunning = true;
    let isMovingLeft = false;
    let isMovingRight = false;
    let isPlayerFootstepPlaying = false;
    let footstepInterval;
    let droidSpawnInterval;
    let droidCount = 1; // Start with 1 droid
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
    const footstepsSounds = [new Audio('footsteps.mp3'), new Audio('footsteps2.mp3')]; // Player footsteps
    const droidFootstepsSounds = [new Audio('footsteps.mp3'), new Audio('footsteps2.mp3')]; // Droid footsteps
    const lightsaberSwingSounds = [
        new Audio('saberswing1.mp3'),
        new Audio('saberswing2.mp3'),
        new Audio('saberswing3.mp3')
    ];
    const saberHitSounds = [new Audio('saberhit1.mp3'), new Audio('saberhit2.mp3')]; // Lightsaber hit sounds
    const droidHitSound = new Audio('Ouch!.mp3'); // Play "Ouch!" when droid is hit
    const droidDeathSound = new Audio('droid death.mp3'); // Play "droid death.mp3" when droid dies
    const saberDrawSound = new Audio('drawsaber.mp3');
    const saberLoopSound = new Audio('saberloop.mp3');
    const saberBlockSounds = [
        new Audio('saberblock1.mp3'),
        new Audio('saberblock2.mp3')
    ];
    const blasterFireSound = new Audio('blaster.mp3');
    const playerDeathSound = new Audio('player_death.mp3');
    const jumpSound = new Audio('jump.mp3'); // New jump sound
    const landSound = new Audio('land.mp3'); // New landing sound

    const healthAnnouncement = document.getElementById('health-announcement');

    // Update health display
    function updateHealthDisplay() {
        healthAnnouncement.textContent = `Health: ${playerHealth}`;
    }

    // Display the "You died!" message, stop saber loop, and disable all controls when player health reaches 0
    function gameOver() {
        gameRunning = false;

        // Stop the lightsaber loop if it's still playing
        if (isSaberDrawn) {
            saberLoopSound.pause();
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

    // Draw/Sheathe lightsaber with key "1"
    document.addEventListener('keydown', (event) => {
        if (!gameRunning) return; // Stop actions when the game is over

        if (event.key === '1') {
            if (!isSaberDrawn) {
                saberDrawSound.play();
                saberLoopSound.loop = true;
                saberLoopSound.play();
                isSaberDrawn = true;
            } else {
                saberLoopSound.pause();
                isSaberDrawn = false;
            }
        }
    });

    // Function to play continuous footstep sounds for the player (alternating between footsteps.mp3 and footsteps2.mp3)
    function playPlayerFootsteps() {
        // Check if the player is at coordinates (0,0) or (100,100), and don't play footsteps if true
        if ((playerPosition.x === 0 && playerPosition.y === 0) || 
            (playerPosition.x === 100 && playerPosition.y === 100)) {
            stopPlayerFootsteps(); // Ensure no footstep sound is playing
            return;
        }

        if (!isPlayerFootstepPlaying && gameRunning) {
            isPlayerFootstepPlaying = true;
            let footstepIndex = 0;
            footstepInterval = setInterval(() => {
                const sound = footstepsSounds[footstepIndex % 2]; // Alternate between footsteps.mp3 and footsteps2.mp3
                sound.currentTime = 0; // Reset sound
                sound.play();
                footstepIndex++;
            }, 200); // Play footsteps rapidly to simulate continuous walking/running
        }
    }

    // Stop player footsteps when keys are released
    function stopPlayerFootsteps() {
        if (isPlayerFootstepPlaying) {
            clearInterval(footstepInterval);
            isPlayerFootstepPlaying = false;
        }
    }

    // Function to play continuous footstep sounds for droids (alternating between footsteps.mp3 and footsteps2.mp3)
    function playDroidFootsteps(droidId) {
        let droidFootstepIndex = 0;
        const droidFootstepInterval = setInterval(() => {
            if (!gameRunning) return;
            const sound = droidFootstepsSounds[droidFootstepIndex % 2]; // Alternate between footsteps.mp3 and footsteps2.mp3
            playSoundFromDroid(droids[droidId], sound);
            droidFootstepIndex++;
        }, 300); // Droids walk slower than the player
        droids[droidId].footstepInterval = droidFootstepInterval; // Save the interval for clearing later if needed
    }

    // Function to prevent droids from piling up and ensure unique random positions
    function getRandomPosition() {
        let position;
        let isTooClose;
        do {
            position = { x: Math.random() * 10 + 90, y: Math.random() * mapHeight }; // Always spawn droids from the right (x > 90)
            isTooClose = droids.some(droid => Math.abs(droid.position.x - position.x) < 15 && Math.abs(droid.position.y - position.y) < 15); 
            // Ensure new droids don't spawn too close to existing ones
        } while (isTooClose);
        return position;
    }

    // Initialize droids - Spawn them at random positions across the map
    function spawnDroid() {
        const droid = {
            id: droids.length,
            position: getRandomPosition(), // Random position on the right side of the map
            health: 2
        };
        droids.push(droid);
        playDroidFootsteps(droid.id); // Start droid footsteps
        droidFireAtRandom(droid); // Make this droid fire at random intervals
    }

    // Introduce more droids after each wave
    function introduceNextWave() {
        droidCount++; // Increase the droid count
        for (let i = 0; i < droidCount; i++) {
            spawnDroid(); // Spawn the next wave of droids
        }
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
                        playerDeathSound.play();
                        gameOver(); // End game when health reaches 0
                    }
                } else {
                    const blockSound = saberBlockSounds[Math.floor(Math.random() * saberBlockSounds.length)];
                    blockSound.play(); // Play blocking sound
                }

                const blasterClone = blasterFireSound.cloneNode(); // Clone to avoid audio overlap
                playSoundFromDroid(droid, blasterClone); // Play independent blaster fire for each droid with panning
            }
        }, fireInterval);
    }

    // Continuous droid spawning after the first one at random intervals and random positions
    function startSpawningDroids() {
        spawnDroid(); // Spawn the first droid immediately
        droidSpawnInterval = setInterval(() => {
            spawnDroid(); // Spawn droids at regular intervals
        }, 10000); // Every 10 seconds, spawn new droids
    }

    // Calculate volume based on distance between player and droid
    function calculateVolume(distance) {
        const maxDistance = Math.sqrt(mapWidth * mapWidth + mapHeight * mapHeight);
        const volume = 1 - (distance / maxDistance);
        return Math.max(0, Math.min(1, volume)); // Ensure volume is between 0 and 1
    }

    // Calculate pan (stereo effect) based on droid's position relative to player
    function calculatePan(droidPosition, playerPosition) {
        const pan = (droidPosition.x - playerPosition.x) / mapWidth;
        return Math.max(-1, Math.min(1, pan)); // Ensure pan is between -1 (left) and 1 (right)
    }

    // Play sound from the droid's position with stereo effect
    function playSoundFromDroid(droid, sound) {
        const distance = Math.sqrt(
            Math.pow(droid.position.x - playerPosition.x, 2) +
            Math.pow(droid.position.y - playerPosition.y, 2)
        );
        sound.volume = calculateVolume(distance);

        const pan = calculatePan(droid.position, playerPosition);
        sound.pan = pan; // Set stereo panning

        sound.play();
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
            droids = droids.filter(d => d !== droid);
            playSoundFromDroid(droid, droidDeathSound); // Play droid death sound
            clearInterval(droid.footstepInterval); // Stop the footstep sounds for the droid
        }
    }

    // Handle player actions and interactions
    function handlePlayerActions(event) {
        if (!gameRunning) return; // Actions are only possible if the game is running and the player isn't dead
        if (!isSaberDrawn) return; // Actions are only possible if the saber is drawn

        switch (event.key) {
            case 'ArrowLeft':
                isMovingLeft = true;
                if (!isJumping) {
                    playerPosition.x = Math.max(0, playerPosition.x - 1); // Ensure player doesn't go out of bounds
                    playPlayerFootsteps(); // Play footstep when moving left
                }
                break;
            case 'ArrowRight':
                if (!isJumping) {
                    playerPosition.x = Math.min(mapWidth, playerPosition.x + 1); // Ensure player doesn't go out of bounds
                    playPlayerFootsteps(); // Play footstep when moving right
                } else {
                    // Accumulate distance moved while jumping (but no actual movement)
                    jumpDistance++;
                }
                break;
            case 'ArrowUp': // Use arrow up for jumping only
                if (!isJumping) {
                    isJumping = true;
                    jumpDistance = 0; // Reset the jump distance counter
                    jumpSound.play();

                    // Automatically land after 2 seconds
                    setTimeout(() => {
                        playerPosition.x = Math.min(mapWidth, playerPosition.x + jumpDistance); // Move the player based on jump distance
                        jumpDistance = 0; // Reset the jump distance counter
                        isJumping = false;
                        landSound.play(); // Play landing sound
                    }, 2000); // 2-second air time
                }
                break;
            case ' ': // Spacebar for lightsaber swing
                if (event.repeat) {
                    isBlocking = true;
                    saberLoopSound.play(); // Continue saber loop sound while blocking
                } else {
                    isBlocking = false;
                    let droidHit = false;
                    // Play saber swing sound
                    const swingSound = lightsaberSwingSounds[Math.floor(Math.random() * lightsaberSwingSounds.length)];
                    swingSound.play();

                    droids.forEach(droid => {
                        // Make sure droids are hittable within 5 steps distance
                        if (Math.abs(droid.position.x - playerPosition.x) <= 5 && Math.abs(droid.position.y - playerPosition.y) <= 5) {
                            // Play saber hit sound and then check if the droid is hit
                            const hitSound = saberHitSounds[Math.floor(Math.random() * saberHitSounds.length)];
                            hitSound.play(); // Play saber hit sound first
                            setTimeout(() => {
                                droid.health -= 1;
                                droidHit = true;
                                if (droid.health === 1) {
                                    playSoundFromDroid(droid, droidHitSound); // Play "Ouch!" when health drops to 1
                                }
                                if (droid.health <= 0) {
                                    playSoundFromDroid(droid, droidDeathSound); // Droid death sound when health is 0
                                    droids = droids.filter(d => d !== droid); // Remove droid from the game
                                    clearInterval(droid.footstepInterval); // Stop the droid's footsteps
                                    if (droids.length === 0 && gameRunning) {
                                        introduceNextWave(); // Introduce the next wave when all droids are killed
                                    }
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
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            stopPlayerFootsteps();
        }
    }

    // Droid movement and spawning
    function update() {
        if (!gameRunning) return;

        droids.forEach(droid => moveDroid(droid));

        // Check if player falls into the abyss
        if (playerPosition.y < 0 || playerPosition.y > mapHeight) {
            playerDeathSound.play();
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
