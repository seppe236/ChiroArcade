// --- FIREBASE CONFIGURATIE ---
const FIREBASE_DB_URL =
  "https://optical-wall-414323-default-rtdb.europe-west1.firebasedatabase.app";

// --- SPELER MANAGEMENT, LOCAL STORAGE & DRAG AND DROP ---
// Haal spelers uit localStorage, of start met een lege array als er nog niets is
let players = JSON.parse(localStorage.getItem("imposterPlayers")) || [];
let dragStartIndex;

// Zorg dat alles goed staat wanneer de pagina laadt
window.addEventListener("load", () => {
  updatePlayerList();
  handleHashChange();

  // Laad de opgeslagen status van de hint-toggle
  const savedHintState = localStorage.getItem("imposterHintState");
  if (savedHintState !== null) {
    document.getElementById("hintToggle").checked = savedHintState === "true";
  }
});

// Luister naar veranderingen van de hint-toggle en sla direct op
document.getElementById("hintToggle").addEventListener("change", function () {
  localStorage.setItem("imposterHintState", this.checked);
});

// Hulpfunctie om spelers op te slaan
function savePlayers() {
  localStorage.setItem("imposterPlayers", JSON.stringify(players));
}

function addPlayer() {
  const input = document.getElementById("playerName");
  const name = input.value.trim();

  if (name !== "") {
    players.push(name);
    savePlayers(); // Opslaan
    updatePlayerList();
    input.value = "";
    input.focus();
  }
}

function clearPlayers() {
  players = [];
  savePlayers(); // Opslaan
  updatePlayerList();
}

function removeSinglePlayer(index) {
  players.splice(index, 1);
  savePlayers(); // Opslaan
  updatePlayerList();
}

function updatePlayerList() {
  const ul = document.getElementById("playerList");
  ul.innerHTML = ""; // Leeg de huidige lijst

  players.forEach((player, index) => {
    const li = document.createElement("li");
    li.className = "player-item";
    li.setAttribute("draggable", "true");
    li.setAttribute("data-index", index);

    // Naam tekst
    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name-text";
    nameSpan.textContent = player;

    // Verwijder knop
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.innerHTML = '<i class="fi fi-rr-trash"></i>';
    removeBtn.onclick = () => removeSinglePlayer(index);

    li.appendChild(nameSpan);
    li.appendChild(removeBtn);

    // Drag & Drop Event Listeners
    li.addEventListener("dragstart", dragStart);
    li.addEventListener("dragover", dragOver);
    li.addEventListener("drop", dragDrop);
    li.addEventListener("dragenter", dragEnter);
    li.addEventListener("dragleave", dragLeave);
    li.addEventListener("dragend", dragEnd);

    ul.appendChild(li);
  });
}

function handleKeyPress(event) {
  if (event.key === "Enter") {
    addPlayer();
  }
}

// --- DRAG & DROP FUNCTIES ---
function dragStart(e) {
  dragStartIndex = +this.getAttribute("data-index");
  this.classList.add("dragging");
}

function dragOver(e) {
  e.preventDefault();
}

function dragEnter(e) {
  e.preventDefault();
  this.classList.add("drag-over");
}

function dragLeave() {
  this.classList.remove("drag-over");
}

function dragDrop() {
  const dragEndIndex = +this.getAttribute("data-index");
  swapItems(dragStartIndex, dragEndIndex);
  this.classList.remove("drag-over");
}

function dragEnd() {
  this.classList.remove("dragging");
  const items = document.querySelectorAll(".player-item");
  items.forEach((item) => item.classList.remove("drag-over"));
}

function swapItems(fromIndex, toIndex) {
  const itemToMove = players.splice(fromIndex, 1)[0];
  players.splice(toIndex, 0, itemToMove);
  savePlayers(); // Sla de nieuwe volgorde op
  updatePlayerList();
}

// --- START SPEL ---
function startGame() {
  if (players.length < 3) {
    alert("Je hebt minimaal 3 spelers nodig om te starten!");
    return;
  }
  const hintEnabled = document.getElementById("hintToggle").checked;
  console.log("Start spel met:", players, "Hint Aan:", hintEnabled);

  // window.location.href = "play.html";
}

// --- MODAL & URL ROUTING ---
function handleHashChange() {
  const modal = document.getElementById("wordModal");
  // Controleer of de modal bestaat op deze pagina (veiligheidscheck)
  if (modal) {
    if (window.location.hash === "#add-words") {
      modal.classList.add("show");
    } else {
      modal.classList.remove("show");
    }
  }
}

window.addEventListener("hashchange", handleHashChange);

// --- FIREBASE WOORDEN OPSLAAN ---
async function saveWordToFirebase() {
  const wordInput = document.getElementById("customWord");
  const hintInput = document.getElementById("customHint");

  const word = wordInput.value.trim().toLowerCase();
  const hint = hintInput.value.trim().toLowerCase();

  if (!word || !hint) {
    alert("Vul alsjeblieft zowel een woord als een hint in.");
    return;
  }

  const url = `${FIREBASE_DB_URL}/imposter/words/${encodeURIComponent(word)}.json`;

  try {
    const response = await fetch(url, {
      method: "PUT",
      body: JSON.stringify(hint),
    });

    if (response.ok) {
      showNotification(`"${word}" is succesvol toegevoegd!`);
      wordInput.value = "";
      hintInput.value = "";
    } else {
      alert("Fout bij het opslaan naar de database.");
    }
  } catch (error) {
    console.error("Firebase Fout:", error);
    alert("Kon geen verbinding maken met Firebase.");
  }
}

function showNotification(message) {
  const notif = document.getElementById("notification");
  notif.textContent = message;
  notif.classList.remove("hidden");

  setTimeout(() => {
    notif.classList.add("hidden");
  }, 3000);
}
