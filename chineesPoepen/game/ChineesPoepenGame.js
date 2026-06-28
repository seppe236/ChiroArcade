window.addEventListener("load", () => {
  renderGameGrid();
});

function getSavedGameState(players, roundCount) {
  const savedState = JSON.parse(
    localStorage.getItem("chineesPoepenGameState"),
  );

  if (!savedState || !Array.isArray(savedState.players)) {
    return null;
  }

  const savedPlayers = savedState.players;
  const savedRoundCount = Number(savedState.roundCount);

  if (
    savedPlayers.length !== players.length ||
    savedRoundCount !== roundCount ||
    savedPlayers.some((name, index) => name !== players[index])
  ) {
    return null;
  }

  return savedState;
}

function saveGameState(boardGrid, players, roundCount) {
  const cells = [];
  const rows = Math.max(1, roundCount) * 2 - 1;

  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= players.length; col += 1) {
      const cell = boardGrid.querySelector(`div[data-row="${row}"][data-col="${col}"]`);
      if (!cell) continue;

      const leftInput = cell.querySelector(".cell-top input:first-of-type");
      const rightInput = cell.querySelector(".cell-top input:last-of-type");

      cells.push({
        row,
        col,
        left: leftInput?.value || "",
        right: rightInput?.value || "",
      });
    }
  }

  localStorage.setItem(
    "chineesPoepenGameState",
    JSON.stringify({ players, roundCount, cells }),
  );
}

function renderGameGrid() {
  const players =
    JSON.parse(localStorage.getItem("chineesPoepenPlayers")) || [];
  const roundCount = Number(localStorage.getItem("chineesPoepenRounds")) || 4;
  const savedState = getSavedGameState(players, roundCount);
  const gridContainer = document.getElementById("gridContainer");
  const message = document.getElementById("gameMessage");

  if (players.length === 0) {
    message.textContent =
      "Voeg eerst spelers toe in de instellingen om het bord te tonen.";
    gridContainer.innerHTML = "";
    return;
  }

  message.textContent = `Spelers: ${players.length} • Rondes: ${roundCount}`;

  const columns = players.length;
  const rows = Math.max(1, roundCount);

  // Build a single grid so headers, rounds and cells align perfectly
  const boardGrid = document.createElement("div");
  boardGrid.className = "board-grid";
  boardGrid.style.display = "grid";
  boardGrid.style.gridTemplateColumns = `48px repeat(${columns}, minmax(90px, 1fr))`;
  boardGrid.style.gridAutoRows = `minmax(90px, auto)`;
  boardGrid.style.gap = "12px";

  // header row: first empty cell (spacer)
  const headerSpacer = document.createElement("div");
  headerSpacer.className = "player-spacer";
  headerSpacer.style.gridColumn = "1";
  headerSpacer.style.gridRow = "1";
  boardGrid.appendChild(headerSpacer);

  // rounds column and board cells start from row 2
  for (let r = 1; r <= rows * 2 - 1; r += 1) {
    const rc = document.createElement("div");
    rc.className = "round-cell";
    rc.textContent = r <= rows ? r : rows - r + rows;
    rc.style.gridColumn = "1";
    rc.style.gridRow = `${r + 1}`;
    boardGrid.appendChild(rc);

    for (let c = 1; c <= columns; c += 1) {
      const cell = document.createElement("div");
      const diagValue =
        (((c - r) % players.length) + players.length) % players.length;
      cell.className = diagValue === 0 ? "dealer" : "grid-cell";
      cell.style.gridColumn = `${c + 1}`;
      cell.style.gridRow = `${r + 1}`;
      cell.dataset.row = r;
      cell.dataset.col = c;

      // add player name label inside this cell (top center)
      const playerName =
        typeof players[c - 1] === "string"
          ? players[c - 1]
          : players[c - 1].name || "Speler";
      const playerLabel = document.createElement("div");
      playerLabel.className = "cell-player";
      playerLabel.textContent = playerName;
      cell.appendChild(playerLabel);

      const cellTop = document.createElement("div");
      cellTop.className = "cell-top";

      const savedCell = savedState?.cells?.find(
        (cell) => cell.row === r && cell.col === c,
      );

      const topA = document.createElement("input");
      topA.type = "text";
      topA.maxLength = 3;
      topA.value = savedCell?.left ?? "";
      topA.inputMode = "numeric";
      topA.pattern = "[0-9]*";

      const topB = document.createElement("input");
      topB.type = "text";
      topB.maxLength = 3;
      topB.value = savedCell?.right ?? "";
      topB.inputMode = "numeric";
      topB.pattern = "[0-9]*";

      cellTop.appendChild(topA);
      cellTop.appendChild(topB);
      cell.appendChild(cellTop);

      const mainText = document.createElement("div");
      mainText.className = "main-text";
      mainText.textContent = "0";
      cell.appendChild(mainText);

      const updateInputs = () => {
        updateBoardTotals(boardGrid, rows, columns);
        saveGameState(boardGrid, players, roundCount);
      };
      topA.addEventListener("input", updateInputs);
      topB.addEventListener("input", updateInputs);

      boardGrid.appendChild(cell);
    }
  }

  // assemble
  gridContainer.innerHTML = "";
  gridContainer.appendChild(boardGrid);
  updateBoardTotals(boardGrid, rows, columns);
  saveGameState(boardGrid, players, roundCount);
}

