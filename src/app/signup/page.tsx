import { AuthForm } from '@/components/auth/AuthForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AuthLayout from '@/components/layout/AuthLayout';
import { Card, CardContent } from '@/components/ui/card';

export default async function SignupPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect('/');
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-4xl mx-auto">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 rounded-2xl">
          <CardContent className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
              <div className="text-foreground text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Join Us
                </h1>
                <p className="mt-4 text-foreground/80">
                  Create an account to start your journey. It's quick and easy!
                </p>
                 <Button variant="outline" className="mt-6 bg-transparent text-foreground border-foreground/50 hover:bg-foreground/10 hover:text-foreground">
                  Learn More
                </Button>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-center text-white">Sign Up</h2>
                <div className="mt-6">
                  <AuthForm type="signup" />
                </div>
                <div className="mt-4 text-center text-sm text-white/80">
                   <p>
                    Already have an account?{' '}
                    <Button variant="link" asChild className="px-1 text-white hover:text-white/80">
                      <Link href="/login">Log In</Link>
                    </Button>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-white/60 mt-8">Welcome to our site</p>
      </div>
    </AuthLayout>
  );
}
