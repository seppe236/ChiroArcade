// --- DATABASE & SPEL CONFIGURATIE ---
const FIREBASE_DB_URL =
  "https://optical-wall-414323-default-rtdb.europe-west1.firebasedatabase.app";

let gamePlayers = JSON.parse(localStorage.getItem("imposterPlayers")) || [];
let hintEnabled = localStorage.getItem("imposterHintState") === "true";
let imposterCount = parseInt(localStorage.getItem("currentImposterCount")) || 1;

let fetchedWords = [];
let imposterIndices = [];
let currentPlayerGameIndex = 0;
let currentWord = "";
let currentHint = "";
let isCardFlipped = false;

// Fallback woorden mocht Firebase leeg zijn of offline zijn
const fallbackWords = [
  { word: "Pannenkoek", hint: "Eten" },
  { word: "Sneeuwpop", hint: "Winter" },
  { word: "Zonnebril", hint: "Zomer" },
];

window.addEventListener("load", async () => {
  if (gamePlayers.length < 3) {
    alert("Niet genoeg spelers gevonden! Je keert terug naar het menu.");
    window.location.href = "../imposter.html";
    return;
  }

  await loadWordsFromFirebase();
  setupNewGame();
});

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
  } finally {
    // Verberg het laadscherm op een vloeiende manier
    const loader = document.getElementById("loadingScreen");
    loader.style.opacity = "0";
    setTimeout(() => loader.classList.add("hidden"), 400);
  }
}

function setupNewGame() {
  // 1. Haal de geschiedenis van gespeelde woorden op
  let playedWords =
    JSON.parse(localStorage.getItem("imposterPlayedWords")) || [];

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

  // Sla de bijgewerkte geschiedenis op in localStorage
  localStorage.setItem("imposterPlayedWords", JSON.stringify(playedWords));

  // --- De rest van je originele logica blijft hetzelfde ---

  // 7. Bepaal random imposters
  imposterIndices = [];
  const availableIndices = gamePlayers.map((_, i) => i);

  for (let i = 0; i < imposterCount && availableIndices.length > 0; i++) {
    const randomPos = Math.floor(Math.random() * availableIndices.length);
    imposterIndices.push(availableIndices[randomPos]);
    availableIndices.splice(randomPos, 1);
  }

  // 8. Bepaal een random startende speler
  currentPlayerGameIndex = 0;
  updateGameScreen();
}

function updateGameScreen() {
  // Voortgangsindicator bijwerken
  document.getElementById("progressDisplay").textContent =
    `Speler ${currentPlayerGameIndex + 1} van ${gamePlayers.length}`;

  // Naam tonen
  const player = gamePlayers[currentPlayerGameIndex];
  document.getElementById("currentPlayerDisplay").textContent = player;

  // Vul alvast de achterkant in van de kaart die nu stil face-down ligt
  const backEl = document.getElementById("cardBack");
  const titleEl = document.getElementById("roleTitle");
  const wordEl = document.getElementById("roleWord");
  const hintEl = document.getElementById("roleHint");

  const isImposter = imposterIndices.includes(currentPlayerGameIndex);

  if (isImposter) {
    backEl.classList.add("imposter-bg");
    titleEl.textContent = "Jij bent een";
    wordEl.textContent = "IMPOSTER";

    if (currentHint) {
      hintEl.textContent = "Hint: " + currentHint;
      hintEl.classList.remove("hidden");
    } else {
      hintEl.classList.add("hidden");
    }
  } else {
    backEl.classList.remove("imposter-bg");
    titleEl.textContent = "Jouw woord is:";
    wordEl.textContent = currentWord;
    hintEl.classList.add("hidden");
  }
}

// --- TIKKEN OM KAART OM TE DRAAIEN ---
document.getElementById("roleCard").addEventListener("click", function () {
  if (!isCardFlipped) {
    this.classList.add("flipped");
    isCardFlipped = true;
    setTimeout(() => {
      const btn = document.getElementById("nextPlayerBtn");
      if (currentPlayerGameIndex === gamePlayers.length - 1) {
        btn.textContent = "Start Discussie";
      } else {
        btn.textContent = "Volgende Speler";
      }
      btn.classList.remove("hidden");
    }, 400);
  }
});

// --- VOLGENDE SPELER KNOP (MET ANTI-SPOILER TIMEOUT) ---
document.getElementById("nextPlayerBtn").addEventListener("click", function () {
  if (currentPlayerGameIndex < gamePlayers.length - 1) {
    const card = document.getElementById("roleCard");

    // 1. Draai eerst de kaart terug naar de anonieme voorkant
    card.classList.remove("flipped");
    isCardFlipped = false;

    // Verberg de knop direct
    this.classList.add("hidden");

    // 2. Pas NA de animatie (600ms) de data aan voor de volgende speler
    setTimeout(() => {
      currentPlayerGameIndex++;
      updateGameScreen();
    }, 600);
  } else {
    alert(
      "Iedereen heeft zijn rol gezien! De gsm mag op tafel. De discussie begint!",
    );
    window.location.href = "../imposter.html";
  }
});

// --- AFBREKEN ---
document.getElementById("quitGameBtn").addEventListener("click", function (e) {
  if (!confirm("Weet je zeker dat je het huidige spel wilt stoppen?")) {
    e.preventDefault();
  } else {
    localStorage.removeItem("currentImposterCount");
    window.location.href = "../imposter.html";
  }
});

document.addEventListener("click", function (event) {
  // Request fullscreen on first card flip
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {
      // Fullscreen request failed, continue anyway
    });
  }
});
