import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Heart, GitBranch, Wand2, Star } from 'lucide-react';
import Link from 'next/link';
import { LandingPageNav } from '@/components/layout/LandingPageNav';

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
    return (
        <Card className="p-8">
            <div className="inline-block p-3 bg-primary/10 rounded-lg">
                <Icon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-4 text-xl font-bold">{title}</h3>
            <p className="mt-2 text-muted-foreground">{description}</p>
        </Card>
    )
}

export default function LandingPage() {
  return (
    <div className="w-full bg-background text-foreground">
      <LandingPageNav />

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center text-center p-4 overflow-hidden">
        <div className="absolute inset-0 bg-mesh-gradient opacity-50"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground/90">
            Stop Chasing. Start Attracting.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto">
            Alma is a Regenerative Marketing ecosystem for conscious creators. It uses AI as a mindful co-creator to transform your marketing from an exhausting chore into a joyful expression of your purpose.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="btn-auth text-lg py-6 px-8">
              <Link href="/signup">Start Your Journey</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg py-6 px-8 bg-transparent hover:bg-foreground/5">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-20 md:py-32 bg-secondary/50">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold">Does This Sound Familiar?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            You are a creator with a mission. You pour your heart into your work, but when it comes to marketing, you feel a deep disconnect.
          </p>
          <div className="grid md:grid-cols-3 gap-8 mt-12 text-left">
            <div className="p-6 border-l-4 border-primary">
              <h3 className="font-semibold text-xl">The Hustle is Draining</h3>
              <p className="mt-2 text-muted-foreground">The constant pressure to perform, post, and engage leaves you feeling creatively and spiritually exhausted. It feels extractive, not expressive.</p>
            </div>
            <div className="p-6 border-l-4 border-primary">
              <h3 className="font-semibold text-xl">Misaligned Tactics</h3>
              <p className="mt-2 text-muted-foreground">Aggressive sales funnels, urgency tactics, and vanity metrics feel inauthentic to you and your audience. Your marketing doesn't match your soul.</p>
            </div>
            <div className="p-6 border-l-4 border-primary">
              <h3 className="font-semibold text-xl">Content Overwhelm</h3>
              <p className="mt-2 text-muted-foreground">You know you need to be consistent, but the cycle of brainstorming, creating, and scheduling content is a constant source of stress and burnout.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Solution Section */}
      <section id="solution" className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center max-w-4xl">
            <p className="font-semibold text-primary">THE ALMA WAY</p>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Marketing as a Regenerative Practice</h2>
            <p className="mt-4 text-lg text-muted-foreground">
                Alma is not just another tool; it's a new philosophy. We help you build a marketing ecosystem that nourishes you, your audience, and your business. It's about rhythm over rush, and coherence over clicks.
            </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="pb-20 md:pb-32">
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <FeatureCard
                    icon={Heart}
                    title="1. The Brand Heart"
                    description="Anchor your marketing in your truth. Our AI deeply understands your mission, vision, and voice to generate content that is authentically you."
                />
                <FeatureCard
                    icon={GitBranch}
                    title="2. AI-Powered Strategy"
                    description="Transform your offerings into customer journeys. Generate strategic funnels and media plans with a single click, turning your expertise into magnetic invitations."
                />
                 <FeatureCard
                    icon={Wand2}
                    title="3. The AI Artisan"
                    description="Co-create content with an AI partner that understands you. From social posts to video scripts, generate drafts in seconds and refine them in your creative studio."
                />
                 <FeatureCard
                    icon={Star}
                    title="4. The Harvest Circle"
                    description="Close the loop. Automatically request testimonials from happy customers and seamlessly re-seed them into new, powerful marketing content."
                />
                 <FeatureCard
                    icon={CheckCircle2}
                    title="Holistic & Aligned"
                    description="Every feature is designed to work in harmony, creating a self-sustaining marketing cycle that saves you time and feels good."
                />
                <Card className="flex flex-col items-center justify-center text-center p-8 bg-primary/10">
                    <h3 className="text-2xl font-bold">Ready to Change How You Market?</h3>
                    <p className="mt-2 text-muted-foreground">Start your journey towards a more authentic and sustainable brand presence.</p>
                    <Button asChild className="mt-6 btn-auth">
                        <Link href="/signup">Get Started</Link>
                    </Button>
                </Card>
            </div>
        </div>
      </section>

       {/* Footer */}
      <footer className="py-12 bg-secondary/30">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
           <p>&copy; {new Date().getFullYear()} Alma AI. Marketing for the soul.</p>
        </div>
      </footer>
    </div>
  );
}
