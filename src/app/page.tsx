import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-8">
      <Card className="w-full max-w-lg overflow-hidden rounded-2xl shadow-xl">
        <CardHeader className="p-8 text-center">
          <CardTitle className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Welcome to SampleStart
          </CardTitle>
          <CardDescription className="mt-4 text-lg text-muted-foreground">
            Your clean and minimalist starting point.
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
    </main>
  );
}
