
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
import { resetPassword } from '@/components/auth/actions';
import { useState, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Toaster } from '@/components/ui/toaster';

const formSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    if (!code) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No reset code provided. Please request a new link.',
        });
        setIsLoading(false);
        return;
    }

    try {
      await resetPassword({ password: values.password, code });
      toast({
        title: 'Success!',
        description: 'Your password has been reset. You can now log in.',
      });
      router.push('/login');
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
    <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-3xl font-bold">Reset Password</h1>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                    <div className="relative">
                        <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...field}
                        />
                        <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                        </Button>
                    </div>
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
                    <div className="relative">
                        <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...field}
                        />
                        <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                        }
                        >
                        {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                        </Button>
                    </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
            </form>
        </Form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Button variant="link" asChild className="px-1">
                <Link href="/login">Log In</Link>
            </Button>
        </p>
    </div>
  );
}


export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Toaster />
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <ResetPasswordForm />
            </div>
        </Suspense>
    )
}
