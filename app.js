let initializeApp, getAuth, signInAnonymously, onAuthStateChanged;
let getDatabase, ref, set, get, update, remove, onValue, onDisconnect, serverTimestamp;

const $ = (id) => document.getElementById(id);
const LS = {
  questions: 'classroomTycoonQuestionsV2',
  settings: 'classroomTycoonSettingsV2',
  lastRoom: 'classroomTycoonLastRoom',
  playerName: 'classroomTycoonPlayerName',
  cache: 'classroomTycoonGameCache',
  sound: 'classroomTycoonSound'
};

const defaultSettings = { easyReward:25000, mediumReward:50000, hardReward:100000, startingCash:100000, eventChance:.22 };
const demoQuestions = [
  ['25% dari 320 adalah...', ['60','70','80','90'], 2, 'easy', '25/100 × 320 = 80'],
  ['Hasil dari 18 × 7 adalah...', ['116','126','136','146'], 1, 'easy', '18 × 7 = 126'],
  ['3/4 dari 200 adalah...', ['100','125','150','175'], 2, 'easy', '3/4 × 200 = 150'],
  ['Jika x + 9 = 21, nilai x adalah...', ['10','11','12','13'], 2, 'easy', 'x = 12'],
  ['FPB dari 24 dan 36 adalah...', ['6','8','12','18'], 2, 'medium', 'FPB = 12'],
  ['KPK dari 8 dan 12 adalah...', ['16','20','24','48'], 2, 'medium', 'KPK = 24'],
  ['Nilai 2³ × 2² adalah...', ['16','24','32','64'], 2, 'medium', '2⁵ = 32'],
  ['0,75 dalam bentuk pecahan paling sederhana adalah...', ['1/2','2/3','3/4','4/5'], 2, 'medium', '75/100 = 3/4'],
  ['Rata-rata dari 6, 8, 10, 12 adalah...', ['8','9','10','11'], 1, 'medium', '36 ÷ 4 = 9'],
  ['Jika 5 buku berharga Rp40.000, harga 8 buku adalah...', ['Rp56.000','Rp60.000','Rp64.000','Rp72.000'], 2, 'medium', 'Satu buku Rp8.000'],
  ['√144 + √81 = ...', ['19','20','21','22'], 2, 'hard', '12 + 9 = 21'],
  ['Jika 3x - 7 = 20, x = ...', ['7','8','9','10'], 2, 'hard', '3x = 27 sehingga x = 9'],
  ['Suku ke-10 barisan 4, 7, 10, ... adalah...', ['28','30','31','34'], 2, 'hard', '4 + 9(3) = 31'],
  ['15% dari suatu bilangan adalah 45. Bilangan itu...', ['250','275','300','325'], 2, 'hard', '45 ÷ 0,15 = 300'],
  ['(3² × 3³) ÷ 3² = ...', ['9','18','27','81'], 2, 'hard', '3³ = 27']
].map((x,i)=>({id: Date.now()+i, question:x[0], options:x[1], answer:x[2], difficulty:x[3], reward:null, explanation:x[4]}));

const businesses = [
  {id:'stall', name:'Street Stall', icon:'🛒', price:75000, baseIncome:8000, baseUpgrade:50000},
  {id:'shop', name:'Mini Shop', icon:'🏪', price:150000, baseIncome:15000, baseUpgrade:80000},
  {id:'cafe', name:'Cafe', icon:'☕', price:300000, baseIncome:28000, baseUpgrade:120000},
  {id:'restaurant', name:'Restaurant', icon:'🍽️', price:600000, baseIncome:52000, baseUpgrade:190000},
  {id:'supermarket', name:'Supermarket', icon:'🏬', price:1000000, baseIncome:85000, baseUpgrade:300000},
  {id:'mall', name:'Shopping Mall', icon:'🏢', price:2000000, baseIncome:150000, baseUpgrade:500000},
  {id:'empire', name:'Business Empire', icon:'🏙️', price:4000000, baseIncome:280000, baseUpgrade:900000}
];

const shopItems = [
  {id:'hint', icon:'🎯', name:'Hint', price:40000, desc:'Hilangkan dua jawaban salah.'},
  {id:'double', icon:'⚡', name:'Double Profit', price:85000, desc:'Passive income x2 selama 2 round.'},
  {id:'insurance', icon:'🛡️', name:'Insurance', price:70000, desc:'Blok satu random event negatif.'},
  {id:'streak', icon:'🔥', name:'Streak Saver', price:55000, desc:'Satu jawaban salah tidak memutus streak.'}
];

