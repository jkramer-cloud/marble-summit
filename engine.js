// Browser-ready mirror of movement-engine.mjs: do not edit independently.
/**
 * Marble Summit — Phase 1, deterministic movement/rules engine.
 * Pure ES module, compatible with browsers and Node 20+.
 * It does NOT animate pieces or roll random dice; the future UI supplies a die result.
 * Rules and geometry are loaded from board-geometry.json (v2 approved blueprint).
 */

const MAX_HISTORY = 300;

const clone = value => JSON.parse(JSON.stringify(value));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const trackNumber = id => /^T\d\d$/.test(id) ? Number(id.slice(1)) : null;

function validateBoard(board) {
  assert(board && typeof board === 'object' && board.nodes && board.players && board.paths, 'Missing board data');
  const players = board.players;
  const nodes = board.nodes;
  assert(players.length === 6, 'Six player sectors required');
  assert(Object.keys(nodes).length === 139, 'Approved board must contain 139 nodes');
  assert(board.geometry.outer_track_including_star === 90, 'Expected 90-hole outer loop');
  const uniqueCoords = new Set();
  for (const [id, node] of Object.entries(nodes)) {
    assert(node.id === id, `Node ${id} has inconsistent ID`);
    assert(Number.isFinite(node.x) && Number.isFinite(node.y), `Node ${id} missing coordinates`);
    const key = `${node.x.toFixed(3)},${node.y.toFixed(3)}`;
    assert(!uniqueCoords.has(key), `Duplicate physical coordinate at ${id}`);
    uniqueCoords.add(key);
  }
  const starIds = board.geometry.star_ring_clockwise;
  assert(starIds.length === 6 && new Set(starIds).size === 6, 'Expected six unique star junctions');
  for (let i = 0; i < 90; i++) {
    const id = `T${String(i).padStart(2, '0')}`;
    const next = `T${String((i + 1) % 90).padStart(2, '0')}`;
    assert(nodes[id]?.main_next === next, `Broken outer ring at ${id}`);
    assert(nodes[id].type === (i % 15 === 0 ? 'star' : 'track'), `Incorrect node type at ${id}`);
  }
  for (let p = 0; p < 6; p++) {
    const player = players[p];
    const expectedStart = `T${String(p * 15 + 8).padStart(2, '0')}`;
    const expectedEntry = `T${String(p * 15 + 7).padStart(2, '0')}`;
    assert(player.start === expectedStart && player.home_entry === expectedEntry, `Start/entry mismatch: ${player.name}`);
    assert(nodes[player.home_entry].main_next === player.start, `HOME entry must be immediately before START: ${player.name}`);
    assert(player.approach_star === starIds[p], `Approach star mismatch: ${player.name}`);
    assert(nodes[starIds[p]].star_next_clockwise === starIds[(p + 1) % 6], `Broken star ring at ${starIds[p]}`);
    assert(player.base.length === 4 && player.home.length === 4, `Need four BASE and HOME positions for ${player.name}`);
    for (let j = 0; j < 4; j++) {
      assert(nodes[player.base[j]]?.type === 'base' && nodes[player.base[j]].owner === player.name, `Bad BASE hole: ${player.name}`);
      assert(nodes[player.home[j]]?.type === 'home' && nodes[player.home[j]].owner === player.name, `Bad HOME hole: ${player.name}`);
      assert(nodes[player.home[j]].next_inward === (j === 3 ? null : player.home[j + 1]), `Broken HOME lane: ${player.name}`);
    }
  }
  assert(nodes.CENTER?.type === 'center', 'Center is missing');
  return true;
}

function initialState(board, { activePlayers = board.players.map(p => p.name) } = {}) {
  validateBoard(board);
  assert(Array.isArray(activePlayers) && activePlayers.length >= 2 && activePlayers.length <= 6, 'Use 2–6 active players');
  const names = board.players.map(p => p.name);
  assert(new Set(activePlayers).size === activePlayers.length && activePlayers.every(x => names.includes(x)), 'Unknown/duplicate active player');
  const marbles = [];
  for (const name of activePlayers) {
    const player = board.players.find(p => p.name === name);
    player.base.forEach((location, i) => marbles.push({ id: `${name}-${i+1}`, owner: name, location, homeEligible: false }));
  }
  const state = { schema: 1, activePlayers: [...activePlayers], marbles,
    currentPlayer: activePlayers[0], phase: 'await-roll', die: null,
    turn: 1, winner: null, history: [], lastEvent: null };
  validateState(board, state);
  return state;
}

