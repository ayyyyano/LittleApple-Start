interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, unit = "", onChange }: SliderProps) {
  const id = `slider-${label.replace(/\s/g, "-")}`;
  return (
    <label className="ui-slider" htmlFor={id}>
      <span><span className="ui-control-label">{label}</span><output htmlFor={id}>{value}{unit}</output></span>
      <input id={id} type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
