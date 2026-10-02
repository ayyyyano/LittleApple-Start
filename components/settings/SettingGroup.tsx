export function SettingGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="setting-group">
      <div className="setting-group-heading"><h4>{title}</h4>{description && <p>{description}</p>}</div>
      <div className="setting-group-body">{children}</div>
    </section>
  );
}
