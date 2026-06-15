// --- DATABASE & SPEL CONFIGURATIE ---
const FIREBASE_DB_URL =
  "https://optical-wall-414323-default-rtdb.europe-west1.firebasedatabase.app";

let gamePlayers = JSON.parse(localStorage.getItem("imposterPlayers")) || [];
let hintEnabled = localStorage.getItem("imposterHintState") === "true";
let imposterCount = parseInt(localStorage.getItem("currentImposterCount")) || 1;
let hintLimitEnabled = localStorage.getItem("imposterHintLimitEnabled") === "true";
let hintLimitCount = parseInt(localStorage.getItem("imposterHintLimitCount")) || 1;

let fetchedWords = [];
let imposterIndices = [];
let currentPlayerGameIndex = 0;
let currentWord = "";
let currentHint = "";
let isCardFlipped = false;

let progressDisplay;
let currentPlayerDisplay;
let roleCard;
let cardBack;
let roleTitle;
let roleWord;
let roleHint;
let nextPlayerBtn;
let startScreen;
let requestFullscreenBtn;
let startGameBtn;
let quitGameBtn;
let loadingOverlay;

// Fallback woorden mocht Firebase leeg zijn of offline zijn
const fallbackWords = [
  { word: "Pannenkoek", hint: "Eten" },
  { word: "Sneeuwpop", hint: "Winter" },
  { word: "Zonnebril", hint: "Zomer" },
];

function hideLoadingOverlay() {
  loadingOverlay.style.opacity = "0";
  setTimeout(() => loadingOverlay.classList.add("hidden"), 400);
}

window.addEventListener("DOMContentLoaded", async () => {
  loadingOverlay = document.getElementById("loadingScreen");
  progressDisplay = document.getElementById("progressDisplay");
  currentPlayerDisplay = document.getElementById("currentPlayerDisplay");
  roleCard = document.getElementById("roleCard");
  cardBack = document.getElementById("cardBack");
  roleTitle = document.getElementById("roleTitle");
  roleWord = document.getElementById("roleWord");
  roleHint = document.getElementById("roleHint");
  nextPlayerBtn = document.getElementById("nextPlayerBtn");
  startScreen = document.getElementById("startScreen");
  requestFullscreenBtn = document.getElementById("requestFullscreenBtn");
  startGameBtn = document.getElementById("startGameBtn");
  quitGameBtn = document.getElementById("quitGameBtn");

  roleCard.addEventListener("click", onRoleCardClick);
  nextPlayerBtn.addEventListener("click", onNextPlayerClick);
  requestFullscreenBtn.addEventListener("click", onRequestFullscreenClick);
  startGameBtn.addEventListener("click", onStartGameClick);
  quitGameBtn.addEventListener("click", onQuitGameClick);

  if (!document.documentElement.requestFullscreen) {
    requestFullscreenBtn.classList.add("hidden");
  }

  if (gamePlayers.length < 3) {
    alert("Niet genoeg spelers gevonden! Je keert terug naar het menu.");
    window.location.href = "../imposter.html";
    return;
  }

  fetchedWords = fallbackWords;
  const fetchPromise = loadWordsFromFirebase();
  const quickStart = new Promise((resolve) => setTimeout(resolve, 200));
  await Promise.race([fetchPromise, quickStart]);

  if (!fetchedWords.length) fetchedWords = fallbackWords;
  await setupNewGame();
  hideLoadingOverlay();

  fetchPromise.catch(() => {});
});

async function loadPlayedWords() {
  try {
    const response = await fetch(
      `${FIREBASE_DB_URL}/imposter/playedWords.json`,
    );
    if (!response.ok)
      throw new Error("Netwerkfout bij ophalen gespeelde woorden");

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(
      "Kon gespeelde woorden niet ophalen van Firebase, fallback offline gebruiken:",
      error,
    );
    return JSON.parse(localStorage.getItem("imposterPlayedWords") || "[]");
  }
}

