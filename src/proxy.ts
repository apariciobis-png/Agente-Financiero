import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresca la sesión de Supabase en cada petición al panel y bloquea el
 * acceso sin sesión. En Next.js 16 esto ya no se llama `middleware.ts` —
 * ver "Trampas conocidas del stack" en docs/architecture.md.
 *
 * Solo corre sobre /panel/*: el resto del sitio (landing, entrevista, plan)
 * es público y no necesita sesión.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esRutaPublicaDelPanel =
    pathname.startsWith('/panel/login') || pathname.startsWith('/panel/auth');

  if (!user && !esRutaPublicaDelPanel) {
    const url = request.nextUrl.clone();
    url.pathname = '/panel/login';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/panel/:path*'],
};
