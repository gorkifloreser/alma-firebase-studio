# Unified Project Structure

```
alma-app/
├── src/
│   ├── app/            # Next.js App Router
│   ├── components/     # Shared React components
│   ├── lib/            # Shared libraries, helpers
│   └── types/          # Shared TypeScript interfaces
├── supabase/
│   └── functions/      # Supabase Edge Functions
├── .github/
│   └── workflows/      # GitHub Actions CI/CD
└── package.json        # Project dependencies
```
