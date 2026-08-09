import Input from "../../../../components/ui/Input";
import { Search } from "lucide-react";

function Sectionlevelsearchinput({ value, onChange, placeholder = "Search Section or Level", className = "" }) {
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