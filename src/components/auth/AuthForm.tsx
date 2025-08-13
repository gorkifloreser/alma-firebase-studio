
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { login, signup } from './actions';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '../ui/toaster';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, User, Lock, Key } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

const signupFormSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const loginFormSchema = z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
    remember: z.boolean().default(false),
});

type AuthFormProps = {
  type: 'login' | 'signup';
};

export function AuthForm({ type }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const formSchema = type === 'signup' ? signupFormSchema : loginFormSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      ...(type === 'login' && { remember: false }),
      ...(type === 'signup' && { confirmPassword: '' }),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      if (type === 'login') {
        await login(values as z.infer<typeof loginFormSchema>);
        router.push('/');
      } else {
        const result = await signup(values as z.infer<typeof signupFormSchema>);
        if (result?.error) {
            throw new Error(result.error);
        }
        router.push('/login?message=Check your email to continue sign in process');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "There was a problem with your request.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Toaster />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input placeholder="Username" {...field} className="bg-white rounded-full pl-10 text-black placeholder:text-gray-500"/>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      {...field}
                      className="bg-white rounded-full pl-10 text-black placeholder:text-gray-500"
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
          {type === 'signup' && (
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                       <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm Password"
                        {...field}
                         className="bg-white rounded-full pl-10 text-black placeholder:text-gray-500"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
          )}

          {type === 'login' && (
             <div className="flex items-center justify-between">
                <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <Label
                        htmlFor="remember"
                        className="text-sm font-medium text-foreground/80"
                        >
                        Keep me signed in
                        </Label>
                    </div>
                    </FormItem>
                )}
                />
                <Button variant="link" asChild className="px-1 text-xs text-foreground/80 hover:text-foreground/60">
                    <Link href="/forgot-password">Forgot password?</Link>
                </Button>
            </div>
          )}

          <Button type="submit" className="w-full btn-auth" disabled={isLoading}>
            {isLoading ? 'Processing...' : (type === 'login' ? 'Log In' : 'Sign Up')}
          </Button>
        </form>
      </Form>
    </>
  );
}
