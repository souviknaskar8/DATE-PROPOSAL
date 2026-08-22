// ===== Emoji reliability: convert unicode emoji to Twemoji SVG images =====
// system emoji fonts are inconsistent across browsers/OS, so we render
// every emoji as a small inline SVG instead — this is what guarantees
// they always show, even right after we swap textContent on a click.
function emojify(el){
  if (window.twemoji && el) {
    twemoji.parse(el);
  }
}

// ===== 8-bit audio: background music + button click sfx =====
let audioCtx = null;
let musicGain = null;
let sfxEnabled = true;
let musicEnabled = true;
let musicTimeout = null;
let noteIndex = 0;

// a short, cheerful looping chiptune phrase (freq in Hz, duration in ms; 0 = rest)
const melody = [
  { f: 523.25, d: 200 }, { f: 0, d: 40 },
  { f: 659.25, d: 200 }, { f: 0, d: 40 },
  { f: 783.99, d: 200 }, { f: 0, d: 40 },
  { f: 659.25, d: 200 }, { f: 0, d: 40 },
  { f: 523.25, d: 200 }, { f: 0, d: 40 },
  { f: 587.33, d: 200 }, { f: 0, d: 40 },
  { f: 659.25, d: 400 }, { f: 0, d: 120 },
  { f: 783.99, d: 200 }, { f: 0, d: 40 },
  { f: 987.77, d: 200 }, { f: 0, d: 40 },
  { f: 880.00, d: 400 }, { f: 0, d: 260 },
];

