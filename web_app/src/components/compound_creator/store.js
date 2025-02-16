import { writable } from 'svelte/store';

const GameStates = Object.freeze({
    'STARTING': Symbol('starting'),
    'PLAYING': Symbol('playing'),
    'GAMELOST': Symbol('game_over'),
    'GAMEWON': Symbol('game won'),
});

const game_state = writable({
    'state': GameStates.STARTING,
    'level': 1,
});

const selected_atom = writable('C');

const creator_moves_remaining = writable(0);


export const store = {
    GameStates,
    game_state,
    selected_atom,
    creator_moves_remaining,
}