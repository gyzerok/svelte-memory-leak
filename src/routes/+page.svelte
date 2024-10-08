<script>
  let counter = $state(0);
  let show = $state(false);
</script>

<div>Count: {counter}</div>
<button onclick={() => (show = !show)}>Toggle</button>
{#if show}
  <button
    onclick={() => {
      counter += 1;
    }}
  >
    Increment
  </button>
{/if}
