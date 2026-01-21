import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseClient } from '$lib/server/supabase/client';
import { setSessionCookies } from '$lib/server/supabase/auth';

export const actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString().trim();
    const nickname = formData.get('nickname')?.toString().trim();
    const password = formData.get('password')?.toString();
    const passwordConfirm = formData.get('passwordConfirm')?.toString();

    if (!email || !nickname || !password || !passwordConfirm) {
      return fail(400, {
        error: '이메일, 닉네임, 비밀번호를 입력해주세요.',
        values: { email: email || '', nickname: nickname || '' }
      });
    }

    if (nickname.length < 2 || nickname.length > 20) {
      return fail(400, {
        error: '닉네임은 2~20자로 입력해주세요.',
        values: { email, nickname }
      });
    }

    if (password !== passwordConfirm) {
      return fail(400, {
        error: '비밀번호 확인이 일치하지 않습니다.',
        values: { email, nickname }
      });
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname
        }
      }
    });

    if (error) {
      return fail(400, {
        error: error.message || '회원가입에 실패했습니다.',
        values: { email, nickname }
      });
    }

    // 프로젝트 설정에 따라 session이 없을 수 있음(이메일 확인 필요 시).
    // MVP에서는 session이 있으면 즉시 로그인 처리, 없으면 로그인 페이지로 이동.
    if (data.session) {
      setSessionCookies(cookies, {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      });
      throw redirect(303, '/my-posts');
    }

    // 이메일 인증이 필요한 경우: 로그인 페이지로 이동하면서 안내 메시지 표시
    throw redirect(
      303,
      '/login?success=회원가입이 완료되었습니다. 이메일 인증을 완료한 뒤 로그인해주세요.'
    );
  }
};