function ensureAudio(){
  if (!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playNote(freq, durationMs){
  if (!freq) return;
  const now = audioCtx.currentTime;
  const dur = durationMs / 1000;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain).connect(musicGain);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function scheduleMusic(){
  if (!musicEnabled) return;
  const note = melody[noteIndex % melody.length];
  playNote(note.f, note.d);
  noteIndex++;
  musicTimeout = setTimeout(scheduleMusic, note.d);
}

function startMusic(){
  ensureAudio();
  if (musicTimeout) return;
  scheduleMusic();
}

function stopMusic(){
  clearTimeout(musicTimeout);
  musicTimeout = null;
}

// short blip played on every button press
function playClick(){
  if (!sfxEnabled) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

// audio can't start until the person interacts with the page at least once
document.body.addEventListener('pointerdown', function initAudioOnce(){
  ensureAudio();
  if (musicEnabled) startMusic();
  document.body.removeEventListener('pointerdown', initAudioOnce);
}, { once: true });

// every button click gets a little blip, site-wide
document.addEventListener('click', (e) => {
  if (e.target.closest('button')) playClick();
});

const soundToggle = document.getElementById('sound-toggle');
soundToggle.addEventListener('click', () => {
  sfxEnabled = !sfxEnabled;
  soundToggle.textContent = sfxEnabled ? '🔊 SOUND ON' : '🔈 SOUND OFF';
  soundToggle.classList.toggle('muted', !sfxEnabled);
  if (sfxEnabled) playClick();
});

const musicToggle = document.getElementById('music-toggle');
musicToggle.addEventListener('click', () => {
  musicEnabled = !musicEnabled;
  musicToggle.textContent = musicEnabled ? '🎵 8-BIT MUSIC: ON' : '🎵 8-BIT MUSIC: OFF';
  musicToggle.classList.toggle('muted', !musicEnabled);
  if (musicEnabled) startMusic(); else stopMusic();
});

// convert all emoji already in the page (buttons, headings, etc.)
document.addEventListener('DOMContentLoaded', () => emojify(document.body));
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  emojify(document.body);
}

// ---- easy to customize ----
const SIGNATURE_NAME = "Your Biggest FAN (Your LOVE)"; // change this to sign the love note
document.getElementById('note-signature').textContent = SIGNATURE_NAME;

// ===== Screen 1: the "will you go out with me" chase =====
const askRow = document.getElementById('ask-btn-row');
const yesBtn = document.getElementById('btn-yes');
const noBtn = document.getElementById('btn-no');
const askMsg = document.getElementById('ask-message');

// exactly 12 messages — one per allowed "No" click
const messages = [
  "Are you sure?",
  "Really?",
  "Think again..",
  "Better say yes!",
  "You might regret this",
  "Please reconsider",
  "Babe please :(",
  "Don't do this",
  "I'm gonna cry..",
  "Heart breaking..",
  "Last chance!",
  "Ok, No is retired 💔"
];

// the boy gets more desperate with every click, the girl gets more
// unimpressed/annoyed — matched 1-to-1 with the messages above
const boyFaces  = ["🙂","😊","😅","😬","🥲","😟","🙏","😢","😭","🥺","😩","😖"];
const girlFaces = ["🙂","😏","🙄","😑","😒","🤨","😠","🙅‍♀️","🙅‍♀️","😤","🙅‍♀️","😤"];

const charBoy = document.getElementById('char-boy');
const charGirl = document.getElementById('char-girl');

// restart a CSS animation on an element even if the same class is already applied
function playAnim(el, className){
  el.classList.remove(className);
  void el.offsetWidth; // force reflow so the animation can retrigger
  el.classList.add(className);
}


const MAX_NO_CLICKS = 12;
let step = 0;
let roamInterval = null;

// grow YES a little bigger with every click of No
function growYes(){
  const scale = 1 + step * 0.15;
  yesBtn.style.fontSize = (16 * scale) + "px";
  yesBtn.style.padding = (16 * scale) + "px " + (30 * scale) + "px";
}

// once No has been clicked 12 times, it stops being a normal button
// and instead drifts around the row on its own, unclickable
function startRoaming(){
  const rowRect = askRow.getBoundingClientRect();
  const btnRect = noBtn.getBoundingClientRect();

  // freeze its current spot as the absolute starting point so it
  // doesn't jump when switching from static to absolute positioning
  noBtn.style.left = (btnRect.left - rowRect.left) + 'px';
  noBtn.style.top = (btnRect.top - rowRect.top) + 'px';
  noBtn.classList.add('roaming');
  noBtn.disabled = true;

  function moveToRandomSpot(){
    const currentRowRect = askRow.getBoundingClientRect();
    const currentBtnRect = noBtn.getBoundingClientRect();
    const maxX = Math.max(currentRowRect.width - currentBtnRect.width - 8, 8);
    const maxY = Math.max(currentRowRect.height - currentBtnRect.height - 8, 8);
    noBtn.style.left = (Math.random() * maxX) + 'px';
    noBtn.style.top = (Math.random() * maxY) + 'px';
  }

  moveToRandomSpot();
  roamInterval = setInterval(moveToRandomSpot, 900);
}

function handleNoClick(){
  if (step >= MAX_NO_CLICKS) return; // roaming phase — ignore, shouldn't fire anyway

  step++;
  askMsg.textContent = messages[step - 1];
  growYes();

  // update the couple: boy pleads harder, girl gets more annoyed
  charBoy.textContent = boyFaces[step - 1];
  charGirl.textContent = girlFaces[step - 1];
  emojify(charBoy);
  emojify(charGirl);
  playAnim(charBoy, 'anim');
  playAnim(charGirl, 'anim');

  if (step >= MAX_NO_CLICKS){
    startRoaming();
  }
}

noBtn.addEventListener('click', function(e){
  e.preventDefault();
  handleNoClick();
});

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

yesBtn.addEventListener('click', () => {
  charBoy.textContent = "😍";
  charGirl.textContent = "😊";
  emojify(charBoy);
  emojify(charGirl);
  playAnim(charBoy, 'yes-anim');
  playAnim(charGirl, 'yes-anim');
  setTimeout(() => showScreen('screen-yay'), 550);
});

// ===== Screen 2 -> 3 =====
document.getElementById('btn-to-date').addEventListener('click', () => showScreen('screen-date'));

// ===== Screen 3: date picker =====
const dateInput = document.getElementById('date-input');
const toActivityBtn = document.getElementById('btn-to-activity');
dateInput.addEventListener('input', () => {
  toActivityBtn.disabled = !dateInput.value;
});
toActivityBtn.addEventListener('click', () => {
  if (!dateInput.value) return;
  showScreen('screen-activity');
});

// ===== Screen 4: activity picker =====
let chosenActivity = null;
const activityButtons = document.querySelectorAll('.activity-btn');
const lockBtn = document.getElementById('btn-lock');
activityButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    activityButtons.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    chosenActivity = btn.dataset.value;
    lockBtn.disabled = false;
  });
});

lockBtn.addEventListener('click', () => {
  if (!chosenActivity) return;
  const d = new Date(dateInput.value + 'T00:00:00');
  const formatted = d.toLocaleDateString('en-US', { weekday:'short', month:'long', day:'numeric' });
  document.getElementById('summary-date').textContent = 'DATE: ' + formatted;
  document.getElementById('summary-activity').textContent = 'ACTIVITY: ' + chosenActivity.toUpperCase();
  showScreen('screen-final');
});

// ===== Love note modal =====
const notifBtn = document.getElementById('notif-btn');
const modalOverlay = document.getElementById('modal-overlay');
notifBtn.addEventListener('click', () => { playClick(); modalOverlay.classList.add('active'); });
document.getElementById('note-close').addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('active');
});