let questions = loadJSON(LS.questions, demoQuestions);
let settings = {...defaultSettings, ...loadJSON(LS.settings,{})};
let game = null;
let mode = 'offline';
let currentRoom = null;
let currentRole = null;
let roomUnsub = null;
let dashUnsub = null;
let cloud = {ready:false, app:null, auth:null, db:null, user:null};
let answerLocked = false;
let livePlayers = {};

function loadJSON(key, fallback){ try { const x=JSON.parse(localStorage.getItem(key)); return x ?? fallback; } catch { return fallback; } }
function saveJSON(key,val){ localStorage.setItem(key,JSON.stringify(val)); }
function money(v){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.round(Number(v)||0)); }
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function shuffle(a){ const x=[...a]; for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];} return x; }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2500); }
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); $('screen-'+id).classList.add('active'); window.scrollTo({top:0,behavior:'smooth'}); }
function modal(title,body){ $('modal-root').innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="btn outline small-btn" data-close-modal>✕</button></div>${body}</div></div>`; document.querySelector('[data-close-modal]')?.addEventListener('click',closeModal); }
function closeModal(){ $('modal-root').innerHTML=''; }
function byId(selector){ return document.querySelector(selector); }

// ---------- Firebase ----------
function configLooksValid(){
  const c=window.CLASSROOM_TYCOON_FIREBASE_CONFIG||{};
  return c.apiKey && !String(c.apiKey).includes('PASTE_') && c.projectId && !String(c.projectId).includes('PASTE_') && c.databaseURL;
}
async function initCloud(){
  const status=$('firebase-status');
  if(!configLooksValid()){
    status.innerHTML='⚙️ <b>Online mode belum diaktifkan.</b> Isi <code>firebase-config.js</code>. Mode offline tetap bisa dimainkan.';
    $('btn-create-room').disabled=true; $('btn-join-room').disabled=true; return;
  }
  try{
    if(!initializeApp){
      const [appMod, authMod, dbMod] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js')
      ]);
      initializeApp=appMod.initializeApp;
      getAuth=authMod.getAuth; signInAnonymously=authMod.signInAnonymously; onAuthStateChanged=authMod.onAuthStateChanged;
      getDatabase=dbMod.getDatabase; ref=dbMod.ref; set=dbMod.set; get=dbMod.get; update=dbMod.update; remove=dbMod.remove; onValue=dbMod.onValue; onDisconnect=dbMod.onDisconnect; serverTimestamp=dbMod.serverTimestamp;
    }
    cloud.app=initializeApp(window.CLASSROOM_TYCOON_FIREBASE_CONFIG);
    cloud.auth=getAuth(cloud.app); cloud.db=getDatabase(cloud.app);
    await signInAnonymously(cloud.auth);
    await new Promise(resolve=>{
      const stop=onAuthStateChanged(cloud.auth,u=>{ if(u){cloud.user=u;cloud.ready=true;stop();resolve();} });
    });
    status.innerHTML='🟢 <b>Online Classroom ready.</b> Room Code + live leaderboard aktif.';
  }catch(err){
    console.error(err); status.textContent='🔴 Firebase gagal terhubung: '+err.message;
  }
}
async function requireCloud(){ if(!cloud.ready){ await initCloud(); } if(!cloud.ready) throw new Error('Firebase belum dikonfigurasi.'); }
function cleanupListeners(){ if(roomUnsub){roomUnsub();roomUnsub=null;} if(dashUnsub){dashUnsub();dashUnsub=null;} }

// ---------- Navigation ----------
document.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>show(btn.dataset.go)));
$('btn-create-room').addEventListener('click',async()=>{try{await requireCloud();show('create-room')}catch(e){toast(e.message)}});
$('btn-join-room').addEventListener('click',async()=>{try{await requireCloud();$('join-name').value=localStorage.getItem(LS.playerName)||'';show('join-room')}catch(e){toast(e.message)}});
$('btn-start-offline').addEventListener('click',startOffline);
$('btn-confirm-create').addEventListener('click',createRoom);
$('btn-confirm-join').addEventListener('click',joinRoom);
$('btn-copy-code').addEventListener('click',()=>navigator.clipboard?.writeText(currentRoom||'').then(()=>toast('Room code copied.')));
$('btn-host-start').addEventListener('click',hostStartGame);
$('btn-close-room').addEventListener('click',closeRoom);
$('btn-leave-room').addEventListener('click',leaveRoom);
$('btn-end-game').addEventListener('click',endOnlineGame);
$('btn-q-continue').addEventListener('click',continueAfterAnswer);
$('btn-next-round').addEventListener('click',nextRound);
$('btn-live-score').addEventListener('click',openLiveScore);
$('btn-open-shop').addEventListener('click',openShop);
$('sound-toggle').addEventListener('click',toggleSound);
window.addEventListener('online',()=>{$('net-pill').className='pill neutral';$('net-pill').textContent='● ONLINE'; if(mode==='online')syncPlayer();});
window.addEventListener('offline',()=>{$('net-pill').className='pill offline';$('net-pill').textContent='● OFFLINE';toast('Connection lost. Progress disimpan lokal.');});

// ---------- Question bank ----------
function rewardFor(q){ return q.reward || settings[q.difficulty+'Reward'] || 25000; }
function renderTeacher(){
  $('teacher-q-count').textContent=`${questions.length} Questions`; $('teacher-question-list').innerHTML='';
  questions.forEach((q,i)=>{
    const div=document.createElement('div'); div.className='question-item';
    div.innerHTML=`<div><b>#${i+1} ${esc(q.question)}</b><small>${q.difficulty.toUpperCase()} • ${money(rewardFor(q))}</small></div><div class="button-row"><button class="btn soft small-btn" data-edit="${q.id}">Edit</button><button class="btn danger small-btn" data-del="${q.id}">Delete</button></div>`;
    $('teacher-question-list').appendChild(div);
  });
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editQuestion(Number(b.dataset.edit)));
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>deleteQuestion(Number(b.dataset.del)));
}
$('btn-save-question').addEventListener('click',saveQuestion);
$('btn-clear-question').addEventListener('click',clearQuestionEditor);
document.querySelector('[data-go="teacher"]').addEventListener('click',renderTeacher);
function saveQuestion(){
  const opts=[$('ed-a').value.trim(),$('ed-b').value.trim(),$('ed-c').value.trim(),$('ed-d').value.trim()];
  const qtxt=$('ed-question').value.trim(); if(!qtxt||opts.some(x=>!x)) return toast('Lengkapi question dan semua opsi.');
  const obj={id:Number($('edit-id').value)||Date.now(),question:qtxt,options:opts,answer:Number($('ed-answer').value),difficulty:$('ed-diff').value,reward:Number($('ed-reward').value)||null,explanation:$('ed-exp').value.trim()};
  const i=questions.findIndex(q=>q.id===obj.id); if(i>=0)questions[i]=obj; else questions.push(obj);
  saveJSON(LS.questions,questions); clearQuestionEditor(); renderTeacher(); toast('Question saved.');
}
function editQuestion(id){
  const q=questions.find(x=>x.id===id); if(!q)return; $('edit-id').value=q.id; $('ed-question').value=q.question; ['ed-a','ed-b','ed-c','ed-d'].forEach((id,i)=>$(id).value=q.options[i]||''); $('ed-answer').value=q.answer; $('ed-diff').value=q.difficulty; $('ed-reward').value=rewardFor(q); $('ed-exp').value=q.explanation||''; $('editor-heading').textContent='Edit Question'; window.scrollTo({top:0,behavior:'smooth'});
}
function deleteQuestion(id){ if(!confirm('Hapus pertanyaan ini?'))return; questions=questions.filter(q=>q.id!==id); saveJSON(LS.questions,questions); renderTeacher(); }
function clearQuestionEditor(){ $('edit-id').value=''; $('ed-question').value=''; ['ed-a','ed-b','ed-c','ed-d','ed-exp'].forEach(id=>$(id).value=''); $('ed-answer').value='0'; $('ed-diff').value='easy'; $('ed-reward').value=settings.easyReward; $('editor-heading').textContent='Add Question'; }

