// --- FIREBASE CONFIGURATIE ---
const FIREBASE_DB_URL =
  "https://optical-wall-414323-default-rtdb.europe-west1.firebasedatabase.app";

// --- SPELER MANAGEMENT & STORAGE ---
let players = JSON.parse(localStorage.getItem("imposterPlayers")) || [];
let dragStartIndex;

window.addEventListener("load", () => {
  updatePlayerList();
  handleHashChange();

  const savedHintState = localStorage.getItem("imposterHintState");
  if (savedHintState !== null) {
    document.getElementById("hintToggle").checked = savedHintState === "true";
  }

  const savedImposterCount = localStorage.getItem("imposterCount");
  if (savedImposterCount !== null) {
    document.getElementById("imposterCount").value = savedImposterCount;
  }

  const savedHintLimitEnabled = localStorage.getItem("imposterHintLimitEnabled");
  if (savedHintLimitEnabled !== null) {
    document.getElementById("hintLimitToggle").checked = savedHintLimitEnabled === "true";
  }

  const savedHintLimitCount = localStorage.getItem("imposterHintLimitCount");
  if (savedHintLimitCount !== null) {
    document.getElementById("hintLimitCount").value = savedHintLimitCount;
  }

  updateHintLimitVisibility();
  validateHintLimitCount();
});

document.getElementById("hintToggle").addEventListener("change", function () {
  localStorage.setItem("imposterHintState", this.checked);
  updateHintLimitVisibility();
});

document.getElementById("hintLimitToggle").addEventListener("change", function () {
  localStorage.setItem("imposterHintLimitEnabled", this.checked);
  updateHintLimitVisibility();
});

function updateHintLimitVisibility() {
  const hintEnabled = document.getElementById("hintToggle").checked;
  const limitEnabled = document.getElementById("hintLimitToggle").checked;
  const limitRow = document.getElementById("hintLimitRow");
  const counterWrapper = document.getElementById("hintLimitCounterWrapper");

  if (hintEnabled) {
    limitRow.style.display = "flex";
    if (limitEnabled) {
      counterWrapper.style.display = "flex";
    } else {
      counterWrapper.style.display = "none";
    }
  } else {
    limitRow.style.display = "none";
    counterWrapper.style.display = "none";
  }
}

function validateHintLimitCount() {
  const input = document.getElementById("hintLimitCount");
  if (!input) return;
  const currentValue = parseInt(input.value) || 1;
  const maxVal = Math.max(1, players.length);
  if (currentValue > maxVal) {
    input.value = maxVal;
    localStorage.setItem("imposterHintLimitCount", maxVal);
  }
}

function incrementHintLimit() {
  const input = document.getElementById("hintLimitCount");
  const currentValue = parseInt(input.value) || 1;
  const maxVal = Math.max(1, players.length);
  if (currentValue < maxVal) {
    input.value = currentValue + 1;
    localStorage.setItem("imposterHintLimitCount", input.value);
  }
}

function decrementHintLimit() {
  const input = document.getElementById("hintLimitCount");
  const currentValue = parseInt(input.value) || 1;
  if (currentValue > 1) {
    input.value = currentValue - 1;
    localStorage.setItem("imposterHintLimitCount", input.value);
  }
}

function incrementImposters() {
  const input = document.getElementById("imposterCount");
  const currentValue = parseInt(input.value) || 1;
  input.value = currentValue + 1;
  localStorage.setItem("imposterCount", input.value);
}

function decrementImposters() {
  const input = document.getElementById("imposterCount");
  const currentValue = parseInt(input.value) || 1;
  if (currentValue > 1) {
    input.value = currentValue - 1;
    localStorage.setItem("imposterCount", input.value);
  }
}

function savePlayers() {
  localStorage.setItem("imposterPlayers", JSON.stringify(players));
}

function addPlayer() {
  const input = document.getElementById("playerName");
  const name = input.value.trim();

  if (name !== "") {
    players.push(name);
    savePlayers();
    updatePlayerList();
    input.value = "";
    input.focus();
  }
}

function clearPlayers() {
  players = [];
  savePlayers();
  updatePlayerList();
}

function removeSinglePlayer(index) {
  players.splice(index, 1);
  savePlayers();
  updatePlayerList();
}

