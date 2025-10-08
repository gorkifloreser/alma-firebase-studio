
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
  Circle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Step = {
  name: string;
  href: string;
  icon: React.ElementType;
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
    { name: 'Brand Heart', href: '/brand', icon: Heart, isComplete: completionStatus.brandHeart },
    { name: 'Offerings', href: '/offerings', icon: ShoppingBag, isComplete: completionStatus.offerings },
    { name: 'Funnels', href: '/funnels', icon: GitBranch, isComplete: completionStatus.funnels },
    { name: 'Media Plan', href: '/funnels', icon: FileText, isComplete: completionStatus.mediaPlan }, // Links to funnels where plans are made
    { name: 'AI Artisan', href: '/artisan', icon: Wand2, isComplete: completionStatus.aiArtisan },
    { name: 'Calendar', href: '/calendar', icon: Calendar, isComplete: completionStatus.calendar },
    { name: 'Harvest Circle', href: '/harvest-circle', icon: Star, isComplete: completionStatus.harvestCircle },
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
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
                    {steps.map((step, index) => (
                        <Link href={step.href} key={step.name} className="group flex flex-col items-center gap-2">
                           <div className="relative">
                               <div className={cn(
                                   "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                   step.isComplete ? "bg-green-500/20 border-green-500 text-green-500" : "bg-muted border-dashed text-muted-foreground"
                               )}>
                                   <step.icon className="h-7 w-7" />
                               </div>
                                {index < steps.length - 1 && (
                                     <div className="absolute top-1/2 left-full w-4 h-px bg-border hidden lg:block"></div>
                                )}
                           </div>
                           <p className={cn(
                               "font-semibold text-sm mt-2 transition-colors",
                               step.isComplete ? "text-foreground" : "text-muted-foreground",
                               "group-hover:text-primary"
                           )}>
                               {step.name}
                            </p>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
