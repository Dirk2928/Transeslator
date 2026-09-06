import { Converter } from "@/components/Converter";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Transeslator
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted sm:text-base">
            Convert PDF, DOCX, PPTX, and images to clean plain text. Files are processed
            on the server and never stored.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Converter />

    </main>
  );
}
