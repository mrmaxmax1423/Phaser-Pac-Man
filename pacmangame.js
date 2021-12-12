var game = new Phaser.Game(448, 496, Phaser.AUTO, "game");

var PacmanGame = function (game) {    
    var pad1;
    
    this.map = null;
    this.layer = null;
    
    this.numDots = 0;
    this.TOTAL_DOTS = 0;
    this.score = 0;
    this.scoreText = null;
    
    this.pacman = null; 
    this.green = null;
    this.yellow = null;
    this.purple = null;
    this.blue = null;
    this.isblueOut = false;
    this.ispurpleOut = false;
    this.isgreenOut = false;
    this.isyellowOut = false;
    this.ghosts = [];

    this.safetile = 14;
    this.gridsize = 16;       
    this.threshold = 3;
    
    this.SPECIAL_TILES = [
        { x: 12, y: 11 },
        { x: 15, y: 11 },
        { x: 12, y: 23 },
        { x: 15, y: 23 }
    ];
    
    this.TIME_MODES = [
        {
            mode: "scatter",
            time: 0
        },
        {
            mode: "chase",
            time: 2000000
        },

    ];
    this.changeModeTimer = 0;
    this.remainingTime = 0;
    this.currentMode = 0;
    this.isPaused = false;
    this.FRIGHTENED_MODE_TIME = 5000;
    

    
    this.KEY_COOLING_DOWN_TIME = 250;
    this.lastKeyPressed = 0;
    
    this.game = game;
};

