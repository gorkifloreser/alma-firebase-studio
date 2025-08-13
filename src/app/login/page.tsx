import { AuthForm } from '@/components/auth/AuthForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 text-center">
        <h1 className="mb-6 text-center text-3xl font-bold">Log In</h1>
        <AuthForm type="login" />
        <p className="mt-4 text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Button variant="link" asChild className="px-1">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
