import { AuthForm } from '@/components/auth/AuthForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { message: string };
}) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-3xl font-bold">Log In</h1>
        {searchParams.message && (
          <p className="mb-4 rounded-md bg-green-500/10 p-4 text-center text-sm text-green-600">
            {searchParams.message}
          </p>
        )}
        <AuthForm type="login" />
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account?{' '}
            <Button variant="link" asChild className="px-1">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </p>
          <p>
            <Button variant="link" asChild className="px-1 text-xs">
              <Link href="/forgot-password">Forgot your password?</Link>
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
