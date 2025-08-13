import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function Home() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8">
      <Card className="w-full max-w-lg overflow-hidden rounded-2xl shadow-xl">
        <CardHeader className="p-8 text-center">
          <CardTitle className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Welcome to Alma
          </CardTitle>
          <CardDescription className="mt-4 text-lg text-muted-foreground">
            Your journey to regenerative marketing starts here.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="aspect-video">
            <Image
              src="https://placehold.co/800x450.png"
              alt="Abstract placeholder image"
              width={800}
              height={450}
              className="h-full w-full object-cover"
              data-ai-hint="abstract lines"
              priority
            />
          </div>
        </CardContent>
      </Card>
      <div className="mt-8">
        {user ? (
          <div className="flex flex-col items-center gap-4">
            <p>Welcome, {user.email}</p>
            <LogoutButton />
          </div>
        ) : (
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
