import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen bg-white">
      <div className="relative hidden min-h-screen w-[52%] overflow-hidden bg-[#eaf5f0] lg:flex">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-emerald-600/12 blur-3xl" aria-hidden />
        <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-[#ec7357]/12 blur-3xl" aria-hidden />
        <div className="relative z-10 flex min-h-screen w-full flex-col justify-between p-12 xl:p-16">
          <Image src="/duoph-logo.png" alt="Duoph" width={706} height={244} priority className="h-auto w-44" />
          <div className="max-w-xl">
            <p className="eyebrow">One team. One workspace.</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] text-emerald-950 xl:text-5xl">
              Deliver better work, without losing sight of the details.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-emerald-950/60">
              Plan tasks, serve clients, understand performance, and keep Duoph moving forward.
            </p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {["Tasks", "Clients", "Analytics"].map((item) => (
                <div key={item} className="rounded-xl border border-emerald-900/10 bg-white/60 px-4 py-3 text-xs font-medium text-emerald-950/70">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-emerald-950/45">© Duoph Technologies · Internal use only</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-[var(--color-bg-base)] p-6">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
