interface StatusMessageProps {
  type: "loading" | "empty" | "success" | "error" | "info";
  children: React.ReactNode;
}

const styles = {
  loading: "border-slate-200 bg-white text-steel",
  empty: "border-slate-200 bg-white text-steel",
  success: "border-teal-200 bg-teal-50 text-teal-900",
  error: "border-rose-200 bg-rose-50 text-rosewood",
  info: "border-slate-200 bg-mist text-ink",
};

export function StatusMessage({ type, children }: StatusMessageProps) {
  return <div className={`rounded-md border px-4 py-3 text-sm ${styles[type]}`}>{children}</div>;
}
