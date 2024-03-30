<script>
    import { player_health } from '../../stores.js';
</script>

<div id='health-bar'>
    <div class='health' style={`width: ${$player_health}%`}></div>
</div>

<style>
    #health-bar {
		height: 50px;
		width: 300px;
		box-sizing: border-box;
		position: absolute;
		left: 30px;
		top: 30px;
		float: right;
		display: flex;
		justify-content: left;
		align-items: center;
        background-color: red;
        z-index: 2;
	}

    #health-bar .health {
        height: 100%;
        width: 100%;
        background-color: rgb(62, 255, 62);
    }
</style>