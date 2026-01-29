<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { env } from '$env/dynamic/public';
  import { loadNaverMaps } from '$lib/client/naverMaps';

  type MapLocation = {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  };

  const locations: MapLocation[] = [
    {
      id: 'sample-1',
      name: '콜키지 가능한 바 (샘플)',
      address: '서울특별시 중구 세종대로 110',
      lat: 37.566535,
      lng: 126.977969
    },
    {
      id: 'sample-2',
      name: '위스키 라운지 (샘플)',
      address: '서울특별시 강남구 테헤란로 152',
      lat: 37.500869,
      lng: 127.036184
    }
  ];

  let mapContainer = $state<HTMLDivElement | null>(null);
  let mapInstance = $state<any>(null);
  let mapError = $state('');
  let selectedId = $state<string | null>(null);

  onMount(async () => {
    if (!env.PUBLIC_NAVER_MAPS_CLIENT_ID) {
      mapError = '네이버 지도 API 키가 설정되지 않았습니다.';
      return;
    }

    try {
      const naver = await loadNaverMaps(env.PUBLIC_NAVER_MAPS_CLIENT_ID);
      mapContainer = document.getElementById('naver-map') as HTMLDivElement | null;
      if (!mapContainer) return;

      const defaultCenter = locations[0]
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
        콜키지 가능한 위스키 바 리스트를 지도에서 확인하세요. (현재는 샘플 데이터)
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div class="space-y-3">
        {#each locations as location (location.id)}
          <button
            type="button"
            onclick={() => focusLocation(location)}
            class="w-full rounded-2xl border {selectedId === location.id ? 'border-whiskey-400 bg-whiskey-50' : 'border-gray-200 bg-white'} px-4 py-3 text-left shadow-sm hover:border-whiskey-300"
          >
            <p class="text-sm font-semibold text-gray-900">{location.name}</p>
            <p class="mt-1 text-xs text-gray-500">{location.address}</p>
          </button>
        {/each}
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
