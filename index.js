// your code goes here
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// UI Setup
document.getElementById('bpmInput').value = 40;
const bpmInput = document.getElementById('bpmInput');
const addButton = document.getElementById('addRhythm');
const startStopButton = document.getElementById('startStop');
const rhythmsContainer = document.getElementById('rhythmsContainer');

// Constants
const UIOFFSET = 150;
const neonColors = ['#39ff14','#f72585','#4361ee','#ff006e','#4cc9f0','#ffea00','#ff5733'];
const frequencies = [261.63,329.63,392.00,493.88,587.33,659.25,783.99];
const STAR_COUNT = 200;

// State
let BPM = parseInt(bpmInput.value);
let rhythms = [3,4,5];
let lastAngles = [];
let running = false;
let animationId;
let startTime = 0;
let pausedOffset = 0;

// Starfield
let stars = [];
function initStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random()*window.innerWidth,
      y: UIOFFSET + Math.random()*(window.innerHeight-UIOFFSET),
      r: Math.random()*1.5,
      b: Math.random()
    });
  }
}

// Geometry
let width,height,centerX,centerY,baseRadius,spacing;
function resize() {
  width=canvas.width=window.innerWidth;
  height=canvas.height=window.innerHeight;
  const availH=height-UIOFFSET;
  const dim=Math.min(width,availH);
  centerX=width/2;
  centerY=UIOFFSET+availH/2;
  baseRadius=dim*0.15;
  spacing=rhythms.length>1?(dim/2-baseRadius-20)/(rhythms.length-1):0;
}
window.addEventListener('resize',()=>{resize();initStars();});
resize();initStars();

function revolutionTime(){return 60/BPM;}
function playClick(idx){
  const osc=audioCtx.createOscillator();const gain=audioCtx.createGain();
  osc.connect(gain);gain.connect(audioCtx.destination);
  osc.type='triangle';osc.frequency.value=frequencies[idx%frequencies.length];
  gain.gain.setValueAtTime(0.8,audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.2);
  osc.start();osc.stop(audioCtx.currentTime+0.2);
}

function updateRhythmsUI(){
  rhythmsContainer.innerHTML='';
  rhythms.forEach((beats,i)=>{
    const div=document.createElement('div');
    div.innerHTML=`Rhythm ${i+1}: <input type="number" class="beatInput" data-index="${i}" min="1" value="${beats}"> <button class="removeRhythm" data-index="${i}">Remove</button>`;
    rhythmsContainer.appendChild(div);
  });
}
function resetTracks(){lastAngles=rhythms.map(()=>0);resize();}

// Listeners
bpmInput.addEventListener('change',()=>BPM=parseInt(bpmInput.value));
addButton.addEventListener('click',()=>{rhythms.push(4);updateRhythmsUI();resetTracks();});
rhythmsContainer.addEventListener('change',e=>{if(e.target.classList.contains('beatInput')){rhythms[+e.target.dataset.index]=parseInt(e.target.value);resetTracks();}});
rhythmsContainer.addEventListener('click',e=>{if(e.target.classList.contains('removeRhythm')){rhythms.splice(+e.target.dataset.index,1);updateRhythmsUI();resetTracks();}});
startStopButton.addEventListener('click',()=>{
  const now=audioCtx.currentTime;
  if(!running){
    if(audioCtx.state==='suspended')audioCtx.resume();
    startTime=now-pausedOffset;
    resetTracks();
    draw();
    startStopButton.textContent='Stop';running=true;
  } else {
    cancelAnimationFrame(animationId);
    pausedOffset=now-startTime;
    startStopButton.textContent='Start';running=false;
  }
});
updateRhythmsUI();resetTracks();

// Main draw
function draw(){
  const now=audioCtx.currentTime;
  const raw=(now-startTime)/revolutionTime()*2*Math.PI;
  const disp=(raw-Math.PI/2+2*Math.PI)%(2*Math.PI);
  ctx.clearRect(0,0,width,height);

  // Draw starfield
  stars.forEach(s=>{
    s.b+=(Math.random()*0.02-0.01);
    if(s.b<0)s.b=0;if(s.b>1)s.b=1;
    ctx.beginPath();ctx.fillStyle=`rgba(255,255,255,${s.b})`;
    ctx.arc(s.x,s.y,s.r,0,2*Math.PI);ctx.fill();
  });

  let simHits=0;
  rhythms.forEach((sub,i)=>{
    const prev=lastAngles[i],curr=disp;
    for(let j=0;j<sub;j++){const m=j/sub*2*Math.PI;
      if((prev<=curr&&m>prev&&m<=curr)||(prev>curr&&(m>prev||m<=curr)))simHits++;}
  });

  rhythms.forEach((sub,i)=>{
    const rad=baseRadius+i*spacing;const col=neonColors[i%neonColors.length];
    const prev=lastAngles[i],curr=disp;
    ctx.beginPath();ctx.strokeStyle='#111';ctx.lineWidth=2;
    ctx.arc(centerX,centerY,rad,0,2*Math.PI);ctx.stroke();
    for(let j=0;j<sub;j++){
      const m=j/sub*2*Math.PI;const th=m-Math.PI/2;
      const x=centerX+Math.cos(th)*rad,y=centerY+Math.sin(th)*rad;
      const trig=(prev<=curr&&m>prev&&m<=curr)||(prev>curr&&(m>prev||m<=curr));
      if(trig)playClick(i);
      const blur=trig?60+simHits*20:15;const size=trig?26:14;
      ctx.beginPath();ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=blur;
      ctx.arc(x,y,size,0,2*Math.PI);ctx.fill();
    }
    lastAngles[i]=disp;
  });

  // Hand
  ctx.save();ctx.translate(centerX,centerY);ctx.rotate(disp);
  ctx.beginPath();ctx.moveTo(0,0);
  ctx.lineTo(0,-(baseRadius+(rhythms.length-1)*spacing+20));
  ctx.strokeStyle='#fff';ctx.lineWidth=4;
  ctx.shadowColor='#fff';ctx.shadowBlur=30+simHits*20;ctx.stroke();
  ctx.restore();

  animationId=requestAnimationFrame(draw);
}
