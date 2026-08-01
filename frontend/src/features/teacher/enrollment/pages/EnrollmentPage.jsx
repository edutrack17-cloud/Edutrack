import React from "react";
import Button from "../../../../components/ui/Button";

function EnrollmentPage() {
  function handleAddStudent() {
    console.log("Add student clicked");
  }

  return (
    <div className="flex flex-col gap-6 p-3 bg-white ">

      <div className=" flex justify-end gap-5">
        <div className="rounded-lg  w-100 shadow-md">        
      </div>
        <div className="w-full sm:w-auto">
          <Button type="button" onClick={handleAddStudent} className="w-auto  bg-primary text-white hover:bg-sky-700">
            Add Student
          </Button>
        </div>

       </div>

  
      <div className="rounded-lg bg-primary p-3 text-center shadow-md">
        <p className="text-sm text-white">Pagination placeholder</p>
      </div>
    </div>
  );
}

export default EnrollmentPage;