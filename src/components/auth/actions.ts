'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const requestPasswordResetSchema = z.object({
    email: z.string().email(),
});

const resetPasswordSchema = z.object({
    password: z.string().min(6),
    code: z.string(),
});

export async function login(formData: z.infer<typeof loginSchema>) {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword(formData);

  if (error) {
    console.error('Login error:', error.message);
    throw new Error(error.message);
  }

  return redirect('/');
}

export async function signup(formData: z.infer<typeof signupSchema>) {
  const origin = headers().get('origin');
  const supabase = createClient();

  const validatedData = signupSchema.safeParse(formData);
  if (!validatedData.success) {
    throw new Error('Invalid data provided.');
  }

  const { error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Signup error:', error.message);
    throw new Error(error.message);
  }

  return { message: 'Confirmation link sent.' };
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return redirect('/login');
}

export async function requestPasswordReset(formData: z.infer<typeof requestPasswordResetSchema>) {
    const origin = headers().get('origin');
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${origin}/reset-password`,
    });

    if (error) {
        console.error('Password reset request error:', error.message);
        throw new Error(error.message);
    }

    return { message: 'Password reset link sent.' };
}

export async function resetPassword(formData: z.infer<typeof resetPasswordSchema>) {
    const supabase = createClient();
    
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(formData.code);

    if (sessionError) {
        console.error('Session exchange error:', sessionError.message);
        throw new Error('The password reset link is invalid or has expired.');
    }

    const { error } = await supabase.auth.updateUser({
        password: formData.password,
    });

    if (error) {
        console.error('Password reset error:', error.message);
        throw new Error(error.message);
    }
    
    await supabase.auth.signOut();

    return { message: 'Password has been reset successfully.' };
}
