kaboom({
    global: true,
    fullscreen: true,
    scale: 2,
    debug: true,
    clearColor: [0, 0, 0.5, 1],
});

scene("game", () => {
    // Add gravity
    setGravity(1600);

    // Constants
    const MOVE_SPEED = 200;
    const BASE_JUMP_FORCE = 600;
    const BASE_ENEMY_SPEED = 120;
    const SCREEN_MOVE_STEP = 200;
    const SECTION_HEIGHT = height();
    let currentLevel = 0;
    let isMovingUp = false;
    let allEnemiesDefeated = false;

    // Progressive difficulty parameters
    const ENEMY_SPEED_INCREASE = 10; // Speed increase per level
    const PLATFORM_WIDTH_DECREASE = 2; // How much to decrease platform width per level
    const MIN_PLATFORM_WIDTH = 60; // Minimum platform width
    const GAP_INCREASE_PER_LEVEL = 5; // How much to increase gaps between platforms
    const MAX_GAP_INCREASE = 100; // Maximum additional gap
    const BASE_PLATFORM_WIDTH = 80; // Starting platform width

    // Colors
    const ENEMY_COLOR = rgb(255, 0, 0);
    const COIN_COLOR = rgb(255, 255, 0);
    const PLAYER_COLOR = rgb(0, 128, 255);
    const PLATFORM_COLOR = rgb(128, 77, 51);
    const FLOOR_COLOR = rgb(77, 77, 77);
    const SPECIAL_PLATFORM_COLOR = rgb(100, 100, 150);

    // Add lives system with smaller hearts
    let lives = 3;
    const heartEmoji = "♥"; // Changed from ❤️ to ♥ for smaller size
    
    // Display lives with smaller font size and adjusted position
    const livesLabel = add([
        text(heartEmoji.repeat(lives), {
            size: 16,
            font: 'arial',
        }),
        pos(24, 50),
        fixed(),
        { value: lives },
        color(1, 0, 0), // Using color component to ensure hearts are red
    ]);

    // Add player with invincibility frames
    const player = add([
        rect(20, 20),
        pos(40, height() - 80),
        color(PLAYER_COLOR),
        area(),
        body(),
        "player",
        {
            isInvulnerable: false,
            invulnerableTime: 1.5, // seconds of invulnerability after hit
        }
    ]);

    // Function to make player flash when hit
    function makePlayerInvulnerable() {
        player.isInvulnerable = true;
        
        // Flash effect
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            player.color = flashCount % 2 === 0 ? rgb(255, 255, 255) : PLAYER_COLOR;
            flashCount++;
        }, 100);

        // Reset after invulnerability period
        wait(player.invulnerableTime, () => {
            player.isInvulnerable = false;
            player.color = PLAYER_COLOR;
            clearInterval(flashInterval);
        });
    }

    // Modified damage function to update smaller hearts
    function damagePlayer() {
        if (!player.isInvulnerable) {
            lives--;
            livesLabel.text = heartEmoji.repeat(lives);
            
            if (lives <= 0) {
                go("lose", score);
                return;
            }

            makePlayerInvulnerable();
            
            // Knock the player back and up a bit
            player.jump(BASE_JUMP_FORCE * 0.5);
            const knockbackDirection = player.pos.x < width() / 2 ? 1 : -1;
            player.move(knockbackDirection * 200, 0);
        }
    }

    // Platform layout for each section
    function createPlatformLayout(baseY) {
        return [
            // Left side platforms
            { x: 50, y: baseY - 120, w: 80 },
            { x: 180, y: baseY - 180, w: 80 },
            { x: 310, y: baseY - 240, w: 80 },
            
            // Right side platforms
            { x: width() - 130, y: baseY - 120, w: 80 },
            { x: width() - 260, y: baseY - 180, w: 80 },
            { x: width() - 390, y: baseY - 240, w: 80 },
            
            // Middle platforms
            { x: width()/2 - 40, y: baseY - 200, w: 80 },
            { x: width()/2 - 150, y: baseY - 280, w: 80 },
            { x: width()/2 + 70, y: baseY - 280, w: 80 },
        ];
    }

    // Function to add a platform
    function addPlatform(x, y, width, isSpecial = false) {
        try {
            return add([
                rect(width, 20),
                pos(x, y),
                color(isSpecial ? SPECIAL_PLATFORM_COLOR : PLATFORM_COLOR),
                area(),
                body({ isStatic: true }),
                "platform"
            ]);
        } catch (error) {
            console.error("Error adding platform:", error);
        }
    }

    // Function to add a coin
    function addCoin(x, y) {
        const coinValue = 10 + (currentLevel * 5); // Coins worth more in higher levels
        return add([
            circle(8),
            pos(x, y),
            color(COIN_COLOR),
            area(),
            "coin",
            { value: coinValue }
        ]);
    }

    // Function to add an enemy
    function addEnemy(x, y, platformWidth = 200) {
        try {
            const enemy = add([
                circle(10),
                pos(x, y - 20),
                color(ENEMY_COLOR),
                area(),
                body({ isStatic: true }),
                "enemy",
                {
                    moveSpeed: BASE_ENEMY_SPEED + ENEMY_SPEED_INCREASE * currentLevel,
                    startX: x,
                    endX: x + platformWidth - 20,
                    direction: 1
                }
            ]);
            return enemy;
        } catch (error) {
            console.error("Error adding enemy:", error);
        }
    }

    // Modified floor creation
    function addFloorWithGaps() {
        try {
        // First section
        add([
            rect(200, 40),
            pos(0, height() - 40),
            color(FLOOR_COLOR),
            area(),
            body({ isStatic: true }),
                "floor",
            "platform"
        ]);

        // Middle section
        add([
            rect(200, 40),
            pos(300, height() - 40),
            color(FLOOR_COLOR),
            area(),
            body({ isStatic: true }),
            "floor",
            "platform"
        ]);

        // End section
        add([
            rect(200, 40),
            pos(width() - 200, height() - 40),
            color(FLOOR_COLOR),
            area(),
            body({ isStatic: true }),
            "floor",
            "platform"
        ]);
        } catch (error) {
            console.error("Error adding floor:", error);
        }
    }

    // Function to check if all ground enemies are defeated
    function areGroundEnemiesDefeated() {
        try {
        const groundEnemies = get("enemy").filter(e => {
            return Math.abs(e.pos.y - (height() - 60)) < 50;
        });
        return groundEnemies.length === 0;
        } catch (error) {
            console.error("Error checking enemies:", error);
            return false;
        }
    }

    // Function to check if current section is cleared
    function isSectionCleared() {
        try {
            const currentEnemies = get("enemy");
            return currentEnemies.length === 0;
        } catch (error) {
            console.error("Error checking section:", error);
            return false;
        }
    }

    // Function to generate next section
    function generateNextSection() {
        try {
            // Calculate progressive platform width (minimum 60)
            const platformWidth = Math.max(BASE_PLATFORM_WIDTH - (PLATFORM_WIDTH_DECREASE * currentLevel), MIN_PLATFORM_WIDTH);
            
            // Calculate progressive gap increase (maximum 100)
            const gapIncrease = Math.min(GAP_INCREASE_PER_LEVEL * currentLevel, MAX_GAP_INCREASE);
            
            // Add platforms with progressive spacing
            addPlatform(50, height() - 120, platformWidth);
            addPlatform(180 + gapIncrease, height() - 180, platformWidth);
            addPlatform(310 + gapIncrease, height() - 240, platformWidth);
            addPlatform(width() - 130, height() - 120, platformWidth);
            addPlatform(width() - 260 - gapIncrease, height() - 180, platformWidth);
            addPlatform(width()/2 - 40, height() - 200, platformWidth);

            // Add more enemies as level increases (max 6)
            const numEnemies = Math.min(3 + Math.floor(currentLevel / 2), 6);
            for(let i = 0; i < numEnemies; i++) {
                const xPos = (width() / (numEnemies + 1)) * (i + 1);
                addEnemy(xPos - 75, height() - 40, platformWidth);
            }

            // Add coins with progressive value
            addCoin(150, height() - 150);
            addCoin(width() - 150, height() - 200);
            addCoin(width()/2, height() - 250);
            
            // Add bonus coins in higher levels
            if (currentLevel > 2) {
                addCoin(width()/4, height() - 300);
                addCoin(width()*3/4, height() - 300);
            }
        } catch (error) {
            console.error("Error generating section:", error);
        }
    }

    // Function to move screen up
    function moveScreenUp() {
        if (!isMovingUp) {
            try {
                isMovingUp = true;
                
                // Move existing platforms up
                every("platform", (p) => {
                    if (!p.is("floor")) {
                        p.pos.y += SCREEN_MOVE_STEP;
                    }
                });
                
                // Move coins up
                every("coin", (c) => {
                    c.pos.y += SCREEN_MOVE_STEP;
                });
                
                // Move enemies up
                every("enemy", (e) => {
                    e.pos.y += SCREEN_MOVE_STEP;
                });
                
                // Generate new content
                generateNextSection();
                
                // Update score and level
                currentLevel++;
                score += 50;
                scoreLabel.text = score;
                
                // Reset moving flag
                wait(0.5, () => {
                    isMovingUp = false;
                });
                
            } catch (error) {
                console.error("Error moving screen:", error);
                isMovingUp = false;
            }
        }
    }

    // Score
    let score = 0;
    const scoreLabel = add([
        text(score, {
            size: 24, // Keeping score size larger
        }),
        pos(24, 24),
        fixed(),
    ]);

    // Enemy movement
    onUpdate("enemy", (enemy) => {
        enemy.pos.x += enemy.moveSpeed * enemy.direction * dt();
        
        if (enemy.pos.x <= enemy.startX) {
            enemy.direction = 1;
        }
        if (enemy.pos.x >= enemy.endX) {
            enemy.direction = -1;
        }
    });

    // Player movement
    onKeyDown("left", () => {
        player.move(-MOVE_SPEED, 0);
    });

    onKeyDown("right", () => {
        player.move(MOVE_SPEED, 0);
    });

    onKeyPress("space", () => {
        if (player.isGrounded()) {
            player.jump(BASE_JUMP_FORCE);
        }
    });

    // Double jump ability (limited to once per jump)
    let canDoubleJump = true;
    onKeyPress("up", () => {
        if (!player.isGrounded() && canDoubleJump) {
            player.jump(BASE_JUMP_FORCE * 0.8);
            canDoubleJump = false;
        }
    });

    // Reset double jump ability when grounded
    player.onGround(() => {
        canDoubleJump = true;
    });

    // Coin collection
    player.onCollide("coin", (coin) => {
        destroy(coin);
        score += coin.value;
        scoreLabel.text = score;
    });

    // Enemy collision
    player.onCollide("enemy", (enemy) => {
        if (player.pos.y + player.height <= enemy.pos.y + 10) {
            // Player jumped on enemy
            destroy(enemy);
            score += 20;
            scoreLabel.text = score;
            player.jump(BASE_JUMP_FORCE * 0.8);
        } else if (!player.isInvulnerable) {
            // Player touched enemy from side or below
            damagePlayer();
        }
    });

    // Update the initial game setup
    try {
        // Reset game state
        currentLevel = 0;
        isMovingUp = false;
        allEnemiesDefeated = false;
        
        // Add initial floor
        addFloorWithGaps();
        
        // Add initial platforms and enemies
        generateNextSection();
        
        // Update score display
        scoreLabel.text = score;
        
    } catch (error) {
        console.error("Error in game scene:", error);
    }

    // Win condition
    onKeyPress("down", () => {
        if (score >= 1000 || currentLevel >= 10) {
            go("win", score);
        }
    });

    // Add continuous check for section completion
    onUpdate(() => {
        if (!isMovingUp && isSectionCleared()) {
            moveScreenUp();
        }
    });

    // Player update logic
    player.onUpdate(() => {
        // Handle fall death
        if (player.pos.y > height()) {
            damagePlayer();
            if (lives > 0) {
                player.pos = vec2(40, height() - 80);
                player.vel = vec2(0, 0);
            }
        }
    });
});

scene("lose", (score) => {
    add([
        text("Game Over!\nScore: " + score),
        pos(width()/2, height()/2),
        anchor("center"),
    ]);
    
    add([
        text("Press SPACE to restart"),
        pos(width()/2, height()/2 + 50),
        anchor("center"),
    ]);

    onKeyPress("space", () => {
        go("game");
    });
});

scene("win", (score) => {
    add([
        text("You Win!\nScore: " + score),
        pos(width()/2, height()/2),
        anchor("center"),
    ]);
    
    add([
        text("Press SPACE to play again"),
        pos(width()/2, height()/2 + 50),
        anchor("center"),
    ]);

    onKeyPress("space", () => {
        go("game");
    });
});

go("game");