PacmanGame.prototype = {

    init: function () {
        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.pageAlignHorizontally = true;
        this.scale.pageAlignVertically = true;
        Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);
        this.physics.startSystem(Phaser.Physics.ARCADE);
    },

    //load all sprites
    preload: function () {
        this.load.image('dot', 'assets/dot.png');
        this.load.image("pill", "assets/pill16.png");
        this.load.image('tiles', 'assets/pacman-tiles.png');
        this.load.spritesheet('pacman', 'assets/pacman.png', 32, 32);
        this.load.spritesheet("ghosts", "assets/ghosts32.png", 32, 32);
        this.load.tilemap('map', 'assets/pacman-map.json', null, Phaser.Tilemap.TILED_JSON);
    },

    create: function () {
        game.input.gamepad.start();

    // To listen to buttons from a specific pad listen directly on that pad game.input.gamepad.padX, where X = pad 1-4
        pad1 = game.input.gamepad.pad1;


        this.map = this.add.tilemap('map');
        this.map.addTilesetImage('pacman-tiles', 'tiles');

        this.layer = this.map.createLayer('Pacman');

        this.dots = this.add.physicsGroup();
        this.numDots = this.map.createFromTiles(7, this.safetile, 'dot', this.layer, this.dots);
        this.TOTAL_DOTS = this.numDots;
        
        this.pills = this.add.physicsGroup();
        this.numPills = this.map.createFromTiles(40, this.safetile, "pill", this.layer, this.pills);


        this.dots.setAll('x', 6, false, false, 1);
        this.dots.setAll('y', 6, false, false, 1);
        
        this.map.setCollisionByExclusion([this.safetile], true, this.layer);
		//Pacman
        this.pacman = new Pacman(this, "pacman");
        //Score
        this.scoreText = game.add.text(8, 272, "Score: " + this.score, { fontSize: "16px", fill: "#fff" });
        
        this.cursors = this.input.keyboard.createCursorKeys();

        this.changeModeTimer = this.time.time + this.TIME_MODES[this.currentMode].time;
        
        // Ghosts
        this.blue = new Ghost(this, "ghosts", "blue", {x:13, y:11}, Phaser.RIGHT);
        this.purple = new Ghost(this, "ghosts", "purple", {x:15, y:14}, Phaser.LEFT);
        this.yellow = new Ghost(this, "ghosts", "yellow", {x:12, y:14}, Phaser.RIGHT);
        this.green = new Ghost(this, "ghosts", "green", {x:17, y:14}, Phaser.LEFT);
        this.ghosts.push(this.yellow, this.purple, this.green, this.blue);
        
        //purple leaves spawn
    },

    checkKeys: function () {
        this.pacman.checkKeys(this.cursors);        
    },

    checkPad: function () {
        this.pacman.checkPad(pad1);        
    },
    
    checkMouse: function() {
        if (this.input.mousePointer.isDown) {            
            var x = this.game.math.snapToFloor(Math.floor(this.input.x), this.gridsize) / this.gridsize;
            var y = this.game.math.snapToFloor(Math.floor(this.input.y), this.gridsize) / this.gridsize;
            console.log(x, y);
        }
    },
    
    pacAttack: function(pacman, ghost) {
        if (this.isPaused) {
            this[ghost.name].mode = this[ghost.name].RETURNING_HOME;
            this[ghost.name].ghostDestination = new Phaser.Point(14 * this.gridsize, 14 * this.gridsize);
            this[ghost.name].resetSafeTiles();
            this.score += 10;
        } else {
            this.killPacman();
        }
    },
    
    getCurrentMode: function() {
                return "chase";


    },
    
    gimeMeExitOrder: function(ghost) {
        this.game.time.events.add(Math.random() * 3000, this.sendExitOrder, this, ghost);
    },
        
    killPacman: function() {
        this.pacman.isDead = true;
        this.stopGhosts();
    },
    
    stopGhosts: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].mode = this.ghosts[i].STOP;
        }
    },

    


    update: function () {
        this.scoreText.text = "Score: " + this.score;

        
        if (!this.pacman.isDead) {
            for (var i=0; i<this.ghosts.length; i++) {
                //if ghost isnt going back to spawn
                if (this.ghosts[i].mode !== this.ghosts[i].RETURNING_HOME) {
                    //if pacman touches a ghost, call pacAttack
                    this.physics.arcade.overlap(this.pacman.sprite, this.ghosts[i].ghost, this.pacAttack, null, this);
                }
            }
            
            if (this.score > 20 && !this.ispurpleOut) {
                this.ispurpleOut = true;
                this.sendExitOrder(this.purple);
            }
            if (this.score > 50 && !this.isgreenOut) {
                this.isgreenOut = true;
                this.sendExitOrder(this.green);
            }
            
            if (this.score > 100 && !this.isyellowOut) {
                this.isyellowOut = true;
                this.sendExitOrder(this.yellow);
            }
            
            if (this.changeModeTimer !== -1 && !this.isPaused && this.changeModeTimer < this.time.time) {
                this.currentMode++;
                this.changeModeTimer = this.time.time + this.TIME_MODES[this.currentMode].time;
                if (this.TIME_MODES[this.currentMode].mode === "chase") {
                    this.sendAttackOrder();
                } else {
                    this.sendAttackOrder();
                }
                console.log("new mode:", this.TIME_MODES[this.currentMode].mode, this.TIME_MODES[this.currentMode].time);
            }
            if (this.isPaused && this.changeModeTimer < this.time.time) {
                this.changeModeTimer = this.time.time + this.remainingTime;
                this.isPaused = false;
                if (this.TIME_MODES[this.currentMode].mode === "chase") {
                    this.sendAttackOrder();
                } else {
                    this.sendAttackOrder();
                }
                console.log("new mode:", this.TIME_MODES[this.currentMode].mode, this.TIME_MODES[this.currentMode].time);
            }
        }
        
        this.pacman.update();
		this.updateGhosts();
        
        this.checkKeys();
        this.checkMouse();
    //this.checkPad();

    },
    
    enterFrightenedMode: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].enterFrightenedMode();
        }
        if (!this.isPaused) {
            this.remainingTime = this.changeModeTimer - this.time.time;
        }
        this.changeModeTimer = this.time.time + this.FRIGHTENED_MODE_TIME;
        this.isPaused = true;
        console.log(this.remainingTime);
    },
    
    isSpecialTile: function(tile) {
        for (var q=0; q<this.SPECIAL_TILES.length; q++) {
            if (tile.x === this.SPECIAL_TILES[q].x && tile.y === this.SPECIAL_TILES[q].y) {
                return true;
            } 
        }
        return false;
    },
    
    updateGhosts: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].update();
        }
    },
    
    sendAttackOrder: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].attack();
        }
    },
    
    sendExitOrder: function(ghost) {
        ghost.mode = this.yellow.EXIT_HOME;
    },
};

game.state.add('Game', PacmanGame, true);