function validateState(board, state) {
  assert(state && state.schema === 1, 'Unsupported game state');
  assert(Array.isArray(state.activePlayers) && state.activePlayers.length >= 2 && state.activePlayers.length <= 6, 'Invalid participants');
  const names = board.players.map(p => p.name);
  assert(new Set(state.activePlayers).size === state.activePlayers.length && state.activePlayers.every(p => names.includes(p)), 'Invalid active players');
  assert(state.activePlayers.includes(state.currentPlayer), 'Current player is inactive');
  assert(['await-roll', 'await-move', 'finished'].includes(state.phase), 'Invalid phase');
  assert(state.marbles?.length === state.activePlayers.length * 4, 'Each active player must have exactly four marbles');
  assert(state.marbles.every(m => typeof m.homeEligible === 'boolean'), 'Each marble needs a HOME eligibility flag');
  const ids = new Set(), locations = new Set(), ownerCounts = new Map();
  for (const marble of state.marbles) {
    assert(!ids.has(marble.id), `Duplicate marble: ${marble.id}`); ids.add(marble.id);
    const node = board.nodes[marble.location];
    assert(node, `Marble ${marble.id} on unknown hole ${marble.location}`);
    assert(!locations.has(marble.location), `Two marbles in ${marble.location}`); locations.add(marble.location);
    assert(state.activePlayers.includes(marble.owner), `Marble owner inactive: ${marble.id}`);
    const player = board.players.find(p => p.name === marble.owner);
    assert(marble.id.startsWith(`${marble.owner}-`), `Marble ID mismatch: ${marble.id}`);
    if (node.type === 'base') {
      assert(player.base.includes(marble.location), `Incorrect BASE: ${marble.id}`);
      assert(!marble.homeEligible, `BASE marble must reset HOME eligibility: ${marble.id}`);
    }
    if (node.type === 'home') assert(player.home.includes(marble.location), `Incorrect HOME: ${marble.id}`);
    ownerCounts.set(marble.owner, (ownerCounts.get(marble.owner) || 0) + 1);
  }
  assert(state.activePlayers.every(p => ownerCounts.get(p) === 4), 'Each player must own four marbles');
  if (state.phase === 'await-move') assert(Number.isInteger(state.die) && state.die >= 1 && state.die <= 6, 'A move needs a valid die');
  else assert(state.die === null, 'Die must be cleared outside move selection');
  if (state.phase === 'finished') assert(state.winner && state.activePlayers.includes(state.winner), 'Finished game needs a winner');
  else assert(state.winner === null, 'Unfinished game must not have a winner');
  return true;
}

const participant = (board, owner) => board.players.find(p => p.name === owner);
const occupantAt = state => new Map(state.marbles.map(m => [m.location, m]));
const annotate = (marble, path, edgeKinds, homeEligible, occupancies, die) => {
  const destination = path[path.length - 1];
  const victim = occupancies.get(destination);
  const captured = victim && victim.owner !== marble.owner ? victim.id : null;
  const kind = edgeKinds.includes('center-in') ? 'center-entry'
    : edgeKinds.includes('center-out') ? 'center-exit'
    : edgeKinds.includes('release') ? 'release'
    : edgeKinds.includes('star-hop') && edgeKinds.includes('outer') ? 'star-to-outer'
    : edgeKinds.includes('star-hop') ? 'star-ring'
    : edgeKinds.includes('home') ? 'home'
    : 'outer';
  return {
    id: `${marble.id}:${path.join('>')}`,
    marbleId: marble.id, player: marble.owner, from: marble.location, to: destination,
    die, path, edgeKinds, kind, homeEligibleAfter: homeEligible,
    capture: captured,
  };
};

/**
 * Generate complete, legal routes for ALL marbles owned by the current player.
 * Optional die overrides state.die for previews and testing; does not change state.
 * A star may only initiate a shortcut if the marble STARTS this die roll on that star.
 */
