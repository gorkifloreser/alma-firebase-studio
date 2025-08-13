
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { requestPasswordReset } from '@/components/auth/actions';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Toaster } from '@/components/ui/toaster';
import AuthLayout from '@/components/layout/AuthLayout';
import { Card, CardContent } from '@/components/ui/card';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await requestPasswordReset(values);
      setIsSubmitted(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'There was a problem with your request.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Toaster />
       <div className="w-full max-w-md mx-auto">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 rounded-2xl">
          <CardContent className="p-8 md:p-12">
            <div className="text-center text-foreground">
               <h1 className="mb-6 text-center text-3xl font-bold">Forgot Password</h1>
              {isSubmitted ? (
                <div className="text-center">
                  <p className="mb-4">
                    If an account with that email exists, a password reset link has
                    been sent. Please check your inbox.
                  </p>
                  <Button variant="link" asChild className="px-1 text-foreground hover:text-foreground/80">
                    <Link href="/login">Back to Log In</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-center text-sm text-foreground/80">
                    Enter your email address and we will send you a link to reset
                    your password.
                  </p>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="you@example.com" {...field} className="bg-white rounded-full text-black placeholder:text-gray-500" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full btn-auth" disabled={isLoading}>
                        {isLoading
                          ? 'Sending...'
                          : 'Send Reset Link'}
                      </Button>
                    </form>
                  </Form>
                  <p className="mt-4 text-center text-sm text-foreground/80">
                    Remember your password?{' '}
                     <Button variant="link" asChild className="px-1 text-foreground hover:text-foreground/80">
                      <Link href="/login">Log In</Link>
                    </Button>
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
       </div>
    </AuthLayout>
  );
}
