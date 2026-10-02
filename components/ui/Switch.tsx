import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, label, description, disabled, className }: SwitchProps) {
  return (
    <div className={cn("ui-switch-row", disabled && "is-disabled")}>
      <span>
        <span className="ui-control-label">{label}</span>
        {description && <span className="ui-control-description">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={cn("ui-switch", className)}
        onClick={() => onCheckedChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
