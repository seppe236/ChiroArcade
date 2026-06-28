// --- SPELER MANAGEMENT & STORAGE ---
let players = JSON.parse(localStorage.getItem("chineesPoepenPlayers")) || [];
const MAX_PLAYERS = 12;
const MAX_ROUNDS = 20;
const SCORE_STORAGE_KEY = "chineesPoepenGameState";

window.addEventListener("load", () => {
  updatePlayerList();
  const savedRounds = localStorage.getItem("chineesPoepenRounds");
  if (savedRounds !== null) {
    document.getElementById("roundCount").value = savedRounds;
  }
});

function savePlayers() {
  localStorage.setItem("chineesPoepenPlayers", JSON.stringify(players));
}

function clearSavedScores() {
  localStorage.removeItem(SCORE_STORAGE_KEY);
}

function addPlayer() {
  const input = document.getElementById("playerName");
  const name = input.value.trim();

  if (name === "") return;
  if (players.includes(name)) return;
  if (players.length >= MAX_PLAYERS) return;

  players.push(name);
  savePlayers();
  clearSavedScores();
  updatePlayerList();
  input.value = "";
  input.focus();
}

function clearPlayers() {
  players = [];
  savePlayers();
  clearSavedScores();
  updatePlayerList();
}

function removeSinglePlayer(index) {
  players.splice(index, 1);
  savePlayers();
  clearSavedScores();
  updatePlayerList();
}

function updatePlayerList() {
  const ul = document.getElementById("playerList");
  ul.innerHTML = "";

  if (players.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "player-item";
    emptyItem.textContent = "Nog geen spelers toegevoegd.";
    ul.appendChild(emptyItem);
    return;
  }

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
      e.stopPropagation();
      removeSinglePlayer(index);
    };

    li.appendChild(nameSpan);
    li.appendChild(removeBtn);

    li.addEventListener("dragstart", dragStart);
    li.addEventListener("dragover", dragOver);
    li.addEventListener("drop", dragDrop);
    li.addEventListener("dragenter", dragEnter);
    li.addEventListener("dragleave", dragLeave);
    li.addEventListener("dragend", dragEnd);
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

function incrementRounds() {
  const input = document.getElementById("roundCount");
  const current = parseInt(input.value, 10) || 1;
  if (current < MAX_ROUNDS) {
    input.value = current + 1;
    localStorage.setItem("chineesPoepenRounds", input.value);
  }
}

function decrementRounds() {
  const input = document.getElementById("roundCount");
  const current = parseInt(input.value, 10) || 1;
  if (current > 1) {
    input.value = current - 1;
    localStorage.setItem("chineesPoepenRounds", input.value);
  }
}

function saveSettings() {
  localStorage.setItem(
    "chineesPoepenRounds",
    document.getElementById("roundCount").value,
  );
  savePlayers();
}

function startGame() {
  saveSettings();
  window.location.href = "game/ChineesPoepenGame.html";
}

let dragStartIndex;

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

let activeTouchItem = null;
let touchTimer = null;
let isLongPress = false;

function touchStart() {
  const target = this;
  isLongPress = false;
  touchTimer = setTimeout(() => {
    isLongPress = true;
    activeTouchItem = target;
    dragStartIndex = +target.getAttribute("data-index");
    target.classList.add("dragging");
    if (navigator.vibrate) navigator.vibrate(50);
  }, 400);
}

function touchMove(e) {
  if (!isLongPress) {
    clearTimeout(touchTimer);
    return;
  }
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
  clearSavedScores();
  updatePlayerList();
}
