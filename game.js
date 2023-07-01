var OpenAIApiKey = "{API KEY GOES HERE}"

// Initialize new game and board
var game = new Chess();
var board = Chessboard('board', 'start');

// Function to handle piece movement
function onDragStart (source, piece, position, orientation) {
  // Do not pick up pieces if the game is over or it's not that side's turn
  if (game.game_over() || (game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

// Function to check if a move is legal
function onDrop (source, target) {
  // See if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // Always promote to a queen for simplicity's sake
  });

  // If illegal move, snap back
  if (move === null) return 'snapback';

  // If legal move, check game status
  checkGameStatus();
}

async function aiMove(invalidString = "") {
  const FEN = game.fen();
  const validMoves = game.moves().join(", ");
  let prompt_text = `You are an AI assistant trained to suggest the next move in a game of chess. You are currently suggesting a move for the black pieces. The current board state in FEN (Forsyth-Edwards Notation) is \"${FEN}\". The valid moves are [${validMoves}]. Your objective is to help achieve a winning position, while adhering to the rules of chess. Please provide your move in algebraic notation (e.g., "e2e4").\n\nYour suggested move is:`;
  
  if(invalidString != "")
    prompt_text += `\n\n${invalidString}\n\nThe previous move attempt was invalid due to no piece being present at the specified start square or the move was not legal. The valid moves are [${validMoves}]. Please suggest a new move:`;

  const data = {
    "model": "text-davinci-003",
    "prompt": prompt_text,
    "temperature": 1,
    "max_tokens": 64,
    "top_p": 1,
    "frequency_penalty": 0.6,
    "presence_penalty": 0.6,
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + OpenAIApiKey
    },
    body: JSON.stringify(data)
  };

  const response = await fetch('https://api.openai.com/v1/completions', options);
  const jsonResponse = await response.json();
  let move = jsonResponse.choices[0].text.trim();
  move = move.replace(/\n/g, '');  // Remove newline characters
  move = move.replace(/['"]/g, '');  // Remove both single and double quotes
  move = move.replace(/\./g, '');  // Remove period

  let moveResult = game.move(move, {sloppy: true});

  if (moveResult === null) {
    // Move was not legal, handle as appropriate for your application
    document.getElementById('ai-thoughts').textContent = `Invalid move: ${move}. Retrying...`;
    return aiMove(move);
  } else {
    document.getElementById('ai-thoughts').textContent = `AI moved: ${move}`;
    board.position(game.fen());  // Update the board to the new position
  }
}

// Function to check the status of the game
function checkGameStatus() {
  if (game.in_checkmate()) {
    alert('Checkmate');
	return;
  } else if (game.in_draw()) {
    let drawReason = '50-move rule';
    if (game.insufficient_material()) {
      drawReason = 'Insufficient material';
	  return;
    } else if (game.in_threefold_repetition()) {
      drawReason = 'Threefold repetition';
	  return;
    } else if (game.in_stalemate()) {
      drawReason = 'Stalemate';
	  return;
    }
    alert(`Draw (${drawReason})`);
	return;
  }
  aiMove();
}

// Update board position after piece snap
function onSnapEnd () {
  board.position(game.fen());
}

// Configure board
var cfg = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};
board = Chessboard('board', cfg);
