
import { Search } from "lucide-react";

function Sectionlevelsearchinput({ value, onChange, placeholder = "Search" }) {
  return (
    <div className="relative">
      <Search
        size={14}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-base font-normal text-gray-700 shadow-sm outline-none transition-colors focus:border-primary sm:h-9 sm:text-sm"
      />
    </div>
  );
}

export default Sectionlevelsearchinput;