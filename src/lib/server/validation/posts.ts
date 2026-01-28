export function plainTextFromHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseTags(value: string): string[] {
  return (value || '')
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter((tag) => tag.length > 0);
}

type ValidationContext = {
  isLoggedIn: boolean;
  isAnonymousPost: boolean;
  editPassword?: string | null;
  editPasswordConfirm?: string | null;
  requirePasswordConfirm?: boolean;
};

type TastingInput = {
  color?: number | null;
  nose?: number | null;
  palate?: number | null;
  finish?: number | null;
};

export function validatePostInput(input: { title?: string | null; content?: string | null }, ctx: ValidationContext) {
  const fieldErrors: Record<string, string> = {};
  const requirePasswordConfirm = ctx.requirePasswordConfirm ?? true;

  const title = input.title ?? '';
  const content = input.content ?? '';

  if (!title || title.trim().length === 0) {
    fieldErrors.title = '제목을 입력해주세요.';
  }

  if (!content || plainTextFromHtml(content).length === 0) {
    fieldErrors.content = '내용을 입력해주세요.';
  }

  if (!ctx.isLoggedIn) {
    const editPassword = ctx.editPassword ?? '';
    const editPasswordConfirm = ctx.editPasswordConfirm ?? '';

    if (!editPassword || editPassword.length < 4) {
      fieldErrors.editPassword = '비밀번호는 4자 이상으로 입력해주세요.';
    }

    if (requirePasswordConfirm) {
      if (!editPasswordConfirm) {
        fieldErrors.editPasswordConfirm = '비밀번호 확인을 입력해주세요.';
      } else if (editPassword && editPassword !== editPasswordConfirm) {
        fieldErrors.editPasswordConfirm = '비밀번호 확인이 일치하지 않습니다.';
      }
    }
  }

  if (ctx.isAnonymousPost && ctx.isLoggedIn) {
    fieldErrors.editPassword = '익명 게시글은 로그아웃 상태에서 비밀번호로만 수정할 수 있습니다.';
  }

  return {
    fieldErrors,
    hasErrors: Object.keys(fieldErrors).length > 0
  };
}

function isHalfStep(value: number) {
  const scaled = value * 2;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

export function validateTastingInput(input: TastingInput) {
  const fieldErrors: Record<string, string> = {};

  const color = input.color;
  if (color === null || color === undefined || Number.isNaN(color)) {
    fieldErrors.color = '컬러 값을 입력해주세요.';
  } else if (color < 0 || color > 1) {
    fieldErrors.color = '컬러 값은 0.00 ~ 1.00 사이여야 합니다.';
  }

  const ratings: Array<[keyof TastingInput, string]> = [
    ['nose', '노즈'],
    ['palate', '팔레트'],
    ['finish', '피니시']
  ];

  for (const [key, label] of ratings) {
    const value = input[key];
    if (value === null || value === undefined || Number.isNaN(value)) {
      fieldErrors[key] = `${label} 별점을 입력해주세요.`;
      continue;
    }
    if (value < 0 || value > 5 || !isHalfStep(value)) {
      fieldErrors[key] = `${label} 별점은 0 ~ 5 사이 0.5 단위로 입력해주세요.`;
    }
  }

  return {
    fieldErrors,
    hasErrors: Object.keys(fieldErrors).length > 0
  };
}
