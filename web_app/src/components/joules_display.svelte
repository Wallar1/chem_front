<script>
    import { joules } from '../upgrades.js';

    export let compact = false;
</script>

<div class="joules-display" class:compact aria-label="Joules: {$joules}">
    <img src="joule.svg" alt="" class="joule-icon" width="40" height="40">
    <span class="joule-count">{$joules}</span>
</div>

<style>
    .joules-display {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px 6px 8px;
        background: rgba(12, 18, 36, 0.72);
        border: 1px solid rgba(124, 240, 255, 0.45);
        border-radius: 999px;
        color: #e8fbff;
        font-weight: 700;
        font-size: 1.25rem;
        letter-spacing: 0.02em;
        line-height: 1;
    }

    .joules-display.compact {
        font-size: 1rem;
        padding: 4px 10px 4px 6px;
    }

    .joule-icon {
        display: block;
        width: 40px;
        height: 40px;
        object-fit: contain;
        filter: drop-shadow(0 0 4px rgba(255, 140, 40, 0.55));
    }

    .compact .joule-icon {
        width: 28px;
        height: 28px;
    }
</style>
