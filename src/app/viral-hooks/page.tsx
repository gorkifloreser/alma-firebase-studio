
// This is a placeholder file.
// The actual UI is now rendered inside `src/app/funnels/_components/FunnelsClientPage.tsx`
// as a tab. This file could be used for a standalone page in the future if needed.

import { redirect } from "next/navigation";

export default function ViralHooksPage() {
    // Redirect to the funnels page where the manager is now located
    redirect('/funnels');
}
