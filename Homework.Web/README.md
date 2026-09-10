This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## UI components

The project uses [shadcn/ui](https://ui.shadcn.com/docs) with Base UI, the
`base-nova` style, and a neutral theme. Configuration is in `components.json`,
and editable component source lives in `components/ui/`.

Setup commands used (already applied):

```bash
npx --yes shadcn@latest init --base base --defaults --yes
npx --yes shadcn@latest add button card input label dialog --yes
npm install next-themes
```

The CLI used for this setup was shadcn 4.21.0. The application lockfile records
the installed dependency versions.

Button, Card, Input, Label, and Dialog are available. Import them directly:

```tsx
import { Button } from "@/components/ui/button";

export function SubmitButton() {
  return <Button type="submit">Save</Button>;
}
```

For links styled as buttons, use `buttonVariants` on an anchor or Next.js `Link`
to preserve link semantics; see `app/page.tsx`. Base UI composition uses `render`
where needed instead of Radix's `asChild`.

Theme tokens are in `app/globals.css`. The theme provider in `app/layout.tsx`
follows the system color scheme and applies shadcn's `.dark` class. The existing
Geist fonts are retained. Pages and layouts remain Server Components; put state
and event handlers in Client Components.

Add more components as needed:

```bash
npx --yes shadcn@latest add select --yes
```

Validate changes:

```bash
npm run lint
npm run build
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
