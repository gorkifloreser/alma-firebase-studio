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
});

export async function login(formData: z.infer<typeof loginSchema>) {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword(formData);

  if (error) {
    console.error('Login error:', error.message);
    throw new Error('Could not authenticate user. Please check your credentials.');
  }

  return redirect('/');
}

export async function signup(formData: z.infer<typeof signupSchema>) {
  const origin = headers().get('origin');
  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Signup error:', error.message);
    if (error.message.includes('User already registered')) {
        return { error: 'A user with this email already exists.' };
    }
    return { error: 'Could not sign up user. Please try again later.' };
  }

  // On successful sign-up, Supabase sends a confirmation email.
  // The user will be redirected after clicking the link in the email.
  return { message: 'Confirmation link sent.' };
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return redirect('/login');
}
