import React from "react";
import { Search } from "lucide-react";
import Input from "../../../../components/ui/Input";

function SearchInput({ value, onChange }) {
  return (
    <Input
      id="enrollment-search"
      name="search"
      type="text"
      icon={<Search size={18} />}
      placeholder="Search LRN or Name"
      value={value}
      onChange={onChange}
      className="w-full sm:w-72"
    />
  );
}

export default SearchInput;