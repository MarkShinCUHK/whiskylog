import { fail, redirect } from '@sveltejs/kit';
import type { Session, User } from '@supabase/supabase-js';
import { createSupabaseClient, createSupabaseClientWithSession } from '$lib/server/supabase/client';
import { setSessionCookies, getUser, getSession } from '$lib/server/supabase/auth';
import { convertAnonymousPostsToUserPosts } from '$lib/server/supabase/queries/posts';

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

    // 회원가입 전에 현재 사용자가 익명 사용자인지 확인
    const currentUser = await getUser(cookies);
    const isAnonymousUser = currentUser?.isAnonymous ?? false;
    const anonymousUserId = isAnonymousUser ? currentUser?.id : null;
    const sessionTokens = getSession(cookies);
    // 회원가입 전에 익명 세션이 있었는지 확인 (나중에 만료 여부 판단용)
    const hadAnonymousSession = isAnonymousUser && !!sessionTokens;
    let convertedCount = 0;
    let sessionExpired = false;

    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    let signedUser: User | null = null;
    let session: Session | null = null;

    if (isAnonymousUser && anonymousUserId && sessionTokens) {
      // 익명 사용자인 경우: updateUser로 이메일/비밀번호 추가 (user_id 유지)
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        email,
        password,
        data: {
          nickname
        }
      });

      if (updateError) {
        // updateUser 실패 시 일반 signUp으로 폴백
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nickname
            }
          }
        });

        if (signUpError) {
          return fail(400, {
            error: signUpError.message || '회원가입에 실패했습니다.',
            values: { email, nickname }
          });
        }

        signedUser = signUpData.user ?? null;
        session = signUpData.session ?? null;

        // 새로운 사용자가 생성되었으므로 익명 글을 새 사용자 ID로 전환
        if (session && signedUser?.id) {
          setSessionCookies(cookies, {
            accessToken: session.access_token,
            refreshToken: session.refresh_token
          });

          try {
            const newSessionTokens = getSession(cookies);
            if (newSessionTokens) {
              // 새 세션으로 사용자 정보 가져오기 (세션 유효성 확인)
              const supabaseWithNewSession = createSupabaseClientWithSession(newSessionTokens);
              const { error: userError } = await supabaseWithNewSession.auth.getUser(newSessionTokens.accessToken);
              
              if (userError) {
                // 세션이 유효하지 않음 (만료됨)
                sessionExpired = true;
                console.error('세션 만료 또는 유효하지 않음:', userError);
              } else {
                // 세션이 유효함, 익명 글 전환 시도
                convertedCount = await convertAnonymousPostsToUserPosts(
                  anonymousUserId,
                  signedUser.id,
                  newSessionTokens
                );
              }
            } else {
              // 세션 토큰이 없음 (이전에 세션이 있었는데 사라짐 = 만료)
              if (hadAnonymousSession) {
                sessionExpired = true;
              }
            }
          } catch (err) {
            console.error('익명 글 전환 오류:', err);
            // 에러 발생 시 세션이 만료되었을 가능성이 높음
            if (hadAnonymousSession) {
              sessionExpired = true;
            }
          }
        }
      } else {
        // updateUser 성공: user_id 유지, 익명 글을 회원 글로 전환
        signedUser = updateData.user ?? null;
        session = (updateData as { session?: Session | null }).session ?? null;

        // 세션 갱신
        if (session) {
          setSessionCookies(cookies, {
            accessToken: session.access_token,
            refreshToken: session.refresh_token
          });

          // 익명 글을 회원 글로 전환 (user_id는 동일하므로 is_anonymous만 변경)
          try {
            const newSessionTokens = getSession(cookies);
            if (newSessionTokens) {
              // 새 세션으로 사용자 정보 가져오기 (세션 유효성 확인)
              const supabaseWithNewSession = createSupabaseClientWithSession(newSessionTokens);
              const { error: userError } = await supabaseWithNewSession.auth.getUser(newSessionTokens.accessToken);
              
              if (userError) {
                // 세션이 유효하지 않음 (만료됨)
                sessionExpired = true;
                console.error('세션 만료 또는 유효하지 않음:', userError);
              } else {
                // 세션이 유효함, 익명 글 전환 시도
                convertedCount = await convertAnonymousPostsToUserPosts(
                  anonymousUserId,
                  anonymousUserId,
                  newSessionTokens
                );
              }
            } else {
              // 세션 토큰이 없음 (이전에 세션이 있었는데 사라짐 = 만료)
              if (hadAnonymousSession) {
                sessionExpired = true;
              }
            }
          } catch (err) {
            console.error('익명 글 전환 오류:', err);
            // 에러 발생 시 세션이 만료되었을 가능성이 높음
            if (hadAnonymousSession) {
              sessionExpired = true;
            }
          }
        }
      }
    } else {
      // 일반 회원가입 (익명 사용자가 아닌 경우)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname
          }
        }
      });

      if (signUpError) {
        return fail(400, {
          error: signUpError.message || '회원가입에 실패했습니다.',
          values: { email, nickname }
        });
      }

      signedUser = signUpData.user ?? null;
      session = signUpData.session ?? null;
    }

    // 회원가입 완료 후 로그인 페이지로 리다이렉트 (성공 메시지 표시)
    let successMessage = '회원가입이 완료되었습니다.';
    
    // 프로젝트 설정에 따라 session이 없을 수 있음(이메일 확인 필요 시)
    if (!session) {
      successMessage += ' 이메일 인증을 완료한 뒤 로그인해주세요.';
    }
    
    // 익명 사용자였던 경우 익명 글 전환 정보 추가
    if (isAnonymousUser) {
      if (convertedCount > 0) {
        successMessage += ` 익명으로 작성한 ${convertedCount}개의 글이 본인 글로 옮겨졌습니다.`;
        if (sessionExpired) {
          successMessage += ' (오래된 세션으로 인해 일부 글은 업데이트되지 않았을 수 있습니다. 필요시 다시 로그인해주세요.)';
        }
      } else if (sessionExpired) {
        successMessage += ' 다만 오래된 세션으로 인해 익명으로 작성한 일부 글은 업데이트되지 않았을 수 있습니다. 필요시 다시 로그인해주세요.';
      } else {
        successMessage += ' 익명으로 작성한 글이 본인 글로 옮겨졌습니다.';
      }
    }
    
    // 세션이 있으면 세션 쿠키 설정
    if (session) {
      if (!isAnonymousUser || !sessionTokens) {
        // 일반 회원가입인 경우에만 세션 쿠키 설정 (익명 업그레이드는 이미 설정됨)
        setSessionCookies(cookies, {
          accessToken: session.access_token,
          refreshToken: session.refresh_token
        });
      }
    }
    
    throw redirect(303, `/login?success=${encodeURIComponent(successMessage)}`);
  }
};