function legalMoves(board, state, die = state.die) {
  assert(Number.isInteger(die) && die >= 1 && die <= 6, 'Die must be from 1 to 6');
  const occupancy = occupantAt(state);
  const player = participant(board, state.currentPlayer);
  const generated = [];
  const stars = board.geometry.star_ring_clockwise;
  const ownApproach = player.approach_star;
  for (const marble of state.marbles) {
    if (marble.owner !== state.currentPlayer) continue;
    const startNode = board.nodes[marble.location];
    const blockedByOwn = to => occupancy.has(to) && occupancy.get(to).owner === marble.owner && occupancy.get(to).id !== marble.id;
    const add = (path, edges, eligible) => generated.push(annotate(marble, path, edges, eligible, occupancy, die));

    if (startNode.type === 'base') {
      if ((die === 1 || die === 6) && !blockedByOwn(player.start)) {
        // Leaving BASE consumes the roll, even if the die was a 6.
        add([player.start], ['release'], false);
      }
      continue;
    }
    if (startNode.type === 'center') {
      if (die === 1) {
        for (const star of stars) if (!blockedByOwn(star)) {
          add([star], ['center-out'], marble.homeEligible || star === ownApproach);
        }
      }
      continue;
    }
    if (startNode.type === 'home') {
      let curr = marble.location;
      const path = [];
      for (let steps = 0; steps < die; steps++) {
        curr = board.nodes[curr]?.next_inward;
        if (!curr || blockedByOwn(curr)) break;
        path.push(curr);
        if (steps === die - 1) add(path, Array(die).fill('home'), marble.homeEligible);
      }
      continue;
    }

    // CENTER is only a one-pip action from a star, and only on a new turn.
    if (startNode.type === 'star' && die === 1 && !blockedByOwn('CENTER')) {
      add(['CENTER'], ['center-in'], marble.homeEligible);
    }
    const initialMode = startNode.type === 'star' ? 'choice' : 'outer';
    const explore = (at, remaining, mode, path, edges, eligible) => {
      if (remaining === 0) {
        // Prevent a full six-star lap ending where the piece already stood.
        if (at !== marble.location) add(path, edges, eligible);
        return;
      }
      const node = board.nodes[at];
      let choices = [];
      if (node.type === 'home') {
        if (node.next_inward) choices = [[node.next_inward, 'home', 'home']];
      } else if (node.type === 'track' || node.type === 'star') {
        if (mode === 'outer' || mode === 'choice' || mode === 'ring') {
          choices.push([node.main_next, 'outer', 'outer']);
        }
        // Stars crossed during normal movement never initiate shortcuts mid-roll.
        if (node.type === 'star' && (mode === 'choice' || mode === 'ring')) {
          choices.push([node.star_next_clockwise, 'ring', 'star-hop']);
        }
        if (node.special === 'home_entry' && node.owner === marble.owner && eligible && mode === 'outer') {
          choices.push([player.home[0], 'home', 'home']);
        }
      }
      for (const [to, nextMode, kind] of choices) {
        if (!to || blockedByOwn(to)) continue;
        explore(to, remaining - 1, nextMode, [...path, to], [...edges, kind], eligible || to === ownApproach);
      }
    };
    explore(marble.location, die, initialMode, [], [], marble.homeEligible);
  }
  const unique = new Map(generated.map(move => [move.id, move]));
  return [...unique.values()].sort((a, b) => a.marbleId.localeCompare(b.marbleId)
    || a.path.join(',').localeCompare(b.path.join(',')));
}

const record = (state, event) => {
  state.lastEvent = event;
  state.history.push(event);
  if (state.history.length > MAX_HISTORY) state.history.splice(0, state.history.length - MAX_HISTORY);
};
const advancePlayer = state => {
  const current = state.activePlayers.indexOf(state.currentPlayer);
  state.currentPlayer = state.activePlayers[(current + 1) % state.activePlayers.length];
  state.turn += 1;
  state.phase = 'await-roll';
  state.die = null;
};

