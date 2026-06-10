import { useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: { label: string; lat: number | null; lng: number | null }) => void;
  placeholder?: string;
  id?: string;
}

export default function PlacesAutocomplete({ value, onChange, onPlaceSelect, placeholder, id }: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!inputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "il" },
      fields: ["formatted_address", "name", "geometry"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const val = place.formatted_address || place.name || "";
      const loc = place.geometry?.location;
      setInputValue(val);
      onChange(val);
      onPlaceSelect?.({ label: val, lat: loc ? loc.lat() : null, lng: loc ? loc.lng() : null });
    });

    autocompleteRef.current = autocomplete;
  }, [onChange, onPlaceSelect]);

  return (
    <Input
      ref={inputRef}
      id={id}
      placeholder={placeholder}
      value={inputValue}
      onChange={(e) => {
        setInputValue(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}
