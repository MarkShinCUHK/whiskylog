<script lang="ts">
  import { resolve } from '$app/paths';
  import questionsData from '$lib/data/wbti-questions.json';

  type Axis = 'F' | 'E' | 'C' | 'I' | 'S' | 'N' | 'H' | 'P';
  type Stage = 'intro' | 'quiz' | 'result';
  type QuizMode = 'short' | 'full';

  type Question = {
    id: number;
    text: string;
    yes: Axis;
    no: Axis;
  };

  const questions = questionsData as Question[];

  const groupQuestions: Record<'FE' | 'CI' | 'SN' | 'HP', Question[]> = {
    FE: questions.slice(0, 10),
    CI: questions.slice(10, 20),
    SN: questions.slice(20, 30),
    HP: questions.slice(30, 40)
  };

  const axisPairs: Array<[Axis, Axis]> = [
    ['F', 'E'],
    ['C', 'I'],
    ['S', 'N'],
    ['H', 'P']
  ];

  const axisLabels: Record<Axis, string> = {
    F: '익숙형',
    E: '탐험형',
    C: '캐주얼',
    I: '몰입형',
    S: '감각형',
    N: '서사형',
    H: '공유형',
    P: '개인형'
  };

  const axisDescriptions: Record<Axis, string> = {
    F: '실패 확률이 낮은 익숙한 선택을 선호하는 타입',
    E: '새로움과 변주를 즐기는 탐험가 타입',
    C: '규칙 없이 편하게 즐기는 타입',
    I: '의식처럼 집중해서 마시는 타입',
    S: '향·맛·질감 같은 감각을 중시하는 타입',
    N: '이야기·맥락·기억을 중시하는 타입',
    H: '공유와 교류에서 즐거움을 얻는 타입',
    P: '혼자 간직하는 여운을 중시하는 타입'
  };

  type WbtiProfile = {
    title: string;
    nickname: string;
    features: string[];
    copy: string;
    styles: string[];
  };

  const profiles: Record<string, WbtiProfile> = {
    FCSH: {
      title: 'The Friendly Regular',
      nickname: '“항상 그거 시키는 사람”',
      features: ['늘 마시던 술, 늘 편한 방식', '위스키는 음료, 술자리는 사람', '설명 잘 안 하지만 추천은 잘함'],
      copy: '“검증된 한 잔을, 좋은 사람들과.”',
      styles: ['밸런스 좋은 블렌디드', '가성비 싱글몰트']
    },
    FCSP: {
      title: 'The Comfort Sipper',
      nickname: '“집에 항상 같은 병 있는 사람”',
      features: ['실패 없는 선택, 조용한 만족', '위스키는 일상의 루틴'],
      copy: '“익숙함이 주는 가장 큰 위로.”',
      styles: ['데일리 몰트', '하이볼용 위스키']
    },
    FCNH: {
      title: 'The Story Regular',
      nickname: '“술 얘기 곁들이는 단골”',
      features: ['늘 마시는 술에도 이야기를 붙임', '술자리는 대화가 반'],
      copy: '“이 술, 사실 이런 얘기가 있어.”',
      styles: ['역사 있는 증류소', '브랜드 서사 강한 위스키']
    },
    FCNP: {
      title: 'The Quiet Nostalgic',
      nickname: '“혼자 추억 마시는 타입”',
      features: ['익숙한 술로 과거를 꺼냄', '기록은 안 해도 기억은 선명'],
      copy: '“같은 술, 다른 밤.”',
      styles: ['장기 숙성', '클래식 라인업']
    },
    FISH: {
      title: 'The Tasting Host',
      nickname: '“비교 시음 좋아하는 사람”',
      features: ['검증된 술로 깊게 즐김', '사람 불러서 제대로 마심'],
      copy: '“이건 이렇게 마셔야 해.”',
      styles: ['수직 시음 라인', '캐스크 비교용 몰트']
    },
    FISP: {
      title: 'The Precision Drinker',
      nickname: '“조용히 분석하는 타입”',
      features: ['환경·잔·시간 완벽주의', '남한텐 말 안 해도 혼자선 진심'],
      copy: '“오늘은 이 잔이 맞다.”',
      styles: ['고도수', '스트레이트 전용 몰트']
    },
    FINH: {
      title: 'The Ritual Storyteller',
      nickname: '“술에 의식이 있는 사람”',
      features: ['검증된 술 + 깊은 서사', '마시는 방식 자체가 콘텐츠'],
      copy: '“마시는 법에도 이야기가 있다.”',
      styles: ['증류소 아이콘 몰트', '클래식 빈티지']
    },
    FINP: {
      title: 'The Memory Curator',
      nickname: '“병으로 인생 정리하는 타입”',
      features: ['술을 기록처럼 저장', '위스키 = 개인 아카이브'],
      copy: '“이 병엔 그때의 내가 있다.”',
      styles: ['특별한 해에 산 병', '개인적 의미 있는 위스키']
    },
    ECSH: {
      title: 'The Social Explorer',
      nickname: '“새 술 나오면 불러보는 사람”',
      features: ['새로움은 같이 즐겨야 제맛', '실패해도 웃고 넘김'],
      copy: '“이거 처음인데, 같이 마셔볼래?”',
      styles: ['신상 위스키', '트렌디한 캐스크']
    },
    ECSP: {
      title: 'The Curious Sipper',
      nickname: '“혼자 몰래 신상 마시는 타입”',
      features: ['가볍게, 하지만 늘 새롭게', '탐험은 혼자 하는 취미'],
      copy: '“조용히 새로워지는 중.”',
      styles: ['소규모 증류소', '실험적인 몰트']
    },
    ECNH: {
      title: 'The Mood Drifter',
      nickname: '“분위기 따라 술 고르는 사람”',
      features: ['새로운 술 + 새로운 사람', '순간의 감정이 가장 중요'],
      copy: '“오늘 이 밤엔 이 술.”',
      styles: ['피니시 독특한 위스키', '감성 라벨']
    },
    ECNP: {
      title: 'The Solo Dreamer',
      nickname: '“혼술 감성러”',
      features: ['새 술을 장면으로 소비', '기록 안 해도 감정은 남김'],
      copy: '“이 술, 지금의 나랑 잘 맞아.”',
      styles: ['향 중심 위스키', '무드 있는 NAS']
    },
    EISH: {
      title: 'The Experimental Host',
      nickname: '“실험 시음회 여는 사람”',
      features: ['새 술을 깊게 파고 공유', '실패도 데이터'],
      copy: '“비교해보면 재밌을 거야.”',
      styles: ['캐스크 실험작', '하이 ABV']
    },
    EISP: {
      title: 'The Lone Analyst',
      nickname: '“혼자 파고드는 연구자”',
      features: ['새로운 술 + 철저한 분석', '결과는 마음속에 저장'],
      copy: '“아직 이 술의 전부는 안 나왔다.”',
      styles: ['싱글 캐스크', '배치별 차이 있는 위스키']
    },
    EINH: {
      title: 'The Whisky Bard',
      nickname: '“술로 이야기 만드는 사람”',
      features: ['탐험 + 몰입 + 서사', '말도 글도 잘 풀어냄'],
      copy: '“이 술엔 한 편의 이야기가 있다.”',
      styles: ['스토리 중심 브랜드', '아트 라벨']
    },
    EINP: {
      title: 'The Solitary Archivist',
      nickname: '“혼자 깊게 마시는 끝판왕”',
      features: ['가장 깊은 위스키 성향', '술은 기록이자 사유'],
      copy: '“이 술은, 나에게만 필요하다.”',
      styles: ['빈티지 / 레어 캐스크', '장기 숙성 싱글몰트']
    }
  };

  let stage = $state<Stage>('intro');
  let mode = $state<QuizMode>('full');
  let currentIndex = $state(0);
  let activeQuestions = $state<Question[]>([]);
  let answers = $state<Array<Axis | null>>([]);

  let counts = $derived.by(() => {
    const base: Record<Axis, number> = {
      F: 0,
      E: 0,
      C: 0,
      I: 0,
      S: 0,
      N: 0,
      H: 0,
      P: 0
    };
    for (const answer of answers) {
      if (answer) base[answer] += 1;
    }
    return base;
  });

  let result = $derived.by(() => {
    return axisPairs.map(([left, right]) => {
      const leftCount = counts[left];
      const rightCount = counts[right];
      if (leftCount === rightCount) {
        return {
          left,
          right,
          code: 'X',
          label: '스위칭형',
          description: '상황에 따라 유연하게 전환하는 타입'
        };
      }
      const code = leftCount > rightCount ? left : right;
      return {
        left,
        right,
        code,
        label: axisLabels[code],
        description: axisDescriptions[code]
      };
    });
  });

  let resultCode = $derived.by(() => result.map((item) => item.code).join(''));

  let officialName = $derived.by(() =>
    result
      .map((item) => (item.code === 'X' ? '스위칭형' : axisLabels[item.code as Axis]))
      .join(' · ')
  );

  let profile = $derived.by(() => profiles[resultCode]);

  let nickname = $derived.by(() => {
    if (profile?.nickname) return profile.nickname;
    if (resultCode.includes('X')) return '상황 따라 바뀌는 스위처';
    return '오늘도 한 잔 취향러';
  });

  let recommendations = $derived.by(() => {
    if (profile?.styles?.length) return profile.styles;
    const recs: string[] = [];
    const [first, second, third, fourth] = result;

    if (first?.code === 'F') recs.push('검증된 병 중심으로 베스트셀러 리스트를 만들어보세요.');
    if (first?.code === 'E') recs.push('매달 1병은 새로운 스타일로 도전해보세요.');

    if (second?.code === 'C') recs.push('부담 없는 한 잔 루틴으로 편하게 즐겨보세요.');
    if (second?.code === 'I') recs.push('잔·온도·시간을 맞춰 몰입 루틴을 만들어보세요.');

    if (third?.code === 'S') recs.push('향·맛 노트를 중심으로 취향을 기록해보세요.');
    if (third?.code === 'N') recs.push('기억에 남는 장면과 함께 기록해보세요.');

    if (fourth?.code === 'H') recs.push('함께 나눌 수 있는 시음 시간을 만들어보세요.');
    if (fourth?.code === 'P') recs.push('나만의 조용한 루틴을 지켜보세요.');

    return recs.slice(0, 3);
  });

  function shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function buildShortQuestions() {
    return [
      ...groupQuestions.FE.slice(0, 3),
      ...groupQuestions.CI.slice(0, 3),
      ...groupQuestions.SN.slice(0, 3),
      ...groupQuestions.HP.slice(0, 3)
    ];
  }

  function startQuiz(selectedMode: QuizMode) {
    stage = 'quiz';
    mode = selectedMode;
    currentIndex = 0;
    const base = selectedMode === 'short' ? buildShortQuestions() : questions;
    activeQuestions = shuffle(base);
    answers = activeQuestions.map(() => null);
  }

  function handleAnswer(value: Axis) {
    answers[currentIndex] = value;
    if (currentIndex < activeQuestions.length - 1) {
      currentIndex += 1;
    } else {
      stage = 'result';
    }
  }

  function goPrev() {
    if (currentIndex > 0) currentIndex -= 1;
  }

  function restart() {
    stage = 'intro';
    currentIndex = 0;
    activeQuestions = [];
    answers = [];
  }
