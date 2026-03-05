"use client";

interface LayerTogglesProps {
  floodEnabled: boolean;
  mpzpEnabled: boolean;
  onFloodToggle: () => void;
  onMpzpToggle: () => void;
}

export function LayerToggles({
  floodEnabled,
  mpzpEnabled,
  onFloodToggle,
  onMpzpToggle,
}: LayerTogglesProps) {
  return (
    <div className="absolute bottom-6 left-4 z-20 flex flex-col gap-2">
      <ToggleButton
        label="Strefy zalewowe"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        }
        enabled={floodEnabled}
        onClick={onFloodToggle}
        color="blue"
      />
      <ToggleButton
        label="MPZP"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
        }
        enabled={mpzpEnabled}
        onClick={onMpzpToggle}
        color="purple"
      />
    </div>
  );
}

function ToggleButton({
  label,
  icon,
  enabled,
  onClick,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  onClick: () => void;
  color: "blue" | "purple";
}) {
  const colors = {
    blue: {
      active: "bg-blue-500 text-white shadow-blue-200",
      inactive: "bg-white text-gray-600 hover:bg-gray-50",
    },
    purple: {
      active: "bg-purple-500 text-white shadow-purple-200",
      inactive: "bg-white text-gray-600 hover:bg-gray-50",
    },
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-sm font-medium transition-colors ${
        enabled ? colors[color].active : colors[color].inactive
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
