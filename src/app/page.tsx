
import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Heart,
  ShoppingBag,
  GitBranch,
  Wand2,
  Calendar,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';


type Step = {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
  isComplete: boolean;
};

async function getCompletionStatus(userId: string) {
    const supabase = createClient();
    
    const { data: brandHeart, error: brandHeartError } = await supabase.from('brand_hearts').select('id').eq('user_id', userId).maybeSingle();
    const { data: offering, error: offeringError } = await supabase.from('offerings').select('id').eq('user_id', userId).limit(1).maybeSingle();
    const { data: funnel, error: funnelError } = await supabase.from('funnels').select('id').eq('user_id', userId).limit(1).maybeSingle();
    const { data: mediaPlan, error: mediaPlanError } = await supabase.from('media_plans').select('id').eq('user_id', userId).limit(1).maybeSingle();
    const { data: artisanItem, error: artisanError } = await supabase.from('media_plan_items').select('id').eq('user_id', userId).in('status', ['ready_for_review', 'scheduled', 'published']).limit(1).maybeSingle();
    const { data: calendarItem, error: calendarError } = await supabase.from('media_plan_items').select('id').eq('user_id', userId).eq('status', 'scheduled').limit(1).maybeSingle();
    const { data: testimonial, error: testimonialError } = await supabase.from('testimonials').select('id').eq('user_id', userId).limit(1).maybeSingle();

    return {
        brandHeart: !!brandHeart,
        offerings: !!offering,
        funnels: !!funnel,
        mediaPlan: !!mediaPlan,
        aiArtisan: !!artisanItem,
        calendar: !!calendarItem,
        harvestCircle: !!testimonial,
    };
}


export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const completionStatus = await getCompletionStatus(user.id);
  
  const steps: Step[] = [
    { name: 'Brand Heart', href: '/brand', icon: Heart, description: "Define your brand's soul to guide the AI.", isComplete: completionStatus.brandHeart },
    { name: 'Offerings', href: '/offerings', icon: ShoppingBag, description: 'Create the products and services you offer.', isComplete: completionStatus.offerings },
    { name: 'AI Strategist', href: '/funnels', icon: GitBranch, description: 'Generate a strategic plan for an offering.', isComplete: completionStatus.funnels },
    { name: 'AI Artisan', href: '/artisan', icon: Wand2, description: "Create and personalize content for your campaigns.", isComplete: completionStatus.aiArtisan },
    { name: 'AI Scheduler', href: '/calendar', icon: Calendar, description: 'Organize and visualize your content calendar.', isComplete: completionStatus.calendar },
    { name: 'Harvest Circle', href: '/harvest-circle', icon: Star, description: 'Harvest testimonials and reuse them as content.', isComplete: completionStatus.harvestCircle },
  ];

  const completedSteps = steps.filter(step => step.isComplete).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <header>
            <h1 className="text-3xl font-bold">Welcome to your Alma, {user.email?.split('@')[0]}</h1>
            <p className="text-muted-foreground">Let's continue creating magic together. Here's your regenerative cycle.</p>
        </header>

        <Card className="rounded-2xl shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Your Regenerative Cycle</CardTitle>
                 <p className="text-sm text-muted-foreground pt-1">Complete each step to bring your marketing to life, from soul to social proof.</p>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-6">
                    <Progress value={progressPercentage} className="h-3" />
                    <span className="font-semibold text-primary">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="space-y-2">
                    {steps.map((step, index) => (
                       <React.Fragment key={step.name}>
                        <div className="flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                                step.isComplete ? "bg-green-500/20 border-green-500 text-green-500" : "bg-muted border-dashed text-muted-foreground"
                            )}>
                               {step.isComplete ? <CheckCircle2 className="h-6 w-6" /> : <span className="font-bold text-lg">{index + 1}</span>}
                            </div>
                            <div className="flex-1">
                               <p className="font-semibold text-foreground">{step.name}</p>
                               <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                            <Button asChild variant={step.isComplete ? "secondary" : "default"}>
                                <Link href={step.href}>
                                  {step.isComplete ? 'View & Edit' : 'Start'}
                                </Link>
                            </Button>
                        </div>
                         {index < steps.length - 1 && <Separator />}
                       </React.Fragment>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
