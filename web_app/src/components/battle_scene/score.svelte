<script>
    import { player_score } from '../../stores.js';
</script>

<div id='score'>{$player_score}</div>

<style>
    #score{
		height: 50px;
		width: 50px;
        font-size: 30px;
		position: absolute;
		left: 30px;
		top: 80px;
		float: right;
		display: flex;
		justify-content: space-around;
		align-items: center;
        color: white;
        z-index: 2;
	}
</style>