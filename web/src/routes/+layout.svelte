<script lang="ts">
    import "virtual:windi.css";
</script>

<slot/>

<style windi:preflights:global windi:safelist:global>
    :global(html, body, #app) {
        background-color: #0c0213;
        margin: 0;
        padding: 0;
        width: 100vw;
        height: 100vh;
        font-family: "Josefin Sans", sans-serif;
        color: #e4c8f9;
    }

    :global(#app) {
        display: flex;
        align-items: stretch;
    }

    :global(*) {
        --un-blur: blur(0);
        --un-brightness: brightness(1);
        --un-contrast: contrast(1);
        --un-drop-shadow: drop-shadow(0px 0px);
        --un-hue-rotate: hue-rotate(0);
        --un-invert: invert(0);
        --un-saturate: saturate(0);
        --un-sepia: sepia(0);
    }
</style>