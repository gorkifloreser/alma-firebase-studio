
// This page is now deprecated and its content is rendered via src/app/brand/page.tsx
// We will redirect to the new brand page.

import { redirect } from 'next/navigation';

export default function AccountsPage() {
    redirect('/brand');
}
