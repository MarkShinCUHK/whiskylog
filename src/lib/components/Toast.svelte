<script>
  export let message = '';
  export let type = 'success'; // 'success' | 'error'
  export let onClose = () => {};

  $: bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  $: iconPath = type === 'success'
    ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
</script>

<div
  class="flex items-center gap-3 {bgColor} text-white px-4 py-3 rounded-lg shadow-lg ring-1 ring-black/10 min-w-[300px] max-w-md animate-[slideIn_0.3s_ease-out,fadeIn_0.3s_ease-out]"
  role="alert"
  aria-live="polite"
  style="animation: slideIn 0.3s ease-out, fadeIn 0.3s ease-out;"
>
  <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath} />
  </svg>
  <p class="flex-1 text-sm font-medium">{message}</p>
  <button
    type="button"
    on:click={onClose}
    class="flex-shrink-0 rounded-md p-1.5 hover:bg-white/20 transition-colors"
    aria-label="닫기"
  >
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>

<style>
  @keyframes slideIn {
    from {
      transform: translateY(-1.25rem);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