async function savePlayedWords(playedWords) {
  try {
    await fetch(`${FIREBASE_DB_URL}/imposter/playedWords.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(playedWords),
    });
  } catch (error) {
    console.warn(
      "Kon gespeelde woorden niet naar Firebase wegschrijven, lokaal fallback opslaan:",
      error,
    );
    localStorage.setItem("imposterPlayedWords", JSON.stringify(playedWords));
  }
}

// --- LIVE DATA OPHALEN UIT FIREBASE ---
async function loadWordsFromFirebase() {
  try {
    const response = await fetch(`${FIREBASE_DB_URL}/imposter/words.json`);
    if (!response.ok) throw new Error("Netwerkfout bij ophalen Firebase data");

    const data = await response.json();

    if (data && Object.keys(data).length > 0) {
      // Transformeert Firebase object {"woord": "hint"} naar [{word: "woord", hint: "hint"}]
      fetchedWords = Object.keys(data).map((key) => ({
        word: key,
        hint: data[key],
      }));
    } else {
      fetchedWords = fallbackWords;
    }
  } catch (error) {
    console.error("Firebase fetch mislukt, switch naar fallback:", error);
    fetchedWords = fallbackWords;
  }
}

async function setupNewGame() {
  // 1. Haal de geschiedenis van gespeelde woorden op
  let playedWords = await loadPlayedWords();

  // 2. Filter de woorden die al in de geschiedenis staan eruit
  let availableWords = fetchedWords.filter(
    (item) => !playedWords.includes(item.word),
  );

  // 3. Als alle woorden een keer gespeeld zijn (of de lijst leeg is), resetten we de geschiedenis
  if (availableWords.length === 0) {
    playedWords = [];
    availableWords = fetchedWords;
  }

  // 4. Kies een random woord uit de *overgebleven* beschikbare lijst
  const randomPick =
    availableWords[Math.floor(Math.random() * availableWords.length)];
  currentWord = randomPick.word;
  currentHint = hintEnabled ? randomPick.hint : null;

  // 5. Voeg dit nieuwe woord toe aan de geschiedenis
  playedWords.push(currentWord);

  // 6. Beperk de geschiedenis tot een maximum (bijv. de helft van het totale aantal woorden)
  // Dit voorkomt dat we ooit helemaal vastlopen, zelfs bij een kleine lijst
  const maxHistoryLength = Math.max(1, Math.floor(fetchedWords.length / 2));
  if (playedWords.length > maxHistoryLength) {
    playedWords.shift(); // Verwijder het alleroudste woord
  }

  await savePlayedWords(playedWords);

  // 7. Kies een willekeurige startende speler en verschuif de spelerslijst (shift/rotate)
  if (gamePlayers.length > 0) {
    const startIdx = Math.floor(Math.random() * gamePlayers.length);
    gamePlayers = [
      ...gamePlayers.slice(startIdx),
      ...gamePlayers.slice(0, startIdx)
    ];
  }

  // 8. Bepaal random imposters
  imposterIndices = [];
  const availableIndices = gamePlayers.map((_, i) => i);

  for (let i = 0; i < imposterCount && availableIndices.length > 0; i++) {
    const randomPos = Math.floor(Math.random() * availableIndices.length);
    imposterIndices.push(availableIndices[randomPos]);
    availableIndices.splice(randomPos, 1);
  }

  // 9. Start bij de eerste speler in de verschoven lijst (de gekozen startspeler)
  currentPlayerGameIndex = 0;
  updateGameScreen();
}

function updateGameScreen() {
  // Voortgangsindicator bijwerken
  progressDisplay.textContent = `Speler ${currentPlayerGameIndex + 1} van ${gamePlayers.length}`;

  // Naam tonen
  const player = gamePlayers[currentPlayerGameIndex];
  currentPlayerDisplay.textContent = player;

  const isImposter = imposterIndices.includes(currentPlayerGameIndex);

  if (isImposter) {
    cardBack.classList.add("imposter-bg");
    roleTitle.textContent = "Jij bent een";
    roleWord.textContent = "IMPOSTER";

    let showHint = hintEnabled;
    if (showHint && hintLimitEnabled) {
      if (currentPlayerGameIndex >= hintLimitCount) {
        showHint = false;
      }
    }

    if (showHint && currentHint) {
      roleHint.textContent = "Hint: " + currentHint;
      roleHint.classList.remove("hidden");
    } else {
      roleHint.classList.add("hidden");
    }
  } else {
    cardBack.classList.remove("imposter-bg");
    roleTitle.textContent = "Jouw woord is:";
    roleWord.textContent = currentWord;
    roleHint.classList.add("hidden");
  }
}

function setCardGlowPaused(paused) {
  roleCard.classList.toggle("animation-paused", paused);
}

function onRequestFullscreenClick() {
  if (document.documentElement.requestFullscreen) {
    document.documentElement
      .requestFullscreen()
      .catch(() => {})
      .finally(() => requestFullscreenBtn.classList.add("hidden"));
  } else {
    requestFullscreenBtn.classList.add("hidden");
  }
}

function onStartGameClick() {
  startScreen.classList.add("hidden");
  document.querySelector("main").classList.remove("hidden");
}

// --- TIKKEN OM KAART OM TE DRAAIEN ---
function onRoleCardClick() {
  if (!isCardFlipped) {
    setCardGlowPaused(true);
    roleCard.classList.add("flipped");
    isCardFlipped = true;

    setTimeout(() => {
      setCardGlowPaused(false);
      nextPlayerBtn.textContent =
        currentPlayerGameIndex === gamePlayers.length - 1
          ? "Start Discussie"
          : "Volgende Speler";
      nextPlayerBtn.classList.remove("hidden");
    }, 700);
  }
}

// --- VOLGENDE SPELER KNOP (MET ANTI-SPOILER TIMEOUT) ---
function onNextPlayerClick() {
  if (currentPlayerGameIndex < gamePlayers.length - 1) {
    setCardGlowPaused(true);
    roleCard.classList.remove("flipped");
    isCardFlipped = false;
    nextPlayerBtn.classList.add("hidden");

    setTimeout(() => {
      setCardGlowPaused(false);
      currentPlayerGameIndex++;
      updateGameScreen();
    }, 700);
  } else {
    alert(
      "Iedereen heeft zijn rol gezien! De gsm mag op tafel. De discussie begint!",
    );
    window.location.href = "../imposter.html";
  }
}

// --- AFBREKEN ---
function onQuitGameClick(e) {
  if (!confirm("Weet je zeker dat je het huidige spel wilt stoppen?")) {
    e.preventDefault();
  } else {
    localStorage.removeItem("currentImposterCount");
    window.location.href = "../imposter.html";
  }
}
