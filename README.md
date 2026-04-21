# BDI Frontend

## Getting Started

1. Install Dependencies

```bash
pnpm install
```

2. Run Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

# Tech Stack

### **Framework & Language**

- [**Next.js 15.3.3**](https://nextjs.org/blog/next-15)
- [**React 19**](https://react.dev/blog/2024/12/05/react-19)
- **TypeScript**

### Styling

- [**Tailwind CSS 4**](#tailwind-css-v40)

### UI Components

- [**shadcn**](https://ui.shadcn.com): Component library
- **Lucide React**: Icon library
- **clsx**: Utility for conditionally joining classNames

---

## Project Scripts

| Script  | Description                             |
| ------- | --------------------------------------- |
| `dev`   | Start development server with Turbopack |
| `build` | Build the app for production            |
| `start` | Start the production server             |
| `lint`  | Run ESLint checks                       |

---

## Component Folder Structure

```bash
/components
│
├── common/ # Reusable UI primitives and helpers
│ ├── Button.tsx
│ ├── Input.tsx
│ └── Modal.tsx
│
├── layout/ # Page layout components
│ ├── Header.tsx
│ ├── Footer.tsx
│ └── MainLayout.tsx
│
├── sections/ # Page-specific sections
│ ├── Home/
│ │ ├── HeroSection.tsx
│ │ ├── FeaturesSection.tsx
│ │ └── Testimonials.tsx
│ └── About/
│ ├── TeamSection.tsx
│
├── ui/ # Design system components from shadcn/ui
│ ├── card.tsx
│ ├── badge.tsx
│ └── avatar.tsx
```

---

### Tailwind CSS v.4.0

A utility-first CSS framework (Read more **[Tailwind CSS 4](https://tailwindcss.com/blog/tailwindcss-v4)**)

Tailwind CSS v4.0 changes the configuration approach from using a `tailwind.config`.js file to using a `global.css` CSS file.

Example:

```css
@import "tailwindcss";

@theme {
  --font-display: "Satoshi", "sans-serif";
  --breakpoint-3xl: 1920px;
  --color-avocado-100: oklch(0.99 0 0);
  --color-avocado-200: oklch(0.98 0.04 113.22);
  --color-avocado-300: oklch(0.94 0.11 115.03);
  --color-avocado-400: oklch(0.92 0.19 114.08);
  --color-avocado-500: oklch(0.84 0.18 117.33);
  --color-avocado-600: oklch(0.53 0.12 118.34);
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  /* ... */
}
```

---

### shadcn/ui Integration

UI component library (Read more **[ui.shadcn](https://ui.shadcn.com/)**)

All UI components from shadcn are located in the `/components/ui` directory.

```bash
/components
  └── ui
      ├── button.tsx
      ├── input.tsx
      └── ...more
```

**Adding New Components**

If you want to add a new component (e.g., Dialog, Select, Toast, etc.):

1. Go to [Component List](https://ui.shadcn.com/docs/components)
2. Select the component then run `pnpm` CLI
   ex. `pnpm dlx shadcn@latest add accordion`
3. Customize the component in `components/ui/[your-component]`

Note: [awesome-shadcn-ui](https://github.com/birobirobiro/awesome-shadcn-ui?tab=readme-ov-file) and [https://allshadcn.com/](https://allshadcn.com/) are curated list of libs and components related to shadcn/ui.
