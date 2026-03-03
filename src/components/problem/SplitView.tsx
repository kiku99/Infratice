export default function SplitView({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      {/* left pane */}
      <div className="border-b border-slate-200 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-1/2 lg:border-b-0 lg:border-r dark:border-slate-800">
        {left}
      </div>
      {/* right pane */}
      <div className="flex flex-col lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-1/2">{right}</div>
    </div>
  );
}
