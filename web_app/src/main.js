import { mount } from 'svelte';
import App from './App.svelte';
import { init_player_save } from './player_save.js';

init_player_save();

const app = mount(App, {
	target: document.body,
	props: {}
});

export default app;