export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="ui-tooltip">
      {children}
      <span role="tooltip">{label}</span>
    </span>
  );
}