function updateBoardTotals(boardGrid, rows, columns) {
  const matrix = [];

  for (let r = 1; r <= rows * 2 - 1; r += 1) {
    const rowValues = [];
    for (let c = 1; c <= columns; c += 1) {
      const cell = boardGrid.querySelector(
        `div[data-row="${r}"][data-col="${c}"]`,
      );
      if (!cell) {
        rowValues.push(0);
        continue;
      }

      const leftInput = cell.querySelector(".cell-top input:first-of-type");
      const rightInput = cell.querySelector(".cell-top input:last-of-type");
      const leftValue =
        leftInput?.value === "" ? -1 : parseInt(leftInput?.value, 10);
      const rightValue =
        rightInput?.value === "" ? -1 : parseInt(rightInput?.value, 10);

      const aboveCell = boardGrid.querySelector(
        `div[data-row="${r - 1}"][data-col="${c}"]`,
      );
      const aboveValue =
        parseInt(aboveCell?.querySelector(".main-text")?.textContent, 10) || 0;

      let total = aboveValue;

      console.log(leftValue);
      if (leftValue === -1 || rightValue === -1) {
        total = "";
      } else if (leftValue === rightValue) {
        total += 5 + leftValue * 3;
      } else if (leftValue !== rightValue) {
        total -= Math.abs(leftValue - rightValue) * 3;
      }

      rowValues.push(leftValue === -1 ? 0 : leftValue);

      const mainText = cell.querySelector(".main-text");
      if (mainText) {
        mainText.textContent = total;
      }
    }
    matrix.push(rowValues);
  }

  for (let r = 1; r <= rows * 2 - 1; r += 1) {
    let total_row_val = 0;
    for (let c = 1; c <= columns; c += 1) {
      const value = matrix[r - 1] ? matrix[r - 1][c - 1] : 0;
      total_row_val += value;
    }
    console.log(total_row_val);
    if (total_row_val === (r <= rows ? r : rows - r + rows)) {
      for (let c = 1; c <= columns; c += 1) {
        const cell = boardGrid.querySelector(
          `div[data-row="${r}"][data-col="${c}"]`,
        );
        if (cell && cell.classList.contains("dealer")) {
          cell.className = "dealer_wrong";
        }
      }
    } else {
      for (let c = 1; c <= columns; c += 1) {
        const cell = boardGrid.querySelector(
          `div[data-row="${r}"][data-col="${c}"]`,
        );
        if (cell && cell.classList.contains("dealer_wrong")) {
          cell.className = "dealer";
        }
      }
    }
  }

  return matrix;
}
