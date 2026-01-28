<script lang="ts">
  export let value = 0;
  export let name = '';
  export let label = '';
  export let min = 0;
  export let max = 5;
  export let step = 0.5;
  export let disabled = false;

  const stars = Array.from({ length: 5 });

  function clamp(value: number) {
    return Math.min(max, Math.max(min, value));
  }

  $: percent = max > 0 ? (clamp(value) / max) * 100 : 0;

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    value = clamp(Number(target.value));
  }
</script>

<div class="flex flex-col gap-2">
  {#if label}
    <span class="text-sm font-medium text-gray-700">{label}</span>
  {/if}
  <div class="flex items-center gap-3">
    <div class="relative h-6 w-32">
      <div class="absolute inset-0 flex text-gray-300">
        {#each stars as _}
          <svg
            class="h-6 w-6"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.975a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.381 2.455a1 1 0 00-.364 1.118l1.287 3.974c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.176 0l-3.381 2.454c-.784.57-1.838-.196-1.539-1.118l1.287-3.974a1 1 0 00-.364-1.118L2.22 9.402c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.975z" />
          </svg>
        {/each}
      </div>
      <div
        class="absolute inset-0 flex text-whiskey-600 overflow-hidden"
        style={`width:${percent}%`}
        aria-hidden="true"
      >
        {#each stars as _}
          <svg
            class="h-6 w-6"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.975a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.381 2.455a1 1 0 00-.364 1.118l1.287 3.974c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.176 0l-3.381 2.454c-.784.57-1.838-.196-1.539-1.118l1.287-3.974a1 1 0 00-.364-1.118L2.22 9.402c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.975z" />
          </svg>
        {/each}
      </div>
      <input
        type="range"
        {min}
        {max}
        {step}
        value={value}
        name={name}
        aria-label={label || name}
        {disabled}
        on:input={handleInput}
        class="absolute inset-0 h-6 w-full cursor-pointer opacity-0"
      />
    </div>
    <span class="text-sm text-gray-600 tabular-nums">{value.toFixed(1)}</span>
  </div>
</div>
