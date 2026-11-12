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
  const joystick = $('joystick');
  const stick = $('stick');
  const lookZone = $('lookZone');
  const mobileInteract = $('mobileInteract');
  const doorPrompt = $('doorPrompt');
  const objectiveLabel = $('objectiveLabel');
  const echoCountLabel = $('echoCount');
  const exitTrace = $('exitTrace');

  const HISTORY_KEY = 'dreadwalls.runHistory.v1';
  const OPTIONAL_ECHO_COUNT = 3;
  const DIFFICULTIES = {
    easy:{id:'easy',label:'EASY',mapSize:15,monsters:false,monsterInitialDelay:Infinity,monsterBaseInterval:Infinity,monsterMinInterval:Infinity,monsterSpeed:0,stareDamage:0,closeDamage:0,echoClues:false,torchFlicker:false,anomalies:false,fakeExitCount:0,playerSpeed:3.1},
    medium:{id:'medium',label:'MEDIUM',mapSize:27,monsters:true,monsterInitialDelay:32,monsterBaseInterval:27,monsterMinInterval:18,monsterSpeed:.78,stareDamage:6,closeDamage:10,echoClues:true,torchFlicker:false,anomalies:false,fakeExitCount:0,playerSpeed:2.8},
    impossible:{id:'impossible',label:'IMPOSSIBLE',mapSize:61,monsters:true,monsterInitialDelay:32,monsterBaseInterval:27,monsterMinInterval:18,monsterSpeed:1,stareDamage:10,closeDamage:15,echoClues:false,torchFlicker:true,anomalies:true,fakeExitCount:2,playerSpeed:2.65}
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
  let echoes = [];
  let echoesCollected=0;
  let loadingTimer=null, fakeDoorTimer=null;
  let anomalyUntil=0, nextAnomalyAt=48;
  let torchFlickerTimer=2, torchFlickerPower=1;
  let doorAimed = false;
  let doorImageReady = false;
  let wallImageReady = false;
  let floorImageReady = false;
  let moonImageReady = false;
  let floorTexturePixels = null;
  let floorTextureWidth = 0;
  let floorTextureHeight = 0;
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
  wallTexture.onload = () => { wallImageReady = true; };
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
  const moonTexture = new Image();
  moonTexture.onload = () => { moonImageReady = true; };
  moonTexture.onerror = () => { moonImageReady = false; };
  moonTexture.src = 'moon.png';

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const floorResolutionDivisor = mobile ? 4 : 3;
    floorBuffer.width = Math.max(1, Math.ceil(width / floorResolutionDivisor));
    floorBuffer.height = Math.max(1, Math.ceil(height / floorResolutionDivisor));
    floorBufferImage = floorBufferCtx.createImageData(floorBuffer.width, floorBuffer.height);
  }
  window.addEventListener('resize', () => {
    mobile = window.matchMedia('(pointer: coarse), (max-width: 760px)').matches;
    resize();
  });
  resize();

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

  // An entirely faceless silhouette: no eyes, mouth, or identifiable features.
  function drawEchoSprites(zBuffer, horizon) {
    for (const echo of echoes) {
      if (echo.collected) continue;
      const view = getObjectView(echo);
      if (view.distance > 14 || Math.abs(view.angle) > FOV * 0.92) continue;
      const rayIndex = Math.floor((0.5 + Math.tan(view.angle) / (2 * Math.tan(FOV / 2))) * zBuffer.length);
      const wallDistance = zBuffer[Math.max(0, Math.min(zBuffer.length - 1, rayIndex))];
      if (view.distance > wallDistance + 0.12) continue;
      const screenX = width * 0.5 + Math.tan(view.angle) / Math.tan(FOV / 2) * width * 0.5;
      const size=Math.max(12,Math.min(34,height/Math.max(1,view.distance)*.09));
      const screenY = horizon + Math.min(height * 0.30, height / (view.distance + 1) * 0.13);
      const pulse = 0.62 + Math.sin(elapsedSeconds * 3.4 + echo.x) * 0.16;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = 'rgba(178,78,68,.9)';
      ctx.shadowBlur = size * 1.3;
      ctx.strokeStyle='#f0a398';
      ctx.fillStyle='rgba(184,68,58,.52)';
      ctx.lineWidth = Math.max(1, size * 0.09);
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * 0.72, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - size);
      ctx.lineTo(screenX + size * 0.62, screenY);
      ctx.lineTo(screenX, screenY + size);
      ctx.lineTo(screenX - size * 0.62, screenY);
      ctx.closePath();
      ctx.fillStyle = '#d5a49a'; ctx.fill();
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

  function updateImpossibleEffects(dt){if(!currentDifficulty.anomalies){torchFlickerPower=1;anomalyUntil=0;return;}torchFlickerTimer-=dt;if(torchFlickerTimer<=0){if(torchFlickerPower>.72){torchFlickerPower=random(.2,.48);torchFlickerTimer=random(.07,.2);}else{torchFlickerPower=random(.82,1);torchFlickerTimer=random(2.4,5.2);}}if(elapsedSeconds>=nextAnomalyAt){anomalyUntil=elapsedSeconds+random(1.8,3.2);nextAnomalyAt=elapsedSeconds+random(38,58);}}
  function drawImpossibleAnomaly(){if(!currentDifficulty.anomalies||elapsedSeconds>=anomalyUntil)return;const p=Math.max(0,anomalyUntil-elapsedSeconds),f=.45+Math.abs(Math.sin(elapsedSeconds*19))*.35,x=width*(.28+Math.sin(elapsedSeconds*2.7)*.18),h=Math.min(height*.82,height*(.48+f*.12)),w=h*.22;ctx.save();ctx.globalAlpha=Math.min(.52,p*.22)*f;ctx.fillStyle='#010102';ctx.shadowColor='rgba(160,35,42,.7)';ctx.shadowBlur=24;ctx.beginPath();ctx.ellipse(x,height*.5-h*.31,w*.24,h*.10,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x-w*.18,height*.5-h*.23);ctx.lineTo(x-w*.52,height*.5-h*.05);ctx.lineTo(x-w*.30,height*.5+h*.43);ctx.lineTo(x+w*.30,height*.5+h*.43);ctx.lineTo(x+w*.52,height*.5-h*.05);ctx.lineTo(x+w*.18,height*.5-h*.23);ctx.closePath();ctx.fill();ctx.globalAlpha=.08+f*.08;ctx.fillStyle='#d9c5c5';for(let i=0;i<4;i++){const y=(Math.abs(Math.sin(elapsedSeconds*11+i*7.3))*height)|0;ctx.fillRect(0,y,width,1+(i%2));}ctx.restore();}
  function drawMonsterShadow(zBuffer, strip, horizon) {
    if (!monster || !monster.active) return;
    const view = getObjectView(monster);
    if (view.distance > 13 || Math.abs(view.angle) > FOV * 0.82) return;
    const rayIndex = Math.floor((0.5 + Math.tan(view.angle) / (2 * Math.tan(FOV / 2))) * zBuffer.length);
    const wallDistance = zBuffer[Math.max(0, Math.min(zBuffer.length - 1, rayIndex))];
    if (view.distance > wallDistance + 0.08) return;

    const screenX = width * 0.5 + Math.tan(view.angle) / Math.tan(FOV / 2) * width * 0.5;
    const spriteHeight = Math.min(height * 1.2, height / view.distance * 0.98);
    const spriteWidth = spriteHeight * 0.46;
    const top = horizon - spriteHeight * 0.88;
    const left = screenX - spriteWidth * 0.5;
    const light = Math.max(0.13, 1 - Math.abs(view.angle) / 0.8) * Math.max(0.2, 1 - view.distance / 10);

    ctx.save();
    ctx.globalAlpha = Math.min(.95, .58 + light * .36);
    ctx.fillStyle = '#010203';
    ctx.shadowColor = 'rgba(0,0,0,.95)';
    ctx.shadowBlur = Math.max(3, spriteWidth * .12);
    // Head: smooth blank oval, deliberately featureless.
    ctx.beginPath();
    ctx.ellipse(screenX, top + spriteHeight * .17, spriteWidth * .17, spriteHeight * .17, 0, 0, Math.PI * 2);
    ctx.fill();
    // Neck and shoulders merge into a single unnatural shadow shape.
    ctx.beginPath();
    ctx.moveTo(screenX - spriteWidth * .12, top + spriteHeight * .27);
    ctx.lineTo(screenX - spriteWidth * .49, top + spriteHeight * .39);
    ctx.lineTo(screenX - spriteWidth * .37, top + spriteHeight * .57);
    ctx.lineTo(screenX - spriteWidth * .23, top + spriteHeight * .49);
    ctx.lineTo(screenX - spriteWidth * .20, top + spriteHeight * .96);
    ctx.lineTo(screenX + spriteWidth * .20, top + spriteHeight * .96);
    ctx.lineTo(screenX + spriteWidth * .23, top + spriteHeight * .49);
    ctx.lineTo(screenX + spriteWidth * .38, top + spriteHeight * .57);
    ctx.lineTo(screenX + spriteWidth * .49, top + spriteHeight * .39);
    ctx.lineTo(screenX + spriteWidth * .12, top + spriteHeight * .27);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMoon(horizon) {
    if (!moonImageReady || player.pitch < 0.08 || horizon <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, Math.min(height, horizon));
    ctx.clip();
    const moonSize = Math.min(190, Math.max(72, Math.min(width, height) * 0.18));
    const aspect = moonTexture.naturalWidth / Math.max(1, moonTexture.naturalHeight);
    const moonWidth = moonSize * aspect;
    const moonHeight = moonSize;
    const moonX = width * 0.72;
    const moonY = height * (0.22 + Math.min(player.pitch, 0.72) * 0.20);
    const glow = ctx.createRadialGradient(moonX, moonY, moonSize * 0.12, moonX, moonY, moonSize * 1.35);
    glow.addColorStop(0, 'rgba(215,225,238,.18)');
    glow.addColorStop(1, 'rgba(215,225,238,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(moonX - moonSize * 1.4, moonY - moonSize * 1.4, moonSize * 2.8, moonSize * 2.8);
    ctx.globalAlpha = 0.96;
    ctx.drawImage(moonTexture, moonX - moonWidth * 0.5, moonY - moonHeight * 0.5, moonWidth, moonHeight);
    ctx.restore();
  }

  function drawTexturedFloor(horizon) {
    if (!floorImageReady || !floorTexturePixels || !floorBufferImage) return;
    const pixels = floorBufferImage.data;
    pixels.fill(0); // Transparent above the horizon so the ceiling and moon remain visible.
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
        const brightness = Math.min(1, 0.28 + 0.72 * beam * Math.exp(-rowDistance * 0.11));
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
    drawMoon(horizon);
    const floor = ctx.createLinearGradient(0, horizon, 0, height);
    floor.addColorStop(0, '#080b0d');
    floor.addColorStop(1, '#010203');
    ctx.fillStyle = floor;
    ctx.fillRect(0, Math.max(0, horizon), width, height - Math.max(0, horizon));
    drawTexturedFloor(horizon);

    const columns = Math.ceil(width / 2);
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
      const tp=currentDifficulty.torchFlicker?torchFlickerPower:1;
      const illumination=Math.pow(beam,1.65)*Math.pow(range,1.2)*tp;
      const sideShade = ray.side ? .66 : 1;

      if (wallImageReady && wallTexture.naturalWidth > 0) {
        const sx = Math.min(wallTexture.naturalWidth - 1, Math.floor(textureU * wallTexture.naturalWidth));
        ctx.save();
        ctx.globalAlpha = Math.min(1, (.035 + illumination * .96) * 1.48 * sideShade);
        ctx.drawImage(wallTexture, sx, 0, 1, wallTexture.naturalHeight, i * strip, top, strip + 1, wallHeight);
        ctx.restore();
        ctx.fillStyle = `rgba(0,0,0,${Math.max(.05, .965 - illumination * sideShade)})`;
        ctx.fillRect(i * strip, top, strip + 1, wallHeight);
      } else {
        const light = Math.floor(22 + illumination * 158);
        ctx.fillStyle = `rgb(${Math.floor(light * .66 * sideShade)},${Math.floor(light * .78 * sideShade)},${Math.floor(light * .88 * sideShade)})`;
        ctx.fillRect(i * strip, top, strip + 1, wallHeight);
      }
    }

    // A low-power flashlight hotspot and broad darkness at the edges.
    const glow = ctx.createRadialGradient(width * .5, horizon + height * .1, 1, width * .5, horizon + height * .18, height * .58);
    const tp=currentDifficulty.torchFlicker?torchFlickerPower:1;
    glow.addColorStop(0,'rgba(180,210,230,'+(.17*tp)+')');
    glow.addColorStop(.3,'rgba(105,145,165,'+(.065*tp)+')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, Math.max(0, horizon), width, height - Math.max(0, horizon));

    for(const door of exitDoors)drawDoorSprite(door,zBuffer,strip,horizon);
    drawEchoSprites(zBuffer,horizon);drawMonsterShadow(zBuffer,strip,horizon);drawMonsterPresence();drawImpossibleAnomaly();

    const vignette = ctx.createRadialGradient(width * .5, horizon, Math.min(width, height) * .05, width * .5, horizon, Math.max(width, height) * .76);
    vignette.addColorStop(0, 'rgba(0,0,0,.02)');
    vignette.addColorStop(.28, 'rgba(0,0,0,.22)');
    vignette.addColorStop(.58, 'rgba(0,0,0,.78)');
    vignette.addColorStop(1, 'rgba(0,0,0,.98)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function startAudio(track) {
    [introMusic, gameMusic].forEach(audio => {
      if (audio !== track) { audio.pause(); audio.currentTime = 0; }
    });
    if (!track) return;
    track.volume = .55;
    const promise = track.play();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  }
  function playMonsterSound() {
    try { monsterSound.pause(); monsterSound.currentTime = 0; monsterSound.volume = .85; const p = monsterSound.play(); if (p) p.catch(() => {}); } catch (_) {}
  }
  function stopFootsteps() {
    if (!footstepsAudio.paused) footstepsAudio.pause();
    try { if (footstepsAudio.currentTime !== 0) footstepsAudio.currentTime = 0; } catch (_) {}
  }
  function syncFootsteps(moving, movementSpeed) {
    if (!moving || !isPlaying || isPaused) { stopFootsteps(); return; }
    footstepsAudio.volume = 0.52;
    footstepsAudio.playbackRate = Math.max(0.72, Math.min(1.22, movementSpeed / player.speed));
    if (footstepsAudio.paused) {
      const promise = footstepsAudio.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    }
  }
  function stopAllAudio() {
    [introMusic, gameMusic, monsterSound, footstepsAudio].forEach(audio => { audio.pause(); audio.currentTime = 0; });
  }

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
    dashboard.classList.toggle('active', next === 'home' || next === 'about');
    gameScreen.classList.toggle('active', next === 'game' || next === 'paused' || next === 'exitOptions');
    deathScreen.classList.toggle('visible', next === 'dead');
    endingScreen.classList.toggle('visible', next === 'ending');
    exitModal.classList.toggle('visible', next === 'exitOptions');
    pauseModal.classList.toggle('visible', next === 'paused');
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
    nextMonsterAt=currentDifficulty.monsterInitialDelay;encounterCount=0;monster=null;placeEchoes();placeFakeExits();anomalyUntil=0;nextAnomalyAt=random(38,55);torchFlickerPower=1;torchFlickerTimer=random(1.8,3.2);
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
    isPaused = false;
    monster = null;
    stopFootsteps();
    if (document.pointerLockElement) document.exitPointerLock();
    setScreen('home');
    showAbout(false);
    startAudio(introMusic);
  }

  function updateHUD(){
    $('healthValue').textContent=String(Math.ceil(health));$('healthFill').style.width=Math.max(0,health)+'%';$('stopwatch').textContent=formatTime(elapsedSeconds);
    if(currentDifficulty.id==='impossible'){objectiveStatus.hidden=false;objectiveLabel.textContent='JUST LIVE';echoCountLabel.hidden=true;exitTrace.hidden=true;}
    else if(echoes.length){objectiveStatus.hidden=false;objectiveLabel.textContent='OPTIONAL · FIND 3 ECHOES';echoCountLabel.hidden=false;echoCountLabel.textContent=echoesCollected+' / '+OPTIONAL_ECHO_COUNT;const ready=echoesCollected>=OPTIONAL_ECHO_COUNT;exitTrace.hidden=!ready;if(ready){const b=normalizeAngle(Math.atan2(exitDoor.y-player.y,exitDoor.x-player.x)-player.angle),d=Math.abs(b)<.38?'AHEAD':Math.abs(b)>2.76?'BEHIND':(b<0?'LEFT':'RIGHT'),dist=Math.round(Math.hypot(exitDoor.x-player.x,exitDoor.y-player.y));exitTrace.textContent='EXIT TRACE · '+d+' · ABOUT '+dist+'M';}}
    else{objectiveStatus.hidden=true;exitTrace.hidden=true;}
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

  function spawnMonster() {
    // Search a short distance ahead for an open tile so the shadow never spawns inside a wall.
    const angles = [0, .14, -.14];
    let position = null;
    for (const offset of angles) {
      const angle = player.angle + offset;
      for (let d = 3.6; d >= 2.4; d -= .3) {
        const x = player.x + Math.cos(angle) * d;
        const y = player.y + Math.sin(angle) * d;
        if (!isWall(x, y) && !isWall(x + .2, y) && !isWall(x - .2, y) && !isWall(x, y + .2) && !isWall(x, y - .2) && lineOfSight(x, y)) {
          position = { x, y }; break;
        }
      }
      if (position) break;
    }
    if (!position) {
      nextMonsterAt = elapsedSeconds + getMonsterInterval();
      return;
    }
    monster = { x: position.x, y: position.y, active: true, elapsed: 0, escapeTime: 0, closeHit: false };
    encounterCount++;
    playMonsterSound();
  }

  function updateMonster(dt, forward, strafe) {
    if (!monster || !monster.active) return;
    monster.elapsed += dt;
    const view = getObjectView(monster);
    const visible = view.distance < 10 && Math.abs(view.angle) < .17 && lineOfSight(monster.x, monster.y);
    if (visible) {
      health=Math.max(0,health-currentDifficulty.stareDamage*dt);
    }

    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    const distance = Math.max(.001, Math.hypot(dx, dy));
    const escalation = Math.min(0.12, Math.max(0, encounterCount - 1) * 0.015);
    const speed=(visible?.38+escalation*.35:(monster.elapsed<3.5?.48:.82+escalation))*currentDifficulty.monsterSpeed;
    const mx = (dx / distance) * speed * dt;
    const my = (dy / distance) * speed * dt;
    if (!isWall(monster.x + mx, monster.y)) monster.x += mx;
    if (!isWall(monster.x, monster.y + my)) monster.y += my;

    if (distance < .85 && !monster.closeHit) {
      health=Math.max(0,health-currentDifficulty.closeDamage);
      monster.closeHit = true;
    }

    const isMoving = Math.abs(forward) + Math.abs(strafe) > .35;
    const lookingAway = Math.abs(view.angle) > .55;
    if (lookingAway && isMoving && distance > 3.4) monster.escapeTime += dt;
    else monster.escapeTime = Math.max(0, monster.escapeTime - dt * .35);

    if (monster.escapeTime > 4.2 || monster.elapsed > 18 || distance < .5) {
      monster = null;
      nextMonsterAt = elapsedSeconds + getMonsterInterval();
    }
    if (health <= 0) endRunByDeath();
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
    const actualDistance = Math.hypot(player.x - previousX, player.y - previousY);
    syncFootsteps(actualDistance > 0.0005, dt > 0 ? actualDistance / dt : 0);
    collectEchoes();

    if(currentDifficulty.monsters&&!monster&&elapsedSeconds>=nextMonsterAt)spawnMonster();updateMonster(dt,forward,strafe);updateImpossibleEffects(dt);
    if (!isPlaying) return;
    updateDoorAim();
    updateHUD();
  }

  function interactWithDoor(){if(!isPlaying||!doorAimed||!targetedDoor)return;if(!targetedDoor.fake){openExitOptions();return;}stopFootsteps();isPaused=true;fakeDoorToast.classList.add('visible');if(currentDifficulty.anomalies)anomalyUntil=elapsedSeconds+2.2;if(fakeDoorTimer)clearTimeout(fakeDoorTimer);fakeDoorTimer=setTimeout(()=>{fakeDoorToast.classList.remove('visible');if(!isPlaying)return;isPaused=false;setScreen('game');if(!mobile&&canvas.requestPointerLock){try{canvas.requestPointerLock();}catch(_){}}},1750);}
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
    stopFootsteps();
    if (document.pointerLockElement) document.exitPointerLock();
    setScreen('ending');
    // The ending remains on screen for roughly 12.4 seconds, then returns to the menu.
    const endingCopy = $('endingCopy');
    endingCopy.style.animation = 'none';
    void endingCopy.offsetWidth;
    endingCopy.style.animation = 'endingReveal 12.4s ease forwards';
    endingTimer = setTimeout(() => returnHome(), 12600);
  }

  function endRunByDeath() {
    if (!isPlaying) return;
    saveHistory('FOUND');
    isPlaying = false;
    isPaused = false;
    monster = null;
    stopFootsteps();
    if (document.pointerLockElement) document.exitPointerLock();
    setScreen('dead');
    deathTimer = setTimeout(() => returnHome(), 3600);
  }

  function pauseGame() {
    if (!isPlaying || isPaused) return;
    stopFootsteps();
    isPaused = true;
    setScreen('paused');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function resumeGame() {
    if (!isPlaying) return;
    isPaused = false;
    setScreen('game');
    if (!mobile && canvas.requestPointerLock) {
      try { canvas.requestPointerLock(); } catch (_) {}
    }
  }

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
  window.addEventListener('keydown', event => {
    keys[event.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'KeyE' || event.code === 'Enter') {
      if (doorAimed) interactWithDoor();
    }
    if (event.code === 'Escape' && isPlaying && !isPaused && !exitModal.classList.contains('visible')) {
      pauseGame();
    }
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
    const mouseX = Math.max(-80, Math.min(80, event.movementX));
    const mouseY = Math.max(-80, Math.min(80, event.movementY));
    player.angle += mouseX * MOUSE_LOOK_SENSITIVITY;
    player.pitch = Math.max(-.72, Math.min(.72, player.pitch - mouseY * MOUSE_PITCH_SENSITIVITY));
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
    player.angle += dragX * .0085;
    player.pitch = Math.max(-.72, Math.min(.72, player.pitch - dragY * .0065));
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
  $('pauseButton').addEventListener('click', pauseGame);
  $('resumeButton').addEventListener('click', resumeGame);
  $('homeButton').addEventListener('click', () => { saveHistory('ABANDONED'); returnHome(); });

  // Record an interrupted run if the player closes or refreshes the tab mid-game.
  window.addEventListener('pagehide', () => {
    if (isPlaying && !runRecorded) saveHistory('ABANDONED');
  });

  // Attempt intro music on page load. Browsers may block autoplay until the first user gesture.
  startAudio(introMusic);
  document.addEventListener('pointerdown',()=>{if((screen==='home'||screen==='about')&&!levelSelect.classList.contains('visible')&&!loadingScreen.classList.contains('visible'))startAudio(introMusic);},{once:true});
  renderHistory();
})();
