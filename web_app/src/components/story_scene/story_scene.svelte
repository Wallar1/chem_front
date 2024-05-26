
<script>
    import { current_scene, possible_scenes } from '../../stores.js';

    const base_path = 'story_pics'
    const blasting_off = 'blasting_off'
    const entering_lab = 'entering_lab'
    // TODO: will these / paths work on PC? Or only on mac?
    const blasting_off_path = `${base_path}/${blasting_off}.png`;
    const entering_lab_path = `${base_path}/${entering_lab}.png`;

    let curr_image = blasting_off;
    let curr_path = blasting_off_path;

    function show_next_image() {
        // const img1 = new Image();

        if (curr_image === blasting_off) {
            curr_image = entering_lab
            curr_path = entering_lab_path
        } else if (curr_image === entering_lab) {
            $current_scene = possible_scenes.Timeline;
        }
        
        // document.body.appendChild(img1);
    }
</script>

<div id='outer' on:click|stopPropagation={show_next_image}>
    <img src={curr_path} alt={curr_image} />
</div>

<style>
    #outer {
        height: 100vh;
        width: 100vw;
    }

    #outer img {
        height: 100%;
        width: 100%;
    }
</style>