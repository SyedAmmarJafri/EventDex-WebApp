import React, { useEffect } from 'react'

const TableSearch = ({ table, setGlobalFilter, globalFilter }) => {
    // Retrieve the page size from local storage on component mount
    useEffect(() => {
        const savedPageSize = localStorage.getItem('tablePageSize');
        if (savedPageSize) {
            table.setPageSize(Number(savedPageSize));
        }
    }, [table]);

    const handlePageSizeChange = (e) => {
        const newPageSize = Number(e.target.value);
        table.setPageSize(newPageSize);
        // Save the selected page size to local storage
        localStorage.setItem('tablePageSize', newPageSize.toString());
    };

    return (
        <div className='row gy-2'>
            <div className='col-sm-12 col-md-6 ps-0 m-0 pb-10'>
                <div className='dataTables_length d-flex justify-content-md-start justify-content-center'>
                    <label className='d-flex align-items-center gap-1'>
                        <select
                            className='form-select form-select-sm w-auto pe-4'
                            value={table.getState().pagination.pageSize}
                            onChange={handlePageSizeChange}
                        >
                            {[10, 20, 30, 40, 50, 100].map(pageSize => (
                                <option key={pageSize} value={pageSize}>
                                    {pageSize}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>
            <div className='col-sm-12 col-md-6 ps-0 m-0 pb-10'>
                <div className='dataTables_filter d-flex justify-content-md-end justify-content-center'>
                    <label className='d-inline-flex align-items-center gap-2'>
                        <input
                            type="text"
                            value={globalFilter ?? ""}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder='Search...'
                            className="form-control form-control-sm"
                        />
                    </label>
                </div>
            </div>
        </div>
    )
}

export default TableSearch