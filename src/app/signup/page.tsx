import { AuthForm } from '@/components/auth/AuthForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 text-center">
        <h1 className="mb-6 text-center text-3xl font-bold">Sign Up</h1>
        <AuthForm type="signup" />
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Button variant="link" asChild className="px-1">
            <Link href="/login">Log In</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
