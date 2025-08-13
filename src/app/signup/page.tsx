import { AuthForm } from '@/components/auth/AuthForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SignupPage() {
   const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect('/');
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-3xl font-bold">Sign Up</h1>
        <AuthForm type="signup" />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Button variant="link" asChild className="px-1">
            <Link href="/login">Log In</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
