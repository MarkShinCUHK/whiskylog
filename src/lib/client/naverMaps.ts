let scriptPromise: Promise<any> | null = null;

declare global {
  interface Window {
    naver?: any;
  }
}

export function loadNaverMaps(clientId: string): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저 환경에서만 사용할 수 있습니다.'));
  }

  if (window.naver?.maps) {
    return Promise.resolve(window.naver);
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.naver?.maps) {
        resolve(window.naver);
      } else {
        reject(new Error('네이버 지도 스크립트를 로드했지만 maps 객체가 없습니다.'));
      }
    };
    script.onerror = () => reject(new Error('네이버 지도 스크립트 로드에 실패했습니다.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}
