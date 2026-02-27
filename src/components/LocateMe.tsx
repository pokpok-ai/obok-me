"use client";

interface LocateMeProps {
  onLocate: (position: { lat: number; lng: number }) => void;
}

export function LocateMe({ onLocate }: LocateMeProps) {
  const handleClick = () => {
    if (!navigator.geolocation) {
      alert("Geolokalizacja nie jest wspierana");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        onLocate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert("Nie udalo sie uzyskac lokalizacji"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={handleClick}
      className="absolute bottom-8 right-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors group"
      title="Pokaz obok mnie"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    </button>
  );
}
