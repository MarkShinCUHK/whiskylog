<script lang="ts">
  export let value = 0.5;
  export let name = '';
  export let label = '';
  export let disabled = false;

  function clamp(value: number) {
    return Math.min(1, Math.max(0, value));
  }

  $: percent = clamp(value) * 100;

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
    <div class="relative h-3 w-full max-w-sm">
      <div class="h-3 w-full rounded-full bg-gradient-to-r from-whiskey-100 via-whiskey-400 to-whiskey-900"></div>
      <div class="absolute left-1/2 top-1/2 h-4 w-px -translate-y-1/2 bg-white/80"></div>
      <div
        class="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-whiskey-800/40 bg-white shadow"
        style={`left: calc(${percent}% - 8px)`}
      ></div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        name={name}
        aria-label={label || name}
        {disabled}
        on:input={handleInput}
        class="absolute inset-0 h-6 w-full cursor-pointer opacity-0"
      />
    </div>
    <span class="text-sm text-gray-600 tabular-nums">{value.toFixed(2)}</span>
  </div>
</div>
