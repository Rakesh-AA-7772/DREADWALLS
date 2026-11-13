(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const dashboard = $('dashboard');
  const gameScreen = $('gameScreen');
  const aboutPanel = $('aboutPanel');
  const exitModal = $('exitModal');
  const pauseModal = $('pauseModal');
  const deathScreen = $('deathScreen');
  const endingScreen = $('endingScreen');
  const playButton = $('playButton');
  const levelSelect = $('levelSelect');
  const loadingScreen = $('loadingScreen');
  const loadingTitle = $('loadingTitle');
  const fakeDoorToast = $('fakeDoorToast');
  const objectiveStatus = $('objectiveStatus');
  const aboutButton = $('aboutButton');
  const closeAbout = $('closeAbout');
  const historyList = $('historyList');
  const clearHistoryButton = $('clearHistory');
  const introMusic = $('introMusic');
  const gameMusic = $('gameMusic');
  const monsterSound = $('monsterSound');
  const footstepsAudio = $('footstepsAudio');
  const doorSound = $('doorSound');
  const overSound = $('overSound');
  const randomSound = $('randomSound');
  const joystick = $('joystick');
  const stick = $('stick');
  const lookZone = $('lookZone');
  const mobileInteract = $('mobileInteract');
  const doorPrompt = $('doorPrompt');
  const objectiveLabel = $('objectiveLabel');
  const echoCountLabel = $('echoCount');
  const exitTrace = $('exitTrace');
  const torchButton = $('torchButton');
  const settingsModal = $('settingsModal');

  const HISTORY_KEY = 'dreadwalls.runHistory.v1';
  const SETTINGS_KEY = 'dreadwalls.settings.v1';
  const DEFAULT_SETTINGS = { masterVolume:.85,musicVolume:.55,effectsVolume:.8,lookSensitivity:1,graphicsQuality:'high' };
  let settings = loadSettings();
  const OPTIONAL_ECHO_COUNT = 3;
  const DIFFICULTIES = {
    easy:{id:'easy',label:'EASY',mapSize:15,monsters:false,monsterInitialDelay:Infinity,monsterBaseInterval:Infinity,monsterMinInterval:Infinity,monsterSpeed:0,stareDamage:0,closeDamage:0,echoClues:false,torchFlicker:false,anomalies:false,fakeExitCount:0,playerSpeed:3.1},
    medium:{id:'medium',label:'MEDIUM',mapSize:27,monsters:true,monsterInitialDelay:12,monsterBaseInterval:23,monsterMinInterval:15,monsterSpeed:.88,stareDamage:6,closeDamage:10,echoClues:true,torchFlicker:false,anomalies:false,fakeExitCount:0,playerSpeed:2.8},
    impossible:{id:'impossible',label:'IMPOSSIBLE',mapSize:61,monsters:true,monsterInitialDelay:8,monsterBaseInterval:17,monsterMinInterval:11,monsterSpeed:1.12,stareDamage:9,closeDamage:15,echoClues:false,torchFlicker:true,anomalies:true,fakeExitCount:2,playerSpeed:2.65}
  };
  const MOUSE_LOOK_SENSITIVITY = 0.0050;
  const MOUSE_PITCH_SENSITIVITY = 0.0040;
  const FOV = Math.PI / 3;
  const keys = Object.create(null);
  const touchMove = { x: 0, y: 0 };
  const player = { x: 1.5, y: 1.5, angle: 0, pitch: 0, speed: 2.65 };

  let map = [];
  let exitDoor={x:49.5,y:49.5,fake:false};
  let exitDoors=[exitDoor];
  let targetedDoor=null;
  let currentDifficulty=DIFFICULTIES.medium;
  let width = 0;
  let height = 0;
  let lastFrame = 0;
  let screen = 'home';
  let isPlaying = false;
  let isPaused = false;
  let pointerLocked = false;
  let hadPointerLock = false;
  let startedAt = 0;
  let elapsedSeconds = 0;
  let runRecorded = false;
  let health = 100;
  let monster = null;
  let nextMonsterAt = DIFFICULTIES.medium.monsterInitialDelay;
  let encounterCount = 0;
  let cornerWatcher = null;
  let nextCornerWatcherAt = 0;
  let nextRandomSoundAt = Infinity;
  let echoes = [];
  let echoesCollected=0;
  let loadingTimer=null, fakeDoorTimer=null;
  let torchOn=true, resumeMusicAfterPause=false;
  let anomalyUntil=0, nextAnomalyAt=48;
  let torchFlickerTimer=2, torchFlickerPower=1;
  let doorAimed = false;
  let doorImageReady = false;
  let wallImageReady = false;
  let floorImageReady = false;
  let floorTexturePixels = null;
  let floorTextureWidth = 0;
  let floorTextureHeight = 0;
  const wallTextureBuffer = document.createElement('canvas');
  const wallTextureBufferCtx = wallTextureBuffer.getContext('2d', { alpha: true });
  const floorBuffer = document.createElement('canvas');
  const floorBufferCtx = floorBuffer.getContext('2d', { alpha: true });
  let floorBufferImage = null;
  let lookPointer = null;
  let lastLookX = 0;
  let lastLookY = 0;
  let joyPointer = null;
  let endingTimer = null;
  let deathTimer = null;
  let mobile = window.matchMedia('(pointer: coarse), (max-width: 760px)').matches;

  // Optional user assets. The project still runs with procedural fallbacks.
  const wallTexture = new Image();
  wallTexture.onload = () => {
    // Downsample oversized source art once; per-frame ray strips use this small cached copy.
    const maxTextureSide = 512;
    const scale = Math.min(1, maxTextureSide / wallTexture.naturalWidth, maxTextureSide / wallTexture.naturalHeight);
    wallTextureBuffer.width = Math.max(1, Math.round(wallTexture.naturalWidth * scale));
    wallTextureBuffer.height = Math.max(1, Math.round(wallTexture.naturalHeight * scale));
    wallTextureBufferCtx.imageSmoothingEnabled = true;
    wallTextureBufferCtx.clearRect(0, 0, wallTextureBuffer.width, wallTextureBuffer.height);
    wallTextureBufferCtx.drawImage(wallTexture, 0, 0, wallTextureBuffer.width, wallTextureBuffer.height);
    wallImageReady = true;
  };
  wallTexture.onerror = () => { wallImageReady = false; };
  wallTexture.src = 'walls.png';
  const doorTexture = new Image();
  doorTexture.onload = () => { doorImageReady = true; };
  doorTexture.onerror = () => { doorImageReady = false; };
  doorTexture.src = 'door.png';
  const floorTexture = new Image();
  floorTexture.onload = () => {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = floorTexture.naturalWidth;
    textureCanvas.height = floorTexture.naturalHeight;
    const textureContext = textureCanvas.getContext('2d', { willReadFrequently: true });
    textureContext.drawImage(floorTexture, 0, 0);
    const textureImage = textureContext.getImageData(0, 0, textureCanvas.width, textureCanvas.height);
    floorTexturePixels = textureImage.data;
    floorTextureWidth = textureCanvas.width;
    floorTextureHeight = textureCanvas.height;
    floorImageReady = floorTextureWidth > 0 && floorTextureHeight > 0;
  };
  floorTexture.onerror = () => { floorImageReady = false; };
  floorTexture.src = 'floor.jpg';

  function resize() {
    const qualityScale=settings.graphicsQuality==='low'?.82:(settings.graphicsQuality==='medium'?.94:1);
    const dpr=Math.min(window.devicePixelRatio||1,(mobile?1.15:1.5)*qualityScale);
    width=window.innerWidth;height=window.innerHeight;
    canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const floorResolutionDivisor=settings.graphicsQuality==='low'?5:(settings.graphicsQuality==='medium'?4:(mobile?4:3));
    floorBuffer.width = Math.max(1, Math.ceil(width / floorResolutionDivisor));
    floorBuffer.height = Math.max(1, Math.ceil(height / floorResolutionDivisor));
    floorBufferImage = floorBufferCtx.createImageData(floorBuffer.width, floorBuffer.height);
  }
  window.addEventListener('resize', () => {
    mobile = window.matchMedia('(pointer: coarse), (max-width: 760px)').matches;
    resize();
  });
  resize();

  function loadSettings() {
    try {
      const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
      return {masterVolume:Number.isFinite(saved.masterVolume)?Math.max(0,Math.min(1,saved.masterVolume)):DEFAULT_SETTINGS.masterVolume,
        musicVolume:Number.isFinite(saved.musicVolume)?Math.max(0,Math.min(1,saved.musicVolume)):DEFAULT_SETTINGS.musicVolume,
        effectsVolume:Number.isFinite(saved.effectsVolume)?Math.max(0,Math.min(1,saved.effectsVolume)):DEFAULT_SETTINGS.effectsVolume,
        lookSensitivity:Number.isFinite(saved.lookSensitivity)?Math.max(.5,Math.min(1.8,saved.lookSensitivity)):DEFAULT_SETTINGS.lookSensitivity,
        graphicsQuality:['high','medium','low'].includes(saved.graphicsQuality)?saved.graphicsQuality:DEFAULT_SETTINGS.graphicsQuality};
    } catch (_) { return {...DEFAULT_SETTINGS}; }
  }
  function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch(_){}}
  function updateSetting(key,value){settings[key]=value;saveSettings();if(['masterVolume','musicVolume','effectsVolume'].includes(key))applyAudioSettings();if(key==='graphicsQuality')resize();syncSettingsUI();}
  function syncSettingsUI(){for(const key of ['masterVolume','musicVolume','effectsVolume','lookSensitivity']){const input=$(key),output=$(key+'Value');if(!input||!output)continue;input.value=String(settings[key]);output.textContent=Math.round(settings[key]*100)+'%;'}$('graphicsQuality').value=settings.graphicsQuality;}
  function openSettings(){syncSettingsUI();settingsModal.classList.add('visible');settingsModal.setAttribute('aria-hidden','false');}
  function closeSettings(){settingsModal.classList.remove('visible');settingsModal.setAttribute('aria-hidden','true');}
  function updateTorchPresentation(){gameScreen.classList.toggle('torch-off',!torchOn);torchButton.setAttribute('aria-pressed',String(torchOn));torchButton.innerHTML='<span class="torch-icon">◉</span><span class="torch-label">TORCH '+(torchOn?'ON':'OFF')+'</span><small>L</small>';gameScreen.style.setProperty('--torch-power',String(torchOn?torchFlickerPower:0));}
  function toggleTorch(){if(!isPlaying||isPaused||screen!=='game')return;torchOn=!torchOn;updateTorchPresentation();}
  function random(min, max) { return min + Math.random() * (max - min); }
  function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
  function getMonsterInterval(){if(!currentDifficulty.monsters)return Infinity;const pressure=encounterCount*1.5+Math.floor(elapsedSeconds/90);return Math.max(currentDifficulty.monsterMinInterval,currentDifficulty.monsterBaseInterval-pressure);}
  function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safe / 60).toString().padStart(2, '0');
    const secs = (safe % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  // Generate a classic maze with a guaranteed connected route to the far exit.
  function findMazePath(tx,ty){const key=(x,y)=>x+','+y,q=[[1,1]],prev=new Map([[key(1,1),null]]);for(let i=0;i<q.length;i++){const[x,y]=q[i];if(x===tx&&y===ty)break;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(!map[ny]||map[ny][nx]!==0||prev.has(k))continue;prev.set(k,key(x,y));q.push([nx,ny]);}}let k=key(tx,ty);if(!prev.has(k))return [];const path=[];while(k){const p=k.split(',').map(Number);path.push({x:p[0]+.5,y:p[1]+.5});k=prev.get(k);}return path.reverse();}
  function placeEchoes(){echoes=[];echoesCollected=0;if(!currentDifficulty.echoClues)return;const size=map.length,path=findMazePath(size-2,size-2);if(path.length<8)return;[.28,.58,.82].forEach(f=>{const p=path[Math.min(path.length-2,Math.max(2,Math.floor(path.length*f)))];echoes.push({x:p.x,y:p.y,collected:false});});}
  function placeFakeExits(){exitDoors=[exitDoor];if(!currentDifficulty.fakeExitCount)return;const size=map.length,candidates=[];for(let y=2;y<size-2;y++)for(let x=2;x<size-2;x++){if(map[y][x]!==0)continue;const c={x:x+.5,y:y+.5,fake:true};if(Math.hypot(c.x-player.x,c.y-player.y)<15||Math.hypot(c.x-exitDoor.x,c.y-exitDoor.y)<9)continue;candidates.push(c);}for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}const total=Math.floor(random(3,6)),chosen=[];for(const c of candidates){if(chosen.every(d=>Math.hypot(d.x-c.x,d.y-c.y)>=9)){chosen.push(c);if(chosen.length>=total-1)break;}}if(chosen.length<total-1)for(const c of candidates){if(chosen.includes(c))continue;chosen.push(c);if(chosen.length>=total-1)break;}exitDoors=exitDoors.concat(chosen);}
  function generateEasyMaze(size){const m=Array.from({length:size},()=>Array(size).fill(1));for(let x=1;x<=size-2;x++)m[1][x]=0;for(let y=1;y<=size-2;y++)m[y][size-2]=0;for(let x=1;x<=size-2;x++)m[size-2][x]=0;return m;}
  function generateMaze(){const size=currentDifficulty.mapSize;if(currentDifficulty.id==='easy')return generateEasyMaze(size);
    const next = Array.from({ length: size }, () => Array(size).fill(1));
    const stack = [[1, 1]];
    next[1][1] = 0;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const options = [[0,-2],[2,0],[0,2],[-2,0]]
        .map(([dx,dy]) => [x + dx, y + dy, dx, dy])
        .filter(([nx,ny]) => nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && next[ny][nx] === 1);
      if (!options.length) { stack.pop(); continue; }
      const [nx, ny, dx, dy] = options[Math.floor(Math.random() * options.length)];
      next[y + dy / 2][x + dx / 2] = 0;
      next[ny][nx] = 0;
      stack.push([nx, ny]);
    }
    // A few extra openings make the layout less like a perfect puzzle maze.
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (next[y][x] !== 1 || Math.random() > 0.045) continue;
        const horizontal = next[y][x - 1] === 0 && next[y][x + 1] === 0;
        const vertical = next[y - 1][x] === 0 && next[y + 1][x] === 0;
        if (horizontal || vertical) next[y][x] = 0;
      }
    }
    // Keep the exit cell clear and reachable.
    next[size - 2][size - 2] = 0;
    return next;
  }

  function isWall(x,y){const mx=Math.floor(x),my=Math.floor(y);return !map[my]||map[my][mx]!==0;}
  function isDoorBlocked(x,y){return exitDoors.some(d=>Math.hypot(x-d.x,y-d.y)<.52);}

  function movePlayer(dx, dy) {
    const radius = 0.18;
    const targetX = player.x + dx;
    const targetY = player.y + dy;
    if (!isWall(targetX + Math.sign(dx) * radius, player.y) &&
        !isWall(targetX + Math.sign(dx) * radius, player.y + radius) &&
        !isWall(targetX + Math.sign(dx) * radius, player.y - radius) &&
        !isDoorBlocked(targetX,player.y)) {
      player.x = targetX;
    }
    if (!isWall(player.x, targetY + Math.sign(dy) * radius) &&
        !isWall(player.x + radius, targetY + Math.sign(dy) * radius) &&
        !isWall(player.x - radius, targetY + Math.sign(dy) * radius) &&
        !isDoorBlocked(player.x,targetY)) {
      player.y = targetY;
    }
  }

  function castRay(angle, maxDistance = 72) {
    const rayX = Math.cos(angle), rayY = Math.sin(angle);
    let mapX = Math.floor(player.x), mapY = Math.floor(player.y);
    const deltaX = Math.abs(1 / (rayX || 1e-9));
    const deltaY = Math.abs(1 / (rayY || 1e-9));
    const stepX = rayX < 0 ? -1 : 1;
    const stepY = rayY < 0 ? -1 : 1;
    let sideX = rayX < 0 ? (player.x - mapX) * deltaX : (mapX + 1 - player.x) * deltaX;
    let sideY = rayY < 0 ? (player.y - mapY) * deltaY : (mapY + 1 - player.y) * deltaY;
    let side = 0;
    let distance = 0;
    let hit = false;
    let guard = 0;
    while (!hit && guard++ < 96 && distance < maxDistance) {
      if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
      else { sideY += deltaY; mapY += stepY; side = 1; }
      distance = side === 0 ? sideX - deltaX : sideY - deltaY;
      if (!map[mapY] || map[mapY][mapX] !== 0) hit = true;
    }
    return { distance: Math.max(0.05, distance), side, mapX, mapY, hit, rayX, rayY };
  }

  function lineOfSight(x, y) {
    const dx = x - player.x, dy = y - player.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.ceil(distance / 0.12);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (isWall(player.x + dx * t, player.y + dy * t)) return false;
    }
    return true;
  }

  function getObjectView(object) {
    const dx = object.x - player.x;
    const dy = object.y - player.y;
    const distance = Math.hypot(dx, dy);
    const angle = normalizeAngle(Math.atan2(dy, dx) - player.angle);
    return { dx, dy, distance, angle };
  }

  function drawDoorSprite(door,zBuffer,strip,horizon){
    const view=getObjectView(door);
    if (view.distance > 18 || Math.abs(view.angle) > FOV * 0.85) return;
    const rayIndex = Math.floor((0.5 + Math.tan(view.angle) / (2 * Math.tan(FOV / 2))) * zBuffer.length);
    const wallDistance = zBuffer[Math.max(0, Math.min(zBuffer.length - 1, rayIndex))];
    if (view.distance > wallDistance + 0.1) return;
    const screenX = width * 0.5 + Math.tan(view.angle) / Math.tan(FOV / 2) * width * 0.5;
    const spriteHeight = Math.min(height * 1.1, height / view.distance * 0.86);
    const spriteWidth = spriteHeight * 0.53;
    const top = horizon - spriteHeight * 0.5;
    const left = screenX - spriteWidth * 0.5;
    const brightness = Math.max(0.08, 1 - view.distance / 9);
    ctx.save();
    ctx.globalAlpha=brightness*(door.fake?.88:1);
    if(doorImageReady){
      ctx.drawImage(doorTexture, left, top, spriteWidth, spriteHeight);
    } else {
      // Procedural fallback until the supplied door.png is added.
      ctx.fillStyle = '#171311';
      ctx.fillRect(left, top, spriteWidth, spriteHeight);
      ctx.strokeStyle = '#6e5542';
      ctx.lineWidth = Math.max(1, spriteWidth * 0.025);
      ctx.strokeRect(left + 2, top + 2, spriteWidth - 4, spriteHeight - 4);
      ctx.strokeStyle = '#372b24';
      ctx.strokeRect(left + spriteWidth * .12, top + spriteHeight * .08, spriteWidth * .76, spriteHeight * .84);
      ctx.fillStyle = '#ae8a5d';
      ctx.beginPath();
      ctx.arc(left + spriteWidth * .78, top + spriteHeight * .52, Math.max(1.5, spriteWidth * .025), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Bright, unmistakable Echo orbs. Their glow can bleed through walls as a supernatural clue.
  function drawEchoSprites(zBuffer, horizon) {
    for (const echo of echoes) {
      if (echo.collected) continue;
      const view = getObjectView(echo);
      if (view.distance > 24 || Math.abs(view.angle) > FOV * 0.98) continue;
      const rayIndex = Math.floor((0.5 + Math.tan(view.angle) / (2 * Math.tan(FOV / 2))) * zBuffer.length);
      const wallDistance = zBuffer[Math.max(0, Math.min(zBuffer.length - 1, rayIndex))];
      const occluded = view.distance > wallDistance + 0.12;
      const screenX = width * 0.5 + Math.tan(view.angle) / Math.tan(FOV / 2) * width * 0.5;
      const size = Math.max(19, Math.min(66, height / Math.max(1.2, view.distance) * 0.22));
      const screenY = horizon + Math.min(height * 0.34, height / (view.distance + 0.8) * 0.15);
      const pulse = 0.82 + Math.sin(elapsedSeconds * 3.2 + echo.x) * 0.16;
      ctx.save();
      ctx.globalAlpha = (occluded ? 0.52 : 1) * pulse;
      ctx.shadowColor = 'rgba(91,236,218,.95)';
      ctx.shadowBlur = size * 1.7;
      const glow = ctx.createRadialGradient(screenX, screenY, 1, screenX, screenY, size * 1.55);
      glow.addColorStop(0, 'rgba(225,255,247,.96)');
      glow.addColorStop(.22, 'rgba(108,244,220,.86)');
      glow.addColorStop(.62, 'rgba(35,165,157,.32)');
      glow.addColorStop(1, 'rgba(35,165,157,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * 1.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b9fff0';
      ctx.lineWidth = Math.max(2, size * .075);
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * .76, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(206,255,246,.85)';
      ctx.lineWidth = Math.max(1, size * .035);
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, size * 1.08, size * .48, elapsedSeconds * .35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#eafff7';
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * .34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMonsterPresence() {
    if (!monster || !monster.active) return;
    const distance = Math.hypot(monster.x - player.x, monster.y - player.y);
    if (distance > 7) return;
    const pulse = 0.018 + (1 - distance / 7) * (0.025 + Math.sin(monster.elapsed * 4.2) * 0.008);
    const edge = ctx.createRadialGradient(width * 0.5, height * 0.5, Math.min(width, height) * 0.2, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, `rgba(65,12,12,${Math.max(0.01, pulse)})`);
    ctx.fillStyle = edge; ctx.fillRect(0, 0, width, height);
  }

  function updateImpossibleEffects(dt){
    const impossible=currentDifficulty.anomalies;
    if(impossible){
      torchFlickerTimer-=dt;
      if(torchFlickerTimer<=0){if(torchFlickerPower>.72){torchFlickerPower=random(.10,.28);torchFlickerTimer=random(.12,.30);}else{torchFlickerPower=random(.78,1);torchFlickerTimer=random(1.3,3.8);}}
      if(elapsedSeconds>=nextAnomalyAt){anomalyUntil=elapsedSeconds+random(1.8,3.4);nextAnomalyAt=elapsedSeconds+random(18,30);}
      if(elapsedSeconds>=nextRandomSoundAt){if(randomSound.paused||randomSound.ended)playAudioCue(randomSound,random(.42,.68));nextRandomSoundAt=elapsedSeconds+random(24,48);}
    }else{torchFlickerPower=1;anomalyUntil=0;}
    gameScreen.style.setProperty('--torch-power',String(torchOn?torchFlickerPower:0));
    if(!currentDifficulty.monsters){cornerWatcher=null;return;}
    if(cornerWatcher){
      cornerWatcher.ttl-=dt;const view=getObjectView(cornerWatcher);
      if(view.distance<2.35||(Math.abs(view.angle)<.22&&lineOfSight(cornerWatcher.x,cornerWatcher.y))||cornerWatcher.ttl<=0){
        cornerWatcher=null;nextCornerWatcherAt=elapsedSeconds+(impossible?random(7,13):random(19,29));
      }
    }else if(elapsedSeconds>=nextCornerWatcherAt){
      const corners=getNearbyOpenCells(3,11).filter(p=>{
        const distance=Math.hypot(p.x-player.x,p.y-player.y),view=getObjectView(p);
        if(distance<3||distance>10||Math.abs(view.angle)>FOV*.82||lineOfSight(p.x,p.y))return false;
        return [[.8,0],[-.8,0],[0,.8],[0,-.8]].filter(([dx,dy])=>isWall(p.x+dx,p.y+dy)).length>=2;
      });
      if(corners.length){const p=corners[Math.floor(Math.random()*corners.length)];cornerWatcher={x:p.x,y:p.y,ttl:impossible?random(2.8,5.2):random(1.5,2.8),height:random(.22,.68)};}
      nextCornerWatcherAt=elapsedSeconds+(impossible?random(9,16):random(21,33));
    }
  }
  function drawImpossibleAnomaly(){if(!currentDifficulty.anomalies||elapsedSeconds>=anomalyUntil)return;const p=Math.max(0,anomalyUntil-elapsedSeconds),f=.45+Math.abs(Math.sin(elapsedSeconds*19))*.35,x=width*(.28+Math.sin(elapsedSeconds*2.7)*.18),h=Math.min(height*.82,height*(.48+f*.12)),w=h*.22;ctx.save();ctx.globalAlpha=Math.min(.52,p*.22)*f;ctx.fillStyle='#010102';ctx.shadowColor='rgba(160,35,42,.7)';ctx.shadowBlur=24;ctx.beginPath();ctx.ellipse(x,height*.5-h*.31,w*.24,h*.10,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x-w*.18,height*.5-h*.23);ctx.lineTo(x-w*.52,height*.5-h*.05);ctx.lineTo(x-w*.30,height*.5+h*.43);ctx.lineTo(x+w*.30,height*.5+h*.43);ctx.lineTo(x+w*.52,height*.5-h*.05);ctx.lineTo(x+w*.18,height*.5-h*.23);ctx.closePath();ctx.fill();ctx.globalAlpha=.08+f*.08;ctx.fillStyle='#d9c5c5';for(let i=0;i<4;i++){const y=(Math.abs(Math.sin(elapsedSeconds*11+i*7.3))*height)|0;ctx.fillRect(0,y,width,1+(i%2));}ctx.restore();} 
  function drawCornerWatcher(zBuffer, horizon) {
    if (!currentDifficulty.monsters || !cornerWatcher) return;
    const view = getObjectView(cornerWatcher);
    if (view.distance < 2.3 || view.distance > 11 || Math.abs(view.angle) > FOV * .92) return;

    const rayIndex = Math.floor((0.5 + Math.tan(view.angle) / (2 * Math.tan(FOV / 2))) * zBuffer.length);
    const wallDistance = zBuffer[Math.max(0, Math.min(zBuffer.length - 1, rayIndex))];
    // The eye sits just beyond this real wall corner, so the wall partly hides it.
    if (view.distance <= wallDistance + .18) return;

    const screenX = width * .5 + Math.tan(view.angle) / Math.tan(FOV / 2) * width * .5;
    const wallHeight = Math.min(height * 2.1, height / Math.max(.55, wallDistance));
    const size = Math.max(5, Math.min(15, wallHeight * .035));
    const side = view.angle < 0 ? -1 : 1;
    const eyeX = screenX - side * size * 1.15;
    const eyeY = horizon - wallHeight * (.25 + cornerWatcher.height * .12);
    const fade = Math.min(1, cornerWatcher.ttl * 1.8) * Math.max(.25, 1 - Math.max(0, view.distance - 8) * .12);
    const blink = Math.abs(Math.sin(elapsedSeconds * 5.1 + cornerWatcher.x)) > .965;

    ctx.save();
    ctx.globalAlpha = .88 * fade;
    ctx.fillStyle = 'rgba(0,0,0,.92)';
    ctx.beginPath();
    if (side < 0) {
      ctx.moveTo(eyeX - size * 2.4, eyeY - size * 2.8);
      ctx.lineTo(eyeX + size * .8, eyeY - size * 2.1);
      ctx.lineTo(eyeX + size * 1.1, eyeY + size * 2.5);
      ctx.lineTo(eyeX - size * 2.2, eyeY + size * 3.4);
    } else {
      ctx.moveTo(eyeX + size * 2.4, eyeY - size * 2.8);
      ctx.lineTo(eyeX - size * .8, eyeY - size * 2.1);
      ctx.lineTo(eyeX - size * 1.1, eyeY + size * 2.5);
      ctx.lineTo(eyeX + size * 2.2, eyeY + size * 3.4);
    }
    ctx.closePath();
    ctx.fill();

    // One eye peering around the actual wall edge.
    ctx.shadowColor = 'rgba(158,24,33,.95)';
    ctx.shadowBlur = size * 1.8;
    ctx.fillStyle = '#080607';
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, size * 1.85, size * 1.22, side * -.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'rgba(230,225,205,.92)';
    ctx.shadowBlur = size * .95;
    ctx.fillStyle = '#e2dfce';
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, size * 1.08, blink ? 1 : size * .68, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!blink) {
      ctx.fillStyle = '#92252a';
      ctx.beginPath();
      ctx.arc(eyeX + side * size * .08, eyeY, size * .42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#050405';
      ctx.beginPath();
      ctx.arc(eyeX + side * size * .08, eyeY, size * .20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawMonsterShadow(zBuffer, strip, horizon) {
    if (!monster || !monster.active) return;
    const view = getObjectView(monster);
    if (view.distance > 14 || Math.abs(view.angle) > FOV * .94) return;
    // Use the same grid-based visibility test as spawnMonster() rather than
    // low-resolution ray samples, which could hide a visible monster on mobile.
    if (!lineOfSight(monster.x, monster.y)) return;

    const screenX = width * .5 + Math.tan(view.angle) / Math.tan(FOV / 2) * width * .5;
    const spriteHeight = Math.min(height * 1.28, height / Math.max(.8, view.distance) * 1.02);
    const spriteWidth = spriteHeight * .43;
    const top = horizon - spriteHeight * .86;
    const eyeY = top + spriteHeight * .17;
    const light = Math.max(.32, 1 - Math.abs(view.angle) / 1.1) * Math.max(.32, 1 - view.distance / 13);

    ctx.save();
    ctx.globalAlpha = Math.min(.98, .76 + light * .22);
    ctx.fillStyle = '#171316';
    ctx.strokeStyle = 'rgba(119,48,53,.78)';
    ctx.lineWidth = Math.max(1.5, spriteWidth * .025);
    ctx.shadowColor = 'rgba(115,20,28,.42)';
    ctx.shadowBlur = Math.max(8, spriteWidth * .16);

    // Head silhouette with a faint, visible rim.
    ctx.beginPath();
    ctx.ellipse(screenX, eyeY, spriteWidth * .19, spriteHeight * .17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Broad shoulders and an unnaturally long torso.
    ctx.beginPath();
    ctx.moveTo(screenX - spriteWidth * .13, top + spriteHeight * .27);
    ctx.lineTo(screenX - spriteWidth * .49, top + spriteHeight * .39);
    ctx.lineTo(screenX - spriteWidth * .40, top + spriteHeight * .59);
    ctx.lineTo(screenX - spriteWidth * .22, top + spriteHeight * .50);
    ctx.lineTo(screenX - spriteWidth * .24, top + spriteHeight * .97);
    ctx.lineTo(screenX + spriteWidth * .24, top + spriteHeight * .97);
    ctx.lineTo(screenX + spriteWidth * .22, top + spriteHeight * .50);
    ctx.lineTo(screenX + spriteWidth * .40, top + spriteHeight * .59);
    ctx.lineTo(screenX + spriteWidth * .49, top + spriteHeight * .39);
    ctx.lineTo(screenX + spriteWidth * .13, top + spriteHeight * .27);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Two dim red reflections make the head legible without making it bright.
    ctx.shadowColor = 'rgba(230,45,49,.95)';
    ctx.shadowBlur = Math.max(5, spriteWidth * .13);
    ctx.fillStyle = '#b83b3d';
    const eyeRadius = Math.max(1.8, spriteWidth * .025);
    for (const eyeOffset of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(screenX + eyeOffset * spriteWidth * .075, eyeY + spriteHeight * .012, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTexturedFloor(horizon) {
    if (!floorImageReady || !floorTexturePixels || !floorBufferImage) return;
    const pixels = floorBufferImage.data;
    pixels.fill(0); // Transparent above the horizon so the dark ceiling remains visible.
    const bufferWidth = floorBuffer.width;
    const bufferHeight = floorBuffer.height;
    const cosine = Math.cos(player.angle);
    const sine = Math.sin(player.angle);
    const cameraPlane = Math.tan(FOV / 2);
    const verticalScale = 2 * cameraPlane * height / width;
    for (let py = 0; py < bufferHeight; py++) {
      const screenY = (py + 0.5) * height / bufferHeight;
      if (screenY <= horizon) continue;
      const rowOffset = ((screenY - horizon) / height) * verticalScale;
      const rowDistance = 0.5 / Math.max(0.0005, rowOffset);
      const rowIndex = py * bufferWidth;
      for (let px = 0; px < bufferWidth; px++) {
        const cameraX = ((px + 0.5) * width / bufferWidth / width) * 2 - 1;
        const rayX = cosine - sine * cameraPlane * cameraX;
        const rayY = sine + cosine * cameraPlane * cameraX;
        const worldX = player.x + rowDistance * rayX;
        const worldY = player.y + rowDistance * rayY;
        const tx = Math.min(floorTextureWidth - 1, Math.floor((worldX - Math.floor(worldX)) * floorTextureWidth));
        const ty = Math.min(floorTextureHeight - 1, Math.floor((worldY - Math.floor(worldY)) * floorTextureHeight));
        const source = (ty * floorTextureWidth + tx) * 4;
        const target = (rowIndex + px) * 4;
        const beam = Math.max(0, 1 - Math.abs(cameraX) * 0.95);
        const power=torchOn?(currentDifficulty.torchFlicker?torchFlickerPower:1):0;
        const brightness=torchOn?Math.min(1,.12+.88*beam*power*Math.exp(-rowDistance*.11)):Math.max(.025,.075*Math.exp(-rowDistance*.08));
        pixels[target] = floorTexturePixels[source] * brightness;
        pixels[target + 1] = floorTexturePixels[source + 1] * brightness;
        pixels[target + 2] = floorTexturePixels[source + 2] * brightness;
        pixels[target + 3] = 255;
      }
    }
    floorBufferCtx.putImageData(floorBufferImage, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(floorBuffer, 0, 0, width, height);
    ctx.restore();
  }

  function renderWorld() {
    const horizon = height * 0.5 + player.pitch * height * 0.46;
    ctx.fillStyle = '#020304';
    ctx.fillRect(0, 0, width, height);
    const ceiling = ctx.createLinearGradient(0, 0, 0, horizon);
    ceiling.addColorStop(0, '#010203');
    ceiling.addColorStop(1, '#090d10');
    ctx.fillStyle = ceiling;
    ctx.fillRect(0, 0, width, Math.max(0, horizon));
    const floor = ctx.createLinearGradient(0, horizon, 0, height);
    floor.addColorStop(0, '#080b0d');
    floor.addColorStop(1, '#010203');
    ctx.fillStyle = floor;
    ctx.fillRect(0, Math.max(0, horizon), width, height - Math.max(0, horizon));
    drawTexturedFloor(horizon);

    const stripWidth=settings.graphicsQuality==='low'?5:(settings.graphicsQuality==='medium'?4:(mobile?3.5:3));
    const columns=Math.ceil(width/stripWidth);
    const strip = width / columns;
    const zBuffer = new Float32Array(columns);
    for (let i = 0; i < columns; i++) {
      const rayAngle = player.angle - FOV / 2 + (i / columns) * FOV;
      const ray = castRay(rayAngle);
      const distance = Math.max(.12, ray.distance * Math.cos(rayAngle - player.angle));
      zBuffer[i] = distance;
      const wallHeight = Math.min(height * 2.3, height / distance);
      const top = horizon - wallHeight * .5;
      const wallU = ray.side === 0
        ? player.y + ray.distance * ray.rayY
        : player.x + ray.distance * ray.rayX;
      const textureU = wallU - Math.floor(wallU);
      const beamAngle = Math.abs(normalizeAngle(rayAngle - player.angle));
      const beam = Math.max(0, 1 - beamAngle / .76);
      const range = Math.max(0, 1 - distance / 5.8);
      const tp=torchOn?(currentDifficulty.torchFlicker?torchFlickerPower:1):0;
      const illumination=Math.pow(beam,1.65)*Math.pow(range,1.2)*tp;
      const sideShade = ray.side ? .66 : 1;

      if (wallImageReady && wallTextureBuffer.width > 0) {
        const sx = Math.min(wallTextureBuffer.width - 1, Math.floor(textureU * wallTextureBuffer.width));
        ctx.globalAlpha = Math.min(1, (.035 + illumination * .96) * 1.48 * sideShade);
        ctx.drawImage(wallTextureBuffer, sx, 0, 1, wallTextureBuffer.height, i * strip, top, strip + 1, wallHeight);
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(0,0,0,${Math.max(.05, .965 - illumination * sideShade)})`;
        ctx.fillRect(i * strip, top, strip + 1, wallHeight);
      } else {
        const light=torchOn?Math.floor(8+illumination*154):4;
        ctx.fillStyle = `rgb(${Math.floor(light * .66 * sideShade)},${Math.floor(light * .78 * sideShade)},${Math.floor(light * .88 * sideShade)})`;
        ctx.fillRect(i * strip, top, strip + 1, wallHeight);
      }
    }

    // A low-power flashlight hotspot and broad darkness at the edges.
    const glow = ctx.createRadialGradient(width * .5, horizon + height * .1, 1, width * .5, horizon + height * .18, height * .58);
    const tp=torchOn?(currentDifficulty.torchFlicker?torchFlickerPower:1):0;
    glow.addColorStop(0,'rgba(180,210,230,'+(.17*tp)+')');
    glow.addColorStop(.3,'rgba(105,145,165,'+(.065*tp)+')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle=glow;
    ctx.fillRect(0,Math.max(0,horizon),width,height-Math.max(0,horizon));
    if(!torchOn){ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(0,0,width,height);}

    for(const door of exitDoors)drawDoorSprite(door,zBuffer,strip,horizon);

    const vignette = ctx.createRadialGradient(width * .5, horizon, Math.min(width, height) * .05, width * .5, horizon, Math.max(width, height) * .76);
    vignette.addColorStop(0, 'rgba(0,0,0,.02)');
    vignette.addColorStop(.28, 'rgba(0,0,0,.22)');
    vignette.addColorStop(.58, 'rgba(0,0,0,.78)');
    vignette.addColorStop(1, 'rgba(0,0,0,.98)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Keep gameplay clues and entities legible above the final darkness overlay.
    drawMonsterPresence();
    drawImpossibleAnomaly();
    drawCornerWatcher(zBuffer, horizon);
    drawEchoSprites(zBuffer, horizon);
    drawMonsterShadow(zBuffer, strip, horizon);
  }

  function startAudio(track) {
    [introMusic, gameMusic].forEach(audio => {
      if (audio !== track) { audio.pause(); audio.currentTime = 0; }
    });
    if (!track) return;
    track.volume=settings.masterVolume*settings.musicVolume;
    const promise = track.play();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  }
  function playAudioCue(audio, volume = .8, loop = false) {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio._dreadBaseVolume=volume;
      audio.volume=volume*settings.masterVolume*settings.effectsVolume;
      audio.loop=loop;
      const promise = audio.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    } catch (_) {}
  }
  function stopAudioCue(audio) {
    if (!audio) return;
    try { audio.pause(); audio.currentTime = 0; } catch (_) {}
  }
  function playMonsterSound() { playAudioCue(monsterSound, .85); }
  function stopFootsteps() {
    if (!footstepsAudio.paused) footstepsAudio.pause();
    try { if (footstepsAudio.currentTime !== 0) footstepsAudio.currentTime = 0; } catch (_) {}
  }
  function syncFootsteps(moving, movementSpeed) {
    if (!moving || !isPlaying || isPaused) { stopFootsteps(); return; }
    footstepsAudio.volume=.52*settings.masterVolume*settings.effectsVolume;
    footstepsAudio.playbackRate = Math.max(0.72, Math.min(1.22, movementSpeed / player.speed));
    if (footstepsAudio.paused) {
      const promise = footstepsAudio.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    }
  }
  function applyAudioSettings(){introMusic.volume=gameMusic.volume=settings.masterVolume*settings.musicVolume;[monsterSound,footstepsAudio,doorSound,overSound,randomSound].forEach(a=>{if(a._dreadBaseVolume!=null)a.volume=a._dreadBaseVolume*settings.masterVolume*settings.effectsVolume;});}
  function stopAllAudio(){[introMusic,gameMusic,monsterSound,footstepsAudio,doorSound,overSound,randomSound].forEach(stopAudioCue);}

  function getHistory() {
    try {
      const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (_) { return []; }
  }
  function saveHistory(status) {
    if (runRecorded) return null;
    runRecorded = true;
    const seconds = Math.max(0, Math.floor(elapsedSeconds));
    const item = {
      id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      seconds,
      time: formatTime(seconds),
      date: new Date().toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      status
    };
    const history = getHistory();
    history.push(item);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (_) {}
    renderHistory();
    return item;
  }
  function renderHistory() {
    const history = getHistory().sort((a, b) => a.seconds - b.seconds);
    if (!history.length) {
      historyList.innerHTML = '<div class="empty-history">NO RUNS RECORDED.<br>THE FIRST ONE IS YOURS.</div>';
      return;
    }
    historyList.innerHTML = history.map((run, index) => {
      const cls = run.status === 'ESCAPED' ? 'success' : '';
      const result = run.status === 'ESCAPED' ? 'EXIT REACHED' : (run.status === 'ABANDONED' ? 'LEFT EARLY' : 'FOUND');
      return `<div class="history-row ${cls}"><span class="rank">#${String(index + 1).padStart(2, '0')}</span><span class="result">${result}</span><span class="duration">${run.time || formatTime(run.seconds)}</span><span class="date">${escapeHTML(run.date || '')}</span></div>`;
    }).join('');
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
  }

  function setScreen(next) {
    screen = next;
    dashboard.classList.toggle('active',next==='home'||next==='about');
    gameScreen.classList.toggle('active',next==='game'||next==='paused'||next==='exitOptions');
    deathScreen.classList.toggle('visible',next==='dead');endingScreen.classList.toggle('visible',next==='ending');
    exitModal.classList.toggle('visible',next==='exitOptions');pauseModal.classList.toggle('visible',next==='paused');
    pauseModal.setAttribute('aria-hidden',String(next!=='paused'));
  }

  function showAbout(open) {
    aboutPanel.classList.toggle('open', open);
    aboutPanel.setAttribute('aria-hidden', String(!open));
    playButton.classList.toggle('selected', !open);
    aboutButton.classList.toggle('selected', open);
    if (open) renderHistory();
  }

  function startGame(levelKey){if(endingTimer)clearTimeout(endingTimer);if(deathTimer)clearTimeout(deathTimer);if(fakeDoorTimer)clearTimeout(fakeDoorTimer);currentDifficulty=DIFFICULTIES[levelKey]||DIFFICULTIES.medium;player.speed=currentDifficulty.playerSpeed;map=generateMaze();
    player.x=1.5;player.y=1.5;const sz=map.length;exitDoor=currentDifficulty.id==='easy'?{x:1.5,y:sz-1.5,fake:false}:{x:sz-1.5,y:sz-1.5,fake:false};exitDoors=[exitDoor];targetedDoor=null;
    // Face the first carved corridor instead of sometimes spawning toward a wall.
    player.angle = map[1][2] === 0 ? 0 : Math.PI / 2;
    player.pitch = 0;
    health = 100;
    elapsedSeconds = 0;
    startedAt = performance.now();
    runRecorded = false;
    nextMonsterAt=currentDifficulty.monsterInitialDelay;encounterCount=0;monster=null;placeEchoes();placeFakeExits();anomalyUntil=0;nextAnomalyAt=random(8,16);cornerWatcher=null;nextCornerWatcherAt=currentDifficulty.id==='impossible'?random(4,8):(currentDifficulty.id==='medium'?random(14,22):Infinity);nextRandomSoundAt=currentDifficulty.anomalies?random(16,28):Infinity;torchFlickerPower=1;torchFlickerTimer=random(1.2,2.4);torchOn=true;updateTorchPresentation();
    isPlaying = true;
    isPaused = false;
    doorAimed = false;
    $('healthValue').textContent = '100';
    $('healthFill').style.width = '100%';
    $('stopwatch').textContent = '00:00';
    updateHUD();
    doorPrompt.classList.remove('visible');
    mobileInteract.classList.remove('visible');
    $('gameHint').style.display = mobile ? 'none' : '';
    showAbout(false);levelSelect.classList.remove('visible');loadingScreen.classList.remove('visible');fakeDoorToast.classList.remove('visible');
    setScreen('game');
    stopFootsteps();
    startAudio(gameMusic);
    if (!mobile && canvas.requestPointerLock) {
      try { canvas.requestPointerLock(); } catch (_) {}
    }
  }

  function returnHome() {
    isPlaying = false;
    isPaused=false;monster=null;closeSettings();if(deathTimer)clearTimeout(deathTimer);if(endingTimer)clearTimeout(endingTimer);
    stopAllAudio();if(document.pointerLockElement)document.exitPointerLock();setScreen('home');
    showAbout(false);
    startAudio(introMusic);
  }

  function updateHUD() {
    $('healthValue').textContent = String(Math.ceil(health));
    $('healthFill').style.width = Math.max(0, health) + '%';
    $('stopwatch').textContent = formatTime(elapsedSeconds);
    if (currentDifficulty.id === 'impossible') {
      objectiveStatus.hidden = false;
      objectiveLabel.textContent = 'JUST LIVE';
      echoCountLabel.hidden = true;
      exitTrace.hidden = true;
      return;
    }
    if (!echoes.length) {
      objectiveStatus.hidden = true;
      exitTrace.hidden = true;
      return;
    }
    objectiveStatus.hidden = false;
    objectiveLabel.textContent = 'OPTIONAL · FIND 3 ECHOES';
    echoCountLabel.hidden = false;
    echoCountLabel.textContent = echoesCollected + ' / ' + OPTIONAL_ECHO_COUNT;
    exitTrace.hidden = false;
    if (echoesCollected < OPTIONAL_ECHO_COUNT) {
      const remaining = echoes.filter(e => !e.collected);
      const nearest = remaining.reduce((best, e) =>
        !best || Math.hypot(e.x - player.x, e.y - player.y) < Math.hypot(best.x - player.x, best.y - player.y) ? e : best, null);
      if (nearest) {
        const bearing = normalizeAngle(Math.atan2(nearest.y - player.y, nearest.x - player.x) - player.angle);
        const direction = Math.abs(bearing) < .38 ? 'AHEAD' : Math.abs(bearing) > 2.76 ? 'BEHIND' : (bearing < 0 ? 'LEFT' : 'RIGHT');
        const distance = Math.round(Math.hypot(nearest.x - player.x, nearest.y - player.y));
        exitTrace.textContent = 'ECHO SIGNAL · ' + direction + ' · ABOUT ' + distance + 'M';
      }
    } else {
      const bearing = normalizeAngle(Math.atan2(exitDoor.y - player.y, exitDoor.x - player.x) - player.angle);
      const direction = Math.abs(bearing) < .38 ? 'AHEAD' : Math.abs(bearing) > 2.76 ? 'BEHIND' : (bearing < 0 ? 'LEFT' : 'RIGHT');
      const distance = Math.round(Math.hypot(exitDoor.x - player.x, exitDoor.y - player.y));
      exitTrace.textContent = 'EXIT TRACE · ' + direction + ' · ABOUT ' + distance + 'M';
    }
  }

  function collectEchoes() {
    for (const echo of echoes) {
      if (echo.collected) continue;
      if (Math.hypot(player.x - echo.x, player.y - echo.y) <= 0.72) {
        echo.collected = true;
        echoesCollected = Math.min(OPTIONAL_ECHO_COUNT, echoesCollected + 1);
        updateHUD();
      }
    }
  }

  function getNearbyOpenCells(minSteps, maxSteps) {
    const startX = Math.floor(player.x), startY = Math.floor(player.y);
    const queue = [{ x: startX, y: startY, steps: 0 }];
    const visited = new Set([startX + ',' + startY]);
    const found = [];
    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i];
      if (cell.steps >= minSteps) {
        found.push({ x: cell.x + .5, y: cell.y + .5, steps: cell.steps });
      }
      if (cell.steps >= maxSteps) continue;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = cell.x + dx, ny = cell.y + dy, key = nx + ',' + ny;
        if (visited.has(key) || !map[ny] || map[ny][nx] !== 0) continue;
        visited.add(key);
        queue.push({ x: nx, y: ny, steps: cell.steps + 1 });
      }
    }
    return found;
  }

  function spawnMonster() {
    // Only spawn where the player can actually see the shadow. Never play an
    // encounter sound for a monster hidden behind a wall or outside the camera.
    const candidates = getNearbyOpenCells(3, 10).filter(p => {
      const distance = Math.hypot(p.x - player.x, p.y - player.y);
      return distance >= 2.7 && distance <= 10 &&
        Math.hypot(p.x - exitDoor.x, p.y - exitDoor.y) > 2.5 &&
        lineOfSight(p.x, p.y);
    });
    const forward = candidates.filter(p => Math.abs(getObjectView(p).angle) < FOV * .70);
    if (!forward.length) {
      nextMonsterAt = elapsedSeconds + 1.4;
      return;
    }
    const position = forward[Math.floor(Math.random() * forward.length)];
    monster = {
      x: position.x, y: position.y, active: true,
      elapsed: 0, escapeTime: 0, closeHit: false,
      revealTime:4.5,pathTimer:0,waypoint:null,waypointTarget:'',gazeHold:0
    };
    encounterCount++;
    playMonsterSound();
  }

  function findMonsterWaypoint(){
    const sx=Math.floor(monster.x),sy=Math.floor(monster.y),tx=Math.floor(player.x),ty=Math.floor(player.y),startKey=sx+','+sy,targetKey=tx+','+ty;
    if(startKey===targetKey)return {x:player.x,y:player.y};
    const queue=[[sx,sy]],prev=new Map([[startKey,null]]);
    for(let i=0;i<queue.length;i++){const[x,y]=queue[i];if(x===tx&&y===ty)break;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(prev.has(key)||!map[ny]||map[ny][nx]!==0)continue;prev.set(key,x+','+y);queue.push([nx,ny]);}}
    if(!prev.has(targetKey))return {x:player.x,y:player.y};
    let cursor=targetKey,parent=prev.get(cursor);while(parent&&parent!==startKey){cursor=parent;parent=prev.get(cursor);}
    const[wx,wy]=cursor.split(',').map(Number);return {x:wx+.5,y:wy+.5};
  }
  function updateMonster(dt,forward,strafe){
    if(!monster||!monster.active)return;monster.elapsed+=dt;const view=getObjectView(monster),hasLine=lineOfSight(monster.x,monster.y);
    const inView=view.distance<11&&Math.abs(view.angle)<FOV*.88&&hasLine,staring=view.distance<10&&Math.abs(view.angle)<.24&&hasLine;
    if(staring){monster.gazeHold+=dt;health=Math.max(0,health-currentDifficulty.stareDamage*dt);}else monster.gazeHold=Math.max(0,monster.gazeHold-dt*1.6);
    const targetCell=Math.floor(player.x)+','+Math.floor(player.y);monster.pathTimer-=dt;
    if(!monster.waypoint||monster.pathTimer<=0||monster.waypointTarget!==targetCell){monster.waypoint=findMonsterWaypoint();monster.waypointTarget=targetCell;monster.pathTimer=.48;}
    let tx=monster.waypoint.x,ty=monster.waypoint.y;if(Math.hypot(tx-monster.x,ty-monster.y)<.22){tx=player.x;ty=player.y;}
    const dx=tx-monster.x,dy=ty-monster.y,dest=Math.max(.001,Math.hypot(dx,dy)),playerDistance=Math.hypot(player.x-monster.x,player.y-monster.y);
    const speed=(inView?.10:(playerDistance>5?.94:.72))*currentDifficulty.monsterSpeed*(torchOn?1:1.12);
    const mx=dx/dest*speed*dt,my=dy/dest*speed*dt;if(!isWall(monster.x+mx,monster.y)&&!isDoorBlocked(monster.x+mx,monster.y))monster.x+=mx;if(!isWall(monster.x,monster.y+my)&&!isDoorBlocked(monster.x,monster.y+my))monster.y+=my;
    if(playerDistance<.85&&!monster.closeHit){health=Math.max(0,health-currentDifficulty.closeDamage);monster.closeHit=true;}
    const moving=Math.abs(forward)+Math.abs(strafe)>.35,lookingAway=Math.abs(view.angle)>.55;
    if(lookingAway&&moving&&playerDistance>3.4)monster.escapeTime+=dt;else monster.escapeTime=Math.max(0,monster.escapeTime-dt*.35);
    if(monster.revealTime>0)monster.revealTime=Math.max(0,monster.revealTime-dt);
    if((monster.escapeTime>4.2&&monster.revealTime<=0)||monster.elapsed>24||playerDistance<.5){monster=null;nextMonsterAt=elapsedSeconds+getMonsterInterval();}
    if(health<=0)endRunByDeath();
  }

  function updateDoorAim(){const ray=castRay(player.angle);targetedDoor=null;let near=Infinity;for(const door of exitDoors){const v=getObjectView(door);if(v.distance<2.65&&Math.abs(v.angle)<.14&&ray.distance>=v.distance-.35&&v.distance<near){near=v.distance;targetedDoor=door;}}doorAimed=!!targetedDoor;if(doorAimed)doorPrompt.textContent=targetedDoor.fake?'UNKNOWN EXIT — CLICK OR PRESS E':'EXIT FOUND — CLICK OR PRESS E';doorPrompt.classList.toggle('visible',doorAimed&&!mobile);mobileInteract.textContent=doorAimed&&targetedDoor.fake?'CHECK DOOR':'INTERACT';mobileInteract.classList.toggle('visible',doorAimed&&mobile);}

  function updateGame(dt) {
    if (!isPlaying) return;
    if (isPaused) {
      // Keep the stopwatch running while the player is deciding at the exit door,
      // but freeze it on the ordinary pause screen.
      if (screen === 'exitOptions') { elapsedSeconds += dt; updateHUD(); }
      return;
    }
    elapsedSeconds += dt;

    let forward = 0, strafe = 0;
    if (keys.KeyW || keys.ArrowUp) forward += 1;
    if (keys.KeyS || keys.ArrowDown) forward -= 1;
    if (keys.KeyD) strafe += 1;
    if (keys.KeyA) strafe -= 1;
    forward -= touchMove.y;
    strafe += touchMove.x;
    const magnitude = Math.hypot(forward, strafe);
    if (magnitude > 1) { forward /= magnitude; strafe /= magnitude; }

    const cos = Math.cos(player.angle), sin = Math.sin(player.angle);
    const step = player.speed * dt;
    const dx = (cos * forward - sin * strafe) * step;
    const dy = (sin * forward + cos * strafe) * step;
    const previousX = player.x;
    const previousY = player.y;
    if (dx || dy) movePlayer(dx, dy);
    const actualDistance=Math.hypot(player.x-previousX,player.y-previousY);
    const playerMoving=actualDistance>.0005;gameScreen.classList.toggle('player-moving',playerMoving);
    syncFootsteps(playerMoving,dt>0?actualDistance/dt:0);
    collectEchoes();

    if(currentDifficulty.monsters&&!monster&&elapsedSeconds>=nextMonsterAt)spawnMonster();updateMonster(dt,forward,strafe);updateImpossibleEffects(dt);
    if (!isPlaying) return;
    updateDoorAim();
    updateHUD();
  }

  function interactWithDoor(){if(!isPlaying||!doorAimed||!targetedDoor)return;playAudioCue(doorSound,.92);if(!targetedDoor.fake){openExitOptions();return;}stopFootsteps();isPaused=true;fakeDoorToast.classList.add('visible');if(currentDifficulty.anomalies)anomalyUntil=elapsedSeconds+2.2;if(fakeDoorTimer)clearTimeout(fakeDoorTimer);fakeDoorTimer=setTimeout(()=>{fakeDoorToast.classList.remove('visible');if(!isPlaying)return;isPaused=false;setScreen('game');if(!mobile&&canvas.requestPointerLock){try{canvas.requestPointerLock();}catch(_){}}},1750);}
  function openExitOptions() {
    if (!isPlaying || !doorAimed || !targetedDoor || targetedDoor.fake) return;
    stopFootsteps();
    isPaused = true;
    setScreen('exitOptions');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function finishAtDoor() {
    if (!isPlaying) return;
    saveHistory('ESCAPED');
    isPlaying = false;
    isPaused = false;
    monster = null;
    stopAllAudio();
    if (document.pointerLockElement) document.exitPointerLock();
    setScreen('ending');
    playAudioCue(overSound, .72, true);
    // The ending remains on screen for roughly 12.4 seconds, then returns to the menu.
    const endingCopy = $('endingCopy');
    endingCopy.style.animation = 'none';
    void endingCopy.offsetWidth;
    endingCopy.style.animation = 'endingReveal 12.4s ease forwards';
    endingTimer=setTimeout(()=>{stopAudioCue(overSound);returnHome();},18000);
  }

  function endRunByDeath() {
    if (!isPlaying) return;
    saveHistory('FOUND');
    isPlaying = false;
    isPaused = false;
    monster = null;
    stopAllAudio();
    if (document.pointerLockElement) document.exitPointerLock();
    setScreen('dead');
    deathTimer=setTimeout(()=>returnHome(),9000);
  }

  function pauseGame(){if(!isPlaying||isPaused)return;stopFootsteps();resumeMusicAfterPause=!gameMusic.paused;gameMusic.pause();stopAudioCue(monsterSound);stopAudioCue(randomSound);isPaused=true;closeSettings();setScreen('paused');if(document.pointerLockElement)document.exitPointerLock();}
  function resumeGame(){if(!isPlaying)return;isPaused=false;closeSettings();setScreen('game');if(resumeMusicAfterPause){const p=gameMusic.play();if(p&&typeof p.catch==='function')p.catch(()=>{});}resumeMusicAfterPause=false;if(!mobile&&canvas.requestPointerLock){try{canvas.requestPointerLock();}catch(_){}}}

  function render() {
    if (screen === 'game' || screen === 'paused' || screen === 'exitOptions') renderWorld();
  }
  function loop(timestamp) {
    const dt = Math.min((timestamp - lastFrame) / 1000 || 0, .04);
    lastFrame = timestamp;
    updateGame(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Desktop controls: WASD movement, mouse look in both axes, E/click to interact.
  window.addEventListener('keydown',event=>{
    keys[event.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();
    if((event.code==='KeyE'||event.code==='Enter')&&!isPaused&&doorAimed)interactWithDoor();
    if(event.code==='KeyL'&&!event.repeat&&isPlaying&&!isPaused&&screen==='game'){event.preventDefault();toggleTorch();}
    if(event.code==='Escape'){if(settingsModal.classList.contains('visible'))closeSettings();else if(isPlaying&&isPaused&&screen==='paused')resumeGame();else if(isPlaying&&!isPaused&&!exitModal.classList.contains('visible'))pauseGame();}
  });
  window.addEventListener('keyup', event => { keys[event.code] = false; });
  window.addEventListener('blur', () => { Object.keys(keys).forEach(key => { keys[key] = false; }); stopFootsteps(); });

  canvas.addEventListener('click', () => {
    if (!isPlaying || isPaused) return;
    if (doorAimed) { interactWithDoor(); return; }
    if (!mobile && !pointerLocked && canvas.requestPointerLock) {
      try { canvas.requestPointerLock(); } catch (_) {}
    }
  });
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas;
    if (pointerLocked) hadPointerLock = true;
    if (!mobile && hadPointerLock && isPlaying && !pointerLocked && !isPaused && screen === 'game') {
      pauseGame();
    }
  });
  document.addEventListener('mousemove', event => {
    if (!pointerLocked || !isPlaying || isPaused) return;
    player.angle+=event.movementX*(MOUSE_LOOK_SENSITIVITY*1.12*settings.lookSensitivity);
    player.pitch=Math.max(-.72,Math.min(.72,player.pitch-event.movementY*MOUSE_PITCH_SENSITIVITY*settings.lookSensitivity));
  });

  // Mobile movement joystick.
  function setJoystick(event) {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let x = (event.clientX - cx) / (rect.width * .34);
    let y = (event.clientY - cy) / (rect.height * .34);
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    touchMove.x = x;
    touchMove.y = y;
    stick.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  }
  joystick.addEventListener('pointerdown', event => {
    joyPointer = event.pointerId;
    joystick.setPointerCapture(joyPointer);
    setJoystick(event);
  });
  joystick.addEventListener('pointermove', event => { if (event.pointerId === joyPointer) setJoystick(event); });
  function releaseJoystick(event) {
    if (event.pointerId !== joyPointer) return;
    joyPointer = null; touchMove.x = 0; touchMove.y = 0;
    stick.style.transform = 'translate(0,0)';
  }
  joystick.addEventListener('pointerup', releaseJoystick);
  joystick.addEventListener('pointercancel', releaseJoystick);

  // Drag on the right half to look horizontally and vertically.
  lookZone.addEventListener('pointerdown', event => {
    event.preventDefault();
    lookPointer = event.pointerId;
    lastLookX = event.clientX;
    lastLookY = event.clientY;
    lookZone.setPointerCapture(lookPointer);
  });
  lookZone.addEventListener('pointermove', event => {
    if (event.pointerId !== lookPointer) return;
    const dragX = Math.max(-100, Math.min(100, event.clientX - lastLookX));
    const dragY = Math.max(-100, Math.min(100, event.clientY - lastLookY));
    player.angle+=dragX*.0085*settings.lookSensitivity;
    player.pitch=Math.max(-.72,Math.min(.72,player.pitch-dragY*.0065*settings.lookSensitivity));
    lastLookX = event.clientX;
    lastLookY = event.clientY;
  });
  function releaseLook(event) { if (event.pointerId === lookPointer) lookPointer = null; }
  lookZone.addEventListener('pointerup', releaseLook);
  lookZone.addEventListener('pointercancel', releaseLook);
  mobileInteract.addEventListener('click', interactWithDoor);

  // Dashboard buttons and difficulty transition.
  function openLevelSelect(){stopAllAudio();levelSelect.classList.add('visible');levelSelect.setAttribute('aria-hidden','false');}
  function closeLevelSelect(){levelSelect.classList.remove('visible');levelSelect.setAttribute('aria-hidden','true');startAudio(introMusic);}
  function chooseLevel(key){if(!DIFFICULTIES[key])return;stopAllAudio();levelSelect.classList.remove('visible');levelSelect.setAttribute('aria-hidden','true');loadingTitle.textContent='ENTERING: '+DIFFICULTIES[key].label;loadingScreen.classList.add('visible');loadingScreen.setAttribute('aria-hidden','false');if(loadingTimer)clearTimeout(loadingTimer);loadingTimer=setTimeout(()=>{loadingScreen.classList.remove('visible');loadingScreen.setAttribute('aria-hidden','true');startGame(key);},2400);}
  playButton.addEventListener('click',openLevelSelect);
  $('easyLevelButton').addEventListener('click',()=>chooseLevel('easy'));
  $('mediumLevelButton').addEventListener('click',()=>chooseLevel('medium'));
  $('impossibleLevelButton').addEventListener('click',()=>chooseLevel('impossible'));
  $('backToMenuButton').addEventListener('click',closeLevelSelect);
  aboutButton.addEventListener('click', () => { showAbout(true); startAudio(introMusic); });
  closeAbout.addEventListener('click', () => showAbout(false));
  clearHistoryButton.addEventListener('click', () => {
    if (!window.confirm('Clear all DREADWALLS run history stored on this device?')) return;
    try { localStorage.removeItem(HISTORY_KEY); } catch (_) {}
    renderHistory();
  });

  $('leaveButton').addEventListener('click', finishAtDoor);
  $('stayButton').addEventListener('click', () => { isPaused = false; setScreen('game'); if (!mobile && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch (_) {} } });
  $('sacrificeButton').addEventListener('click', () => {}); // Reserved for a future chapter.
  $('pauseButton').addEventListener('click',pauseGame);torchButton.addEventListener('click',toggleTorch);
  $('resumeButton').addEventListener('click',resumeGame);$('pauseSettingsButton').addEventListener('click',openSettings);
  $('closeSettingsButton').addEventListener('click',closeSettings);$('settingsBackButton').addEventListener('click',closeSettings);
  $('homeButton').addEventListener('click',()=>{saveHistory('ABANDONED');returnHome();});
  $('retryButton').addEventListener('click',()=>{saveHistory('ABANDONED');gameMusic.currentTime=0;startGame(currentDifficulty.id);});
  $('deathRetryButton').addEventListener('click',()=>startGame(currentDifficulty.id));$('deathHomeButton').addEventListener('click',returnHome);
  $('endingRetryButton').addEventListener('click',()=>{stopAudioCue(overSound);gameMusic.currentTime=0;startGame(currentDifficulty.id);});
  $('endingHomeButton').addEventListener('click',()=>{stopAudioCue(overSound);returnHome();});
  for(const key of ['masterVolume','musicVolume','effectsVolume','lookSensitivity'])$(key).addEventListener('input',event=>updateSetting(key,Number(event.target.value)));
  $('graphicsQuality').addEventListener('change',event=>updateSetting('graphicsQuality',event.target.value));

  // Record an interrupted run if the player closes or refreshes the tab mid-game.
  window.addEventListener('pagehide', () => {
    if (isPlaying && !runRecorded) saveHistory('ABANDONED');
  });

  // Attempt intro music on page load. Browsers may block autoplay until the first user gesture.
  startAudio(introMusic);
  document.addEventListener('pointerdown',()=>{if((screen==='home'||screen==='about')&&!levelSelect.classList.contains('visible')&&!loadingScreen.classList.contains('visible'))startAudio(introMusic);},{once:true});
  syncSettingsUI();applyAudioSettings();updateTorchPresentation();renderHistory();
})();
