import Input from "../../../../components/ui/Input";
import { Search } from "lucide-react";

function Usermanagementsearchinput({
  value,
  onChange,
  placeholder = "Search Name or Username",
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

export default Usermanagementsearchinput;