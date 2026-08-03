import Input from "../../../../components/ui/Input";
import { Search } from "lucide-react";

function SearchInput({
  value,
  onChange,
  placeholder = "Search Student ",
  className = "",
}) {
  return (
    <Input
      icon={<Search size={18} />}
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`h-10 w-full sm:w-72 ${className}`}
    />
  );
}

export default SearchInput;