/** Commit a die supplied by the future UI. No random number generation is hidden in the engine. */
function acceptRoll(board, previous, die) {
  validateState(board, previous);
  assert(previous.phase === 'await-roll', 'Cannot roll before choosing the prior move');
  assert(Number.isInteger(die) && die >= 1 && die <= 6, 'Die must be an integer from 1 to 6');
  const next = clone(previous);
  const rolledBy = next.currentPlayer;
  next.phase = 'await-move';
  next.die = die;
  const moves = legalMoves(board, next, die);
  if (!moves.length) {
    record(next, { type: 'no-legal-move', player: rolledBy, die, turn: next.turn, extraTurn: false,
      detail: die === 6 ? 'Blocked six: no bonus roll' : 'No complete legal move' });
    advancePlayer(next);
  } else {
    record(next, { type: 'rolled', player: rolledBy, die, turn: next.turn, availableMoves: moves.length });
  }
  validateState(board, next);
  return next;
}

/** Select a path ID previously returned by legalMoves; revalidates the path against the state. */
function commitMove(board, previous, moveId) {
  validateState(board, previous);
  assert(previous.phase === 'await-move', 'Roll the die before selecting a move');
  const allowed = legalMoves(board, previous);
  const action = allowed.find(move => move.id === moveId);
  assert(action, 'Illegal route or stale move selection');
  const next = clone(previous);
  const marble = next.marbles.find(m => m.id === action.marbleId);
  const occupant = next.marbles.find(m => m.location === action.to && m.id !== marble.id);
  let capture = null;
  if (occupant) {
    assert(occupant.owner !== marble.owner, 'Cannot land on your own marble');
    const base = participant(board, occupant.owner).base;
    const used = new Set(next.marbles.filter(m => m.id !== occupant.id).map(m => m.location));
    const freeBaseHole = base.find(hole => !used.has(hole));
    assert(freeBaseHole, 'No space available to send captured marble back to BASE');
    capture = { marbleId: occupant.id, player: occupant.owner, from: occupant.location, to: freeBaseHole };
    occupant.location = freeBaseHole;
    occupant.homeEligible = false;
  }
  marble.location = action.to;
  marble.homeEligible = action.homeEligibleAfter;
  const owned = next.marbles.filter(m => m.owner === marble.owner);
  const won = owned.every(m => board.nodes[m.location].type === 'home');
  const bonusRoll = !won && previous.die === 6;
  record(next, { type: 'move', player: marble.owner, marbleId: marble.id, turn: next.turn, die: previous.die,
    from: action.from, to: action.to, path: action.path, edgeKinds: action.edgeKinds,
    kind: action.kind, capture, bonusRoll, homeEligibleAfter: marble.homeEligible });
  if (won) {
    next.phase = 'finished';
    next.winner = marble.owner;
    next.die = null;
    record(next, { type: 'win', player: marble.owner, turn: next.turn });
  } else if (bonusRoll) {
    next.phase = 'await-roll';
    next.die = null;
    record(next, { type: 'bonus-roll', player: marble.owner, reason: 'completed six', turn: next.turn });
  } else {
    advancePlayer(next);
  }
  validateState(board, next);
  return next;
}

/** Convenient inspectable status for future UI scoreboards and save files. */
function playerStatus(board, state) {
  return state.activePlayers.map(name => {
    const owned = state.marbles.filter(m => m.owner === name);
    return {
      player: name,
      base: owned.filter(m => board.nodes[m.location].type === 'base').length,
      home: owned.filter(m => board.nodes[m.location].type === 'home').length,
      course: owned.filter(m => ['track', 'star', 'center'].includes(board.nodes[m.location].type)).length,
      homeEligible: owned.filter(m => m.homeEligible).length,
      won: state.winner === name,
    };
  });
}

class MarbleSummitGame {
  #board;
  #state;
  constructor(board, options = {}) {
    validateBoard(board);
    this.#board = board;
    this.#state = options.state ? clone(options.state) : initialState(board, options);
    validateState(board, this.#state);
  }
  snapshot() { return clone(this.#state); }
  legalMoves(die = this.#state.die) { return legalMoves(this.#board, this.#state, die); }
  roll(die) { this.#state = acceptRoll(this.#board, this.#state, die); return this.snapshot(); }
  move(moveId) { this.#state = commitMove(this.#board, this.#state, moveId); return this.snapshot(); }
  status() { return playerStatus(this.#board, this.#state); }
}

window.MarbleSummitGame=MarbleSummitGame;window.MarbleSummitEngine={validateBoard,initialState,validateState,legalMoves,acceptRoll,commitMove,playerStatus};
