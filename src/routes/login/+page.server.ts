import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseClient } from '$lib/server/supabase/client';
import { setSessionCookies } from '$lib/server/supabase/auth';

export const actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString();

    if (!email || !password) {
      return fail(400, {
        error: '이메일과 비밀번호를 입력해주세요.',
        values: { email: email || '' }
      });
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Supabase 에러 메시지를 더 구체적으로 표시
      let errorMessage = '로그인에 실패했습니다.';
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 필요합니다.';
      } else {
        errorMessage = error.message || '로그인에 실패했습니다.';
      }
      
      // enhance가 'failure'로 처리하도록 4xx 중에서도 400으로 통일
      return fail(400, {
        error: errorMessage,
        values: { email }
      });
    }

    if (!data.session) {
      return fail(400, {
        error: '로그인에 실패했습니다. 세션을 생성할 수 없습니다.',
        values: { email }
      });
    }

    setSessionCookies(cookies, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token
    });

    throw redirect(303, '/my-posts');
  }
};