// ---------- Online rooms ----------
function roomCode(){ const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join(''); }
function pickQuestions(diff,count){ let pool=questions; if(diff!=='mixed') pool=pool.filter(q=>q.difficulty===diff); if(!pool.length) return []; return shuffle(pool).slice(0,Math.min(Number(count),pool.length)); }
async function uniqueRoomCode(){ for(let i=0;i<8;i++){const c=roomCode();const s=await get(ref(cloud.db,`rooms/${c}`));if(!s.exists())return c;} throw new Error('Gagal membuat room code. Coba lagi.'); }
async function createRoom(){
  try{
    await requireCloud(); const pool=pickQuestions($('host-diff').value,$('host-count').value); if(!pool.length)return toast('Question bank tidak cocok dengan difficulty.');
    const code=await uniqueRoomCode(); currentRoom=code; currentRole='host'; mode='online';
    const payload={hostId:cloud.user.uid,hostName:$('host-name').value.trim()||'Teacher',status:'waiting',locked:false,maxPlayers:Number($('host-cap').value),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),settings:{questionCount:pool.length,difficulty:$('host-diff').value,startingCash:Number($('host-cash').value)||100000,selfPaced:true},questions:pool,players:{}};
    await set(ref(cloud.db,`rooms/${code}`),payload); localStorage.setItem(LS.lastRoom,code); attachHostLobby(code); show('host-lobby');
  }catch(e){console.error(e);toast(e.message);}
}
function attachHostLobby(code){
  cleanupListeners(); $('host-room-code').textContent=code; $('host-room-title').textContent=`Room ${code}`;
  roomUnsub=onValue(ref(cloud.db,`rooms/${code}`),snap=>{
    if(!snap.exists()){toast('Room sudah ditutup.');show('home');return;} const room=snap.val(); livePlayers=room.players||{}; renderHostLobby(room);
    if(room.status==='playing' && $('screen-host-dashboard').classList.contains('active')===false){attachDashboard(code);show('host-dashboard');}
  });
}
function renderHostLobby(room){
  const players=Object.values(room.players||{}); $('host-player-count').textContent=players.length; $('host-room-status').textContent=String(room.status||'waiting').toUpperCase(); $('host-player-list').innerHTML=players.length?'':'<p>Belum ada player.</p>';
  players.forEach(p=>{const d=document.createElement('div');d.className='player-chip';d.innerHTML=`<b>${esc(p.name)}</b><span class="tag ${p.status==='online'?'green':''}">${esc(p.status||'online')}</span>`;$('host-player-list').appendChild(d);});
}
async function hostStartGame(){ try{if(Object.keys(livePlayers).length<1)return toast('Belum ada player.');await update(ref(cloud.db,`rooms/${currentRoom}`),{status:'playing',startedAt:serverTimestamp(),updatedAt:serverTimestamp()});attachDashboard(currentRoom);show('host-dashboard');}catch(e){toast(e.message)} }
async function closeRoom(){ if(!currentRoom||!confirm('Tutup room ini?'))return;try{await remove(ref(cloud.db,`rooms/${currentRoom}`));cleanupListeners();currentRoom=null;show('home')}catch(e){toast(e.message)} }
async function joinRoom(){
  try{
    await requireCloud(); const code=$('join-code').value.trim().toUpperCase(); const name=$('join-name').value.trim(); if(code.length!==6||!name)return toast('Masukkan room code dan nama tim.');
    const snap=await get(ref(cloud.db,`rooms/${code}`)); if(!snap.exists())return toast('ROOM NOT FOUND'); const room=snap.val();
    if(room.locked)return toast('ROOM IS LOCKED'); if(room.status!=='waiting')return toast(room.status==='finished'?'GAME HAS ENDED':'GAME ALREADY STARTED');
    const players=room.players||{}; if(Object.keys(players).length>=Number(room.maxPlayers||40))return toast('ROOM FULL');
    const duplicate=Object.entries(players).some(([uid,p])=>uid!==cloud.user.uid && String(p.name).toLowerCase()===name.toLowerCase()); if(duplicate)return toast('Nama team sudah dipakai.');
    currentRoom=code;currentRole='player';mode='online';localStorage.setItem(LS.playerName,name);localStorage.setItem(LS.lastRoom,code);
    const pRef=ref(cloud.db,`rooms/${code}/players/${cloud.user.uid}`);
    await set(pRef,{name,cash:Number(room.settings?.startingCash||100000),xp:0,streak:0,correct:0,wrong:0,round:0,businessValue:0,netWorth:Number(room.settings?.startingCash||100000),status:'online',finished:false,lastSeen:serverTimestamp()});
    await registerPresence(code);
    attachStudentRoom(code);show('student-lobby');
  }catch(e){console.error(e);toast(e.message);}
}
function attachStudentRoom(code){
  cleanupListeners(); $('student-room-code').textContent=`ROOM ${code}`;
  roomUnsub=onValue(ref(cloud.db,`rooms/${code}`),snap=>{
    if(!snap.exists()){toast('Room sudah ditutup.');show('home');return;} const room=snap.val(); livePlayers=room.players||{}; renderStudentLobby(room);
    if(room.status==='playing' && (!game || game.roomCode!==code)){ startOnlinePlayer(room); }
    if(room.status==='finished' && game && game.roomCode===code && !$('screen-result').classList.contains('active')) finishGame(false);
  });
}
function renderStudentLobby(room){ $('student-lobby-list').innerHTML=''; Object.values(room.players||{}).forEach(p=>{const d=document.createElement('div');d.className='player-chip';d.innerHTML=`<b>${esc(p.name)}</b><span class="tag green">${esc(p.status||'online')}</span>`;$('student-lobby-list').appendChild(d);}); }
async function registerPresence(code){
  if(!cloud.ready||!cloud.user||!code)return; const pRef=ref(cloud.db,`rooms/${code}/players/${cloud.user.uid}`);
  try{await update(pRef,{status:'online',lastSeen:serverTimestamp()});await onDisconnect(pRef).update({status:'offline',lastSeen:serverTimestamp()});}catch(e){console.warn('presence',e);}
}
async function leaveRoom(){ if(currentRoom&&cloud.ready&&cloud.user){try{await remove(ref(cloud.db,`rooms/${currentRoom}/players/${cloud.user.uid}`));}catch{}}cleanupListeners();currentRoom=null;currentRole=null;game=null;show('home'); }
function attachDashboard(code){
  if(dashUnsub)dashUnsub(); $('dash-room').textContent=`Room ${code}`;
  dashUnsub=onValue(ref(cloud.db,`rooms/${code}`),snap=>{if(!snap.exists())return;const room=snap.val();livePlayers=room.players||{};renderDashboard(room);});
}
function renderDashboard(room){
  const ps=sortedPlayers(room.players||{}); const finished=ps.filter(p=>p.finished).length; const avg=ps.length?Math.round(ps.reduce((a,p)=>a+accuracy(p),0)/ps.length):0;
  $('dash-players').textContent=ps.length;$('dash-finished').textContent=finished;$('dash-accuracy').textContent=avg+'%';$('dash-status').textContent=String(room.status||'playing').toUpperCase();$('dash-table').innerHTML='';
  ps.forEach((p,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${i+1}</td><td><b>${esc(p.name)}</b></td><td>${Number(p.round||0)}/${Number(room.settings?.questionCount||0)}</td><td>${Number(p.correct||0)}</td><td>${accuracy(p)}%</td><td>${money(p.cash)}</td><td>${money(p.businessValue)}</td><td><b>${money(p.netWorth)}</b></td><td>${esc(p.finished?'finished':p.status||'online')}</td>`;$('dash-table').appendChild(tr);});
}
async function endOnlineGame(){ if(!currentRoom)return; try{await update(ref(cloud.db,`rooms/${currentRoom}`),{status:'finished',finishedAt:serverTimestamp(),updatedAt:serverTimestamp()});toast('Game ended. Final leaderboard locked.');}catch(e){toast(e.message)} }

// ---------- Gameplay ----------
function startOffline(){ const pool=pickQuestions($('offline-diff').value,$('offline-count').value);if(!pool.length)return toast('Tidak ada soal pada difficulty tersebut.');mode='offline';currentRoom=null;currentRole='player';startGame(pool,$('offline-name').value.trim()||'Team Alpha',Number($('offline-cash').value)||100000,null); }
function startOnlinePlayer(room){
  const p=room.players?.[cloud.user.uid]||{}; const name=p.name || localStorage.getItem(LS.playerName)||'Player'; const pool=room.questions?Object.values(room.questions):[];
  const cached=loadJSON(LS.cache,null);
  if(cached?.room===currentRoom && cached?.mode==='online' && cached.game && !cached.game.finished){
    game=cached.game;game.questions=pool;game.name=name;game.roomCode=currentRoom;mode='online';
  }else{
    game={name,questions:pool,idx:Number(p.idx||0),cash:Number(p.cash??room.settings?.startingCash??100000),xp:Number(p.xp||0),streak:Number(p.streak||0),correct:Number(p.correct||0),wrong:Number(p.wrong||0),totalEarned:0,owned:p.owned||{},inventory:p.inventory||{hint:0,insurance:0,streak:0},doubleRounds:Number(p.doubleRounds||0),roomCode:currentRoom,finished:!!p.finished,phase:p.phase||'question'};
  }
  if(game.phase==='business'){renderBusinesses();show('business');}else{game.phase='question';renderQuestion();show('game');}
  syncPlayer();
}
function startGame(pool,name,startCash,roomCode){
  game={name,questions:pool,idx:0,cash:startCash,xp:0,streak:0,correct:0,wrong:0,totalEarned:0,owned:{},inventory:{hint:0,insurance:0,streak:0},doubleRounds:0,roomCode,finished:false,phase:'question'};
  saveGameCache();renderQuestion();show('game');syncPlayer();
}
function multiplier(streak){if(streak>=8)return 2;if(streak>=5)return 1.5;if(streak>=3)return 1.25;if(streak>=2)return 1.1;return 1;}
function renderQuestion(){
  answerLocked=false;const q=game.questions[game.idx];if(!q){return finishGame();}updateGameHUD();$('q-diff').textContent=String(q.difficulty||'easy').toUpperCase();$('q-reward').textContent='💰 '+money(rewardFor(q));$('q-live').textContent=mode==='online'?`LIVE • ${currentRoom}`:'OFFLINE';$('q-text').textContent=q.question;$('q-feedback').classList.add('hidden');$('btn-q-continue').classList.add('hidden');$('q-options').innerHTML='';
  q.options.forEach((o,i)=>{const b=document.createElement('button');b.className='answer';b.innerHTML=`<b>${String.fromCharCode(65+i)}.</b> ${esc(o)}`;b.onclick=()=>answerQuestion(i,b);$('q-options').appendChild(b);});
}
function answerQuestion(choice,button){
  if(answerLocked)return;answerLocked=true;const q=game.questions[game.idx];const opts=[...document.querySelectorAll('.answer')];opts.forEach(x=>x.classList.add('disabled'));opts[q.answer]?.classList.add('correct');if(choice!==q.answer)button?.classList.add('wrong');$('q-feedback').classList.remove('hidden');
  if(choice===Number(q.answer)){
    game.correct++;game.streak++;const m=multiplier(game.streak);const gain=Math.round(rewardFor(q)*m);game.cash+=gain;game.totalEarned+=gain;game.xp+=10;$('q-feedback').innerHTML=`<b style="color:#15803d">✅ CORRECT!</b><br>+ ${money(gain)} ${m>1?`• Streak x${m}`:''}<br><small>${esc(q.explanation||'')}</small>`;
  }else{
    game.wrong++;if(game.inventory.streak>0){game.inventory.streak--;$('q-feedback').innerHTML=`<b style="color:#b91c1c">❌ NOT QUITE!</b><br>Streak Saver aktif. Jawaban benar: <b>${String.fromCharCode(65+Number(q.answer))}. ${esc(q.options[q.answer])}</b>`;}else{game.streak=0;$('q-feedback').innerHTML=`<b style="color:#b91c1c">❌ NOT QUITE!</b><br>Jawaban benar: <b>${String.fromCharCode(65+Number(q.answer))}. ${esc(q.options[q.answer])}</b><br><small>${esc(q.explanation||'')}</small>`;}
  }
  game.phase='feedback';updateGameHUD();saveGameCache();syncPlayer();$('btn-q-continue').classList.remove('hidden');
}
function continueAfterAnswer(){ applyPassiveIncome();game.phase='business';renderBusinesses();show('business');saveGameCache();syncPlayer(); }
function nextRound(){
  if(game.idx>=game.questions.length-1)return finishGame();
  maybeRandomEvent(()=>{game.idx++;game.phase='question';renderQuestion();show('game');saveGameCache();syncPlayer();});
}
function totalIncome(){ let t=0;businesses.forEach(b=>{const o=game?.owned?.[b.id];if(o)t+=Math.round(b.baseIncome*Math.pow(1.4,o.level-1));});if(game?.doubleRounds>0)t*=2;return t; }
function businessValue(){ if(!game)return 0;let v=0;businesses.forEach(b=>{const o=game.owned[b.id];if(o){v+=b.price;for(let l=1;l<o.level;l++)v+=upgradeCost(b,l);}});return v; }
function netWorth(){ return Math.max(0,Math.round((game?.cash||0)+businessValue())); }
function upgradeCost(b,currentLevel){return Math.round(b.baseUpgrade*Math.pow(1.5,currentLevel-1));}
function applyPassiveIncome(){const inc=totalIncome();if(inc>0){game.cash+=inc;game.totalEarned+=inc;toast('Passive income + '+money(inc));}if(game.doubleRounds>0)game.doubleRounds--;saveGameCache();}
function updateGameHUD(){ if(!game)return;$('g-name').textContent=game.name;$('g-cash').textContent=money(game.cash);$('g-value').textContent=money(businessValue());$('g-income').textContent=money(totalIncome());$('g-streak').textContent=game.streak;$('g-round').textContent=`${game.idx+1}/${game.questions.length}`;updateCity(); }
function renderBusinesses(){
  $('business-metrics').innerHTML=metricHTML('💰 CASH',money(game.cash))+metricHTML('📈 INCOME',money(totalIncome())+'/round')+metricHTML('🏢 VALUE',money(businessValue()))+metricHTML('🔥 STREAK',game.streak);
  $('business-list').innerHTML='';businesses.forEach(b=>{const o=game.owned[b.id];const d=document.createElement('div');d.className='business-card';if(!o){d.innerHTML=`<div class="icon">${b.icon}</div><h3>${b.name}</h3><p>Purchase Price</p><strong>${money(b.price)}</strong><div class="button-row"><button class="btn primary small-btn" data-buy="${b.id}">BUY</button></div>`;}else{const inc=Math.round(b.baseIncome*Math.pow(1.4,o.level-1));const cost=upgradeCost(b,o.level);d.innerHTML=`<div class="icon">${b.icon}</div><h3>${b.name}</h3><p>Level ${o.level} • ${money(inc)}/round</p><strong>${o.level>=5?'MAX LEVEL':'Upgrade '+money(cost)}</strong><div class="button-row"><button class="btn soft small-btn" data-upgrade="${b.id}" ${o.level>=5?'disabled':''}>UPGRADE</button></div>`;}$('business-list').appendChild(d);});
  document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buyBusiness(b.dataset.buy));document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>upgradeBusiness(b.dataset.upgrade));
}
function buyBusiness(id){const b=businesses.find(x=>x.id===id);if(!b||game.owned[id])return;if(game.cash<b.price)return toast('Cash belum cukup.');game.cash-=b.price;game.owned[id]={level:1};renderBusinesses();updateGameHUD();saveGameCache();syncPlayer();toast(`${b.icon} ${b.name} dibeli!`);}
function upgradeBusiness(id){const b=businesses.find(x=>x.id===id),o=game.owned[id];if(!b||!o||o.level>=5)return;const c=upgradeCost(b,o.level);if(game.cash<c)return toast('Cash belum cukup.');game.cash-=c;o.level++;renderBusinesses();updateGameHUD();saveGameCache();syncPlayer();toast(`${b.name} naik ke Level ${o.level}`);}
function updateCity(){if(!game)return;const count=Object.keys(game.owned).length;const stage=Math.max(1,count);$('city-progress-label').textContent=`${Math.min(stage,7)}/7`;$('city-progress').style.width=(Math.min(stage,7)/7*100)+'%';$('city-stage').textContent=businesses[Math.min(Math.max(count-1,0),6)].name;$('game-skyline').innerHTML='';for(let i=0;i<Math.max(1,count);i++){const x=document.createElement('div');x.className='bld '+(['sm','md','lg','xl','xl','xl','xl'][i]||'xl');$('game-skyline').appendChild(x);}}
function metricHTML(label,value){return `<div class="metric"><small>${label}</small><strong>${value}</strong></div>`;}

function openShop(){
  let body='<div class="business-grid">';shopItems.forEach(it=>body+=`<div class="business-card"><div class="icon">${it.icon}</div><h3>${it.name}</h3><p>${it.desc}</p><strong>${money(it.price)}</strong><div class="button-row"><button class="btn primary small-btn" data-shop="${it.id}">BUY</button></div></div>`);body+='</div>';modal('🛍️ Tycoon Shop',body);document.querySelectorAll('[data-shop]').forEach(b=>b.onclick=()=>buyShopItem(b.dataset.shop));
}
function buyShopItem(id){const it=shopItems.find(x=>x.id===id);if(!it||game.cash<it.price)return toast('Cash belum cukup.');game.cash-=it.price;if(id==='double')game.doubleRounds+=2;else game.inventory[id]=(game.inventory[id]||0)+1;closeModal();renderBusinesses();syncPlayer();saveGameCache();toast(`${it.icon} ${it.name} dibeli.`);}
function maybeRandomEvent(done){if(Math.random()>settings.eventChance){done();return;}const events=[{title:'📈 BUSINESS BOOM',text:'Bonus usaha +Rp75.000!',negative:false,apply:()=>game.cash+=75000},{title:'⭐ VIRAL BUSINESS',text:'Bisnismu viral. +Rp100.000!',negative:false,apply:()=>game.cash+=100000},{title:'🔧 EQUIPMENT BROKEN',text:'Biaya perbaikan Rp50.000.',negative:true,apply:()=>game.cash=Math.max(0,game.cash-50000)},{title:'📉 MARKET DOWN',text:'Pengeluaran mendadak Rp40.000.',negative:true,apply:()=>game.cash=Math.max(0,game.cash-40000)}];const e=events[Math.floor(Math.random()*events.length)];let protectedEvent=false;if(e.negative&&game.inventory.insurance>0){game.inventory.insurance--;protectedEvent=true;}modal(e.title,`<p>${protectedEvent?'🛡️ Insurance melindungi kamu dari event ini.':e.text}</p><button class="btn primary" id="event-continue">CONTINUE</button>`);$('event-continue').onclick=()=>{if(!protectedEvent)e.apply();closeModal();saveGameCache();syncPlayer();done();};}

async function syncPlayer(){
  if(mode!=='online'||!cloud.ready||!currentRoom||!game||!cloud.user)return;const p={name:game.name,cash:safeNum(game.cash),xp:safeNum(game.xp),streak:safeNum(game.streak),correct:safeNum(game.correct),wrong:safeNum(game.wrong),round:Math.min(game.questions.length,game.idx+1),idx:safeNum(game.idx),businessValue:safeNum(businessValue()),netWorth:safeNum(netWorth()),owned:game.owned||{},inventory:game.inventory||{},doubleRounds:safeNum(game.doubleRounds),phase:game.phase||'question',status:navigator.onLine?'online':'offline',finished:!!game.finished,lastSeen:serverTimestamp()};
  try{await update(ref(cloud.db,`rooms/${currentRoom}/players/${cloud.user.uid}`),p);}catch(e){console.warn('sync failed',e);}
}
function safeNum(x){x=Math.round(Number(x)||0);return Math.min(999999999,Math.max(0,x));}
function saveGameCache(){if(game)saveJSON(LS.cache,{room:currentRoom,mode,game});}
function sortedPlayers(players){return Object.values(players||{}).sort((a,b)=>(Number(b.netWorth)||0)-(Number(a.netWorth)||0)||(Number(b.correct)||0)-(Number(a.correct)||0));}
function accuracy(p){const total=Number(p.correct||0)+Number(p.wrong||0);return total?Math.round(Number(p.correct||0)/total*100):0;}
function openLiveScore(){if(mode!=='online')return modal('🏆 Live Score','<p>Live Score tersedia pada Online Classroom Mode.</p>');const arr=sortedPlayers(livePlayers);let body='<div class="leaderboard">';arr.forEach((p,i)=>{const me=cloud.user&&livePlayers[cloud.user.uid]===p;body+=`<div class="leader-row ${me?'me':''}"><div class="leader-rank">#${i+1}</div><div><b>${esc(p.name)} ${me?'• YOU':''}</b><small>${Number(p.correct||0)} correct • ${accuracy(p)}%</small></div><div class="leader-score">${money(p.netWorth)}<small>Net Worth</small></div></div>`;});body+='</div>';modal('🏆 LIVE CLASS SCORE',body);}

async function finishGame(sync=true){
  if(!game)return;game.finished=true;if(sync)await syncPlayer();const acc=Math.round(game.correct/Math.max(1,game.questions.length)*100),val=businessValue(),net=netWorth();let title='STARTER ENTREPRENEUR';if(net>=500000)title='RISING ENTREPRENEUR';if(net>=1500000)title='BUSINESS MASTER';if(net>=3500000)title='CLASSROOM TYCOON';$('result-title').textContent=title;$('result-name').textContent=`${game.name} • ${game.correct}/${game.questions.length} correct`;$('result-metrics').innerHTML=metricHTML('ACCURACY',acc+'%')+metricHTML('CASH',money(game.cash))+metricHTML('BUSINESS VALUE',money(val))+metricHTML('NET WORTH',money(net));show('result');
}

// ---------- Sound / initial state ----------
function toggleSound(){const now=(localStorage.getItem(LS.sound)||'on')==='on'?'off':'on';localStorage.setItem(LS.sound,now);$('sound-toggle').textContent=now==='on'?'🔊':'🔇';}
$('sound-toggle').textContent=(localStorage.getItem(LS.sound)||'on')==='on'?'🔊':'🔇';
$('offline-cash').value=settings.startingCash;
initCloud();

// Rejoin hint
setTimeout(async()=>{
  if(!cloud.ready)return;const code=localStorage.getItem(LS.lastRoom);if(!code)return;try{const s=await get(ref(cloud.db,`rooms/${code}`));if(!s.exists())return;const room=s.val();const p=room.players?.[cloud.user.uid];if(p&&['waiting','playing'].includes(room.status)){modal('🔄 Active Room Found',`<p>Room <b>${code}</b> masih aktif untuk <b>${esc(p.name)}</b>.</p><div class="button-row"><button class="btn primary" id="rejoin-yes">REJOIN</button><button class="btn outline" data-close-modal>NOT NOW</button></div>`);$('rejoin-yes').onclick=()=>{closeModal();currentRoom=code;currentRole='player';mode='online';registerPresence(code);attachStudentRoom(code);show('student-lobby');};document.querySelector('[data-close-modal]')?.addEventListener('click',closeModal);}}
  catch{}
},1200);
