<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { env } from '$env/dynamic/public';
  import { loadNaverMaps } from '$lib/client/naverMaps';
  import type { PageData } from './$types';

  type MapLocation = {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  };

  let { data }: { data: PageData } = $props();

  // 서버에서 가져온 데이터를 MapLocation 형식으로 변환
  const locations: MapLocation[] = $derived(
    (data.places || [])
      .filter((place) => place.lat != null && place.lng != null)
      .map((place) => ({
        id: place.id,
        name: place.name,
        address: place.address || '',
        lat: place.lat!,
        lng: place.lng!
      }))
  );

  let mapContainer = $state<HTMLDivElement | null>(null);
  let mapInstance = $state<any>(null);
  let mapError = $state('');
  let selectedId = $state<string | null>(null);
  let listContainer = $state<HTMLDivElement | null>(null);

  onMount(async () => {
    if (!env.PUBLIC_NAVER_MAPS_CLIENT_ID) {
      mapError = '네이버 지도 API 키가 설정되지 않았습니다.';
      return;
    }

    try {
      const naver = await loadNaverMaps(env.PUBLIC_NAVER_MAPS_CLIENT_ID);
      mapContainer = document.getElementById('naver-map') as HTMLDivElement | null;
      if (!mapContainer) return;

      // 데이터가 있으면 첫 번째 장소를 중심으로, 없으면 서울 시청을 중심으로
      const defaultCenter =
        locations.length > 0
          ? new naver.maps.LatLng(locations[0].lat, locations[0].lng)
          : new naver.maps.LatLng(37.566535, 126.977969);

      mapInstance = new naver.maps.Map(mapContainer, {
        center: defaultCenter,
        zoom: 12
      });

      locations.forEach((location) => {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(location.lat, location.lng),
          map: mapInstance,
          title: location.name
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          selectedId = location.id;
          mapInstance.setCenter(new naver.maps.LatLng(location.lat, location.lng));
          // 왼쪽 목록에서 해당 항목으로 스크롤
          scrollToLocation(location.id);
        });
      });
    } catch (error) {
      mapError = error instanceof Error ? error.message : '지도 로딩에 실패했습니다.';
    }
  });

  function focusLocation(location: MapLocation) {
    if (!mapInstance) return;
    selectedId = location.id;
    mapInstance.setCenter(new window.naver.maps.LatLng(location.lat, location.lng));
    mapInstance.setZoom(14);
    scrollToLocation(location.id);
  }

  function scrollToLocation(locationId: string) {
    if (!listContainer) return;
    const element = listContainer.querySelector(`[data-location-id="${locationId}"]`) as HTMLElement;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
</script>

<svelte:head>
  <title>맵 조회 - whiskylog</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-4 xl:px-8 py-12">
  <div class="mb-6">
    <a
      href={resolve('/')}
      class="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-whiskey-700"
    >
      <span aria-hidden="true">&lt;</span>
      메인으로
    </a>
  </div>

  <div class="rounded-3xl bg-white/80 backdrop-blur-sm p-8 sm:p-10 shadow-lg ring-1 ring-black/5">
    <div class="flex flex-col gap-2 mb-6">
      <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">맵 조회</h1>
      <p class="text-sm text-gray-600">
        콜키지 가능한 위스키 바 리스트를 지도에서 확인하세요.
        {#if locations.length > 0}
          <span class="font-semibold text-whiskey-700">총 {locations.length}개 장소</span>
        {/if}
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div
        bind:this={listContainer}
        class="space-y-3 max-h-[600px] overflow-y-auto pr-2 scroll-smooth"
      >
        {#if locations.length === 0}
          <div class="rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center">
            <p class="text-sm text-gray-500">등록된 장소가 없습니다.</p>
          </div>
        {:else}
          {#each locations as location (location.id)}
            <button
              type="button"
              data-location-id={location.id}
              onclick={() => focusLocation(location)}
              class="w-full rounded-2xl border transition-all duration-200 px-4 py-3 text-left {selectedId === location.id
                ? 'border-whiskey-500 bg-whiskey-100 shadow-lg shadow-whiskey-200/50 ring-2 ring-whiskey-300 ring-offset-2'
                : 'border-gray-200 bg-white shadow-sm hover:border-whiskey-300 hover:shadow-md'}"
            >
              <p class="text-sm font-semibold {selectedId === location.id ? 'text-whiskey-900' : 'text-gray-900'}">
                {location.name}
              </p>
              <p class="mt-1 text-xs {selectedId === location.id ? 'text-whiskey-700' : 'text-gray-500'}">
                {location.address}
              </p>
            </button>
          {/each}
        {/if}
      </div>

      <div class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
        {#if mapError}
          <div class="p-6 text-sm text-red-600">{mapError}</div>
        {:else}
          <div id="naver-map" class="h-[420px] w-full"></div>
        {/if}
      </div>
    </div>
  </div>
</div>
