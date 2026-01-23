<script lang="ts">
  import Toast from './Toast.svelte';
  import { toastStore } from '$lib/stores/toast';

  function handleClose(id: string): void {
    toastStore.remove(id);
  }
</script>

<div
  class="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none"
  role="region"
  aria-label="알림"
>
  {#each $toastStore.toasts as toast (toast.id)}
    <div class="pointer-events-auto">
      <Toast message={toast.message} type={toast.type} onClose={() => handleClose(toast.id)} />
    </div>
  {/each}
</div>
