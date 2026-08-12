// features/admin/Sectionlevel/Components/Sectionlevelsearchinput.jsx
//
// Same pattern as Usermanagementsearchinput.jsx - reuses the shared
// <Input> component instead of a raw <input>, so this field picks up
// the same border, focus, and icon-spacing styling as every other
// search box in the app for free.

import Input from "../../../../components/ui/Input";
import { Search } from "lucide-react";

function Sectionlevelsearchinput({
  value,
  onChange,
  placeholder = "Search section or adviser",
  className = "",
}) {
  return (
    <Input
      icon={<Search size={18} />}
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`h-10 w-full sm:w-64 md:w-72 ${className}`}
    />
  );
}

export default Sectionlevelsearchinput;