</script>

<svelte:head>
  <title>WBTI 테스트 - whiskylog</title>
  <meta name="description" content="위스키 성향을 알려주는 WBTI 테스트를 진행해보세요." />
</svelte:head>

<div class="max-w-5xl mx-auto px-4 xl:px-8 py-12">
  <div class="mb-6">
    <a
      href={resolve('/')}
      class="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-whiskey-700"
    >
      <span aria-hidden="true">&lt;</span>
      메인으로
    </a>
  </div>
  {#if stage === 'intro'}
    <section class="rounded-3xl bg-white/70 backdrop-blur-sm p-10 sm:p-12 shadow-lg ring-1 ring-black/5">
      <div class="flex flex-col gap-6">
        <div class="inline-flex items-center gap-2 rounded-full bg-whiskey-100 px-4 py-2 text-sm font-semibold text-whiskey-800 w-fit">
          WBTI 테스트
        </div>
        <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          나의 위스키 성향을 알아볼까요?
        </h1>
        <p class="text-lg text-gray-600">
          원하는 테스트 길이를 선택하세요.
        </p>

        <div class="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onclick={() => startQuiz('short')}
            class="inline-flex min-h-[64px] items-center justify-center rounded-2xl bg-whiskey-600 px-6 py-5 text-base font-semibold text-white shadow hover:bg-whiskey-700"
          >
            12문항 · 약 1분 소요
          </button>
          <button
            type="button"
            onclick={() => startQuiz('full')}
            class="inline-flex min-h-[64px] items-center justify-center rounded-2xl bg-whiskey-900 px-6 py-5 text-base font-semibold text-white shadow hover:bg-whiskey-800"
          >
            40문항 · 약 5분 소요
          </button>
        </div>
      </div>
    </section>
  {:else if stage === 'quiz'}
    <section class="rounded-3xl bg-white/70 backdrop-blur-sm p-10 sm:p-12 shadow-lg ring-1 ring-black/5">
      <div class="flex items-center justify-between mb-6">
        <span class="text-sm font-semibold text-gray-500">
          {currentIndex + 1} / {activeQuestions.length}
        </span>
        <div class="h-2 w-32 sm:w-48 rounded-full bg-gray-200">
          <div
            class="h-2 rounded-full bg-whiskey-500 transition-all"
            style={`width: ${((currentIndex + 1) / activeQuestions.length) * 100}%`}
          ></div>
        </div>
      </div>

      <h2 class="text-2xl sm:text-3xl font-semibold text-gray-900 mb-8 leading-snug">
        {activeQuestions[currentIndex]?.text}
      </h2>

      <div class="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onclick={() => handleAnswer(activeQuestions[currentIndex].yes)}
          class="rounded-2xl border border-whiskey-200 bg-white px-6 py-4 text-lg font-semibold text-whiskey-800 shadow-sm hover:border-whiskey-400 hover:bg-whiskey-50"
        >
          Yes
        </button>
        <button
          type="button"
          onclick={() => handleAnswer(activeQuestions[currentIndex].no)}
          class="rounded-2xl border border-gray-200 bg-white px-6 py-4 text-lg font-semibold text-gray-700 shadow-sm hover:border-gray-400 hover:bg-gray-50"
        >
          No
        </button>
      </div>

      <div class="mt-8 flex items-center justify-between text-sm text-gray-500">
        <span>간단한 선택만으로 결과가 완성됩니다.</span>
        <button
          type="button"
          onclick={goPrev}
          class="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
          disabled={currentIndex === 0}
        >
          이전 질문
        </button>
      </div>
    </section>
  {:else}
    <section class="space-y-8">
      <div class="rounded-3xl bg-white/80 backdrop-blur-sm p-10 sm:p-12 shadow-lg ring-1 ring-black/5">
        <div class="flex flex-col gap-4">
          <div class="inline-flex items-center gap-2 rounded-full bg-whiskey-100 px-4 py-2 text-sm font-semibold text-whiskey-800 w-fit">
            당신의 WBTI
          </div>
          <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {resultCode}
          </h1>
          <p class="text-sm font-semibold text-whiskey-700 uppercase tracking-wide">{profile?.title ?? 'WBTI Type'}</p>
          <p class="text-lg text-gray-600">
            별명: <span class="font-semibold text-gray-900">{nickname}</span>
          </p>
          <p class="text-base text-gray-600">정식 결과명: {officialName}</p>
          {#if profile?.copy}
            <p class="text-base font-medium text-gray-800">{profile.copy}</p>
          {/if}
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        {#each result as item (item.left + item.right + item.code)}
          <div class="rounded-2xl bg-white/70 p-6 ring-1 ring-black/5">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {item.code === 'X' ? `${item.left}/${item.right}` : item.label}
            </h3>
            <p class="text-sm text-gray-600">{item.description}</p>
          </div>
        {/each}
      </div>

      {#if profile?.features?.length}
        <div class="rounded-2xl bg-white/70 p-6 ring-1 ring-black/5">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">특징</h3>
          <ul class="space-y-2 text-sm text-gray-700">
            {#each profile.features as feature (feature)}
              <li class="flex items-start gap-2">
                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-whiskey-500"></span>
                <span>{feature}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <div class="rounded-3xl bg-white/80 backdrop-blur-sm p-10 sm:p-12 shadow-lg ring-1 ring-black/5">
        <h2 class="text-2xl font-semibold text-gray-900 mb-6">추천 스타일</h2>
        <div class="space-y-3">
          {#each recommendations as rec (rec)}
            <div class="flex items-start gap-3 rounded-xl bg-whiskey-50/70 px-4 py-3">
              <span class="mt-1 h-2 w-2 rounded-full bg-whiskey-500"></span>
              <p class="text-sm text-gray-700">{rec}</p>
            </div>
          {/each}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onclick={restart}
          class="inline-flex items-center justify-center rounded-lg border border-gray-200 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50"
        >
          다시 테스트하기
        </button>
        <a
          href={resolve('/')}
          class="inline-flex items-center justify-center rounded-lg bg-whiskey-600 px-6 py-3 text-white font-semibold shadow hover:bg-whiskey-700"
        >
          메인으로 돌아가기
        </a>
      </div>
    </section>
  {/if}
</div>
