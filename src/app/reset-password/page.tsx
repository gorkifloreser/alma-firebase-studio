'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import AuthLayout from '@/components/layout/AuthLayout';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';

const NewPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'], // path to show the error
  });

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setHasSession(true);
      }
    });
    
    // Check for initial session in case the event was missed
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setHasSession(true);
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const form = useForm<z.infer<typeof NewPasswordSchema>>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handlePasswordReset = async (values: z.infer<typeof NewPasswordSchema>) => {
    setIsLoading(true);

    if (!hasSession) {
      toast({
        title: 'Error updating password',
        description: 'No active session. Please use the link from your email.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast({
        title: 'Error updating password',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success!',
        description: 'Your password has been updated successfully.',
      });
      router.push('/login');
    }
    setIsLoading(false);
  };

  return (
    <AuthLayout>
      <Toaster />
      <div className="w-full max-w-md mx-auto">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 rounded-2xl">
          <CardContent className="p-8 md:p-12">
            <div className="text-center text-foreground">
              <h1 className="mb-6 text-center text-3xl font-bold">Set New Password</h1>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handlePasswordReset)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                             className="bg-white rounded-full text-black placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                             className="bg-white rounded-full text-black placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full btn-auth" disabled={isLoading || !hasSession}>
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                   {!hasSession && <p className="text-xs text-destructive mt-2">Waiting for session... Please click the link in your email.</p>}
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