function updatePlayerList() {
  validateHintLimitCount();
  const ul = document.getElementById("playerList");
  ul.innerHTML = "";

  players.forEach((player, index) => {
    const li = document.createElement("li");
    li.className = "player-item";
    li.setAttribute("draggable", "true");
    li.setAttribute("data-index", index);

    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name-text";
    nameSpan.textContent = player;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.innerHTML = '<i class="fi fi-rr-trash"></i>';
    removeBtn.onclick = (e) => {
      e.stopPropagation(); // Voorkomt dat drag-events vuren bij het klikken op prullenbak
      removeSinglePlayer(index);
    };

    li.appendChild(nameSpan);
    li.appendChild(removeBtn);

    // Desktop Muis Events
    li.addEventListener("dragstart", dragStart);
    li.addEventListener("dragover", dragOver);
    li.addEventListener("drop", dragDrop);
    li.addEventListener("dragenter", dragEnter);
    li.addEventListener("dragleave", dragLeave);
    li.addEventListener("dragend", dragEnd);

    // Mobiel Touch Events (Zonder passive: false, zodat de browser standaard mag scrollen)
    li.addEventListener("touchstart", touchStart, { passive: true });
    li.addEventListener("touchmove", touchMove, { passive: false });
    li.addEventListener("touchend", touchEnd);

    ul.appendChild(li);
  });
}

function handleKeyPress(event) {
  if (event.key === "Enter") {
    addPlayer();
  }
}

// --- DESKTOP DRAG & DROP FUNCTIES ---
function dragStart() {
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
  document
    .querySelectorAll(".player-item")
    .forEach((item) => item.classList.remove("drag-over"));
}

// --- MOBIEL TOUCH DRAG & DROP LOGICA (MET LONG PRESS) ---
let activeTouchItem = null;
let touchTimer = null;
let isLongPress = false;

function touchStart(e) {
  const target = this;
  isLongPress = false;

  // Start een timer van 400ms voor de long press
  touchTimer = setTimeout(() => {
    isLongPress = true;
    activeTouchItem = target;
    dragStartIndex = +target.getAttribute("data-index");
    target.classList.add("dragging");

    // Optioneel: Geef korte trilling als de telefoon dat ondersteunt (haptic feedback)
    if (navigator.vibrate) navigator.vibrate(50);
  }, 400);
}

function touchMove(e) {
  // Als de long press nog niet is geactiveerd, annuleren we de timer zodra de vinger beweegt (gebruiker is aan het scrollen)
  if (!isLongPress) {
    clearTimeout(touchTimer);
    return;
  }

  // Als we wel aan het slepen zijn, blokkeer dan het scrollen van de pagina
  e.preventDefault();

  const touch = e.touches[0];
  const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);

  if (!targetElement) return;

  const itemOver = targetElement.closest(".player-item");

  document
    .querySelectorAll(".player-item")
    .forEach((item) => item.classList.remove("drag-over"));

  if (itemOver && itemOver !== activeTouchItem) {
    itemOver.classList.add("drag-over");
  }
}

function touchEnd(e) {
  // Altijd de timer opruimen als de vinger van het scherm gaat
  clearTimeout(touchTimer);

  if (!isLongPress || !activeTouchItem) {
    activeTouchItem = null;
    return;
  }

  activeTouchItem.classList.remove("dragging");

  const touch = e.changedTouches[0];
  const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);

  if (targetElement) {
    const itemOver = targetElement.closest(".player-item");
    if (itemOver) {
      const dragEndIndex = +itemOver.getAttribute("data-index");
      swapItems(dragStartIndex, dragEndIndex);
    }
  }

  document
    .querySelectorAll(".player-item")
    .forEach((item) => item.classList.remove("drag-over"));

  activeTouchItem = null;
  isLongPress = false;
}

function swapItems(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  const itemToMove = players.splice(fromIndex, 1)[0];
  players.splice(toIndex, 0, itemToMove);
  savePlayers();
  updatePlayerList();
}

// --- START SPEL ---
function startGame() {
  if (players.length < 3) {
    alert("Je hebt minimaal 3 spelers nodig om te starten!");
    return;
  }
  const hintEnabled = document.getElementById("hintToggle").checked;
  const imposterCount =
    parseInt(document.getElementById("imposterCount").value) || 1;

  // Validate imposter count doesn't exceed player count
  if (imposterCount >= players.length) {
    alert(
      "Aantal imposters mag niet gelijk zijn aan of groter zijn dan het aantal spelers!",
    );
    return;
  }

  console.log(
    "Start spel met:",
    players,
    "Hint Aan:",
    hintEnabled,
    "Imposters:",
    imposterCount,
  );
  localStorage.setItem("currentImposterCount", imposterCount);
  window.location.href = "game/game.html";
}

// --- MODAL & URL ROUTING ---
function handleHashChange() {
  const modal = document.getElementById("wordModal");
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
