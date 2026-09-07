import { Converter } from "@/components/Converter";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="safe-x safe-b mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col py-6 sm:py-10 lg:max-w-4xl lg:py-14">
      <header className="mb-6 flex items-start justify-between gap-3 sm:mb-8 sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl lg:text-3xl">
            Transeslator
          </h1>
          <p className="mt-1.5 max-w-prose text-[0.8125rem] leading-relaxed text-muted sm:mt-2 sm:text-sm lg:text-base">
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
