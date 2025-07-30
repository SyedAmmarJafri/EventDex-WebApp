import React from 'react'
import { FaWhatsapp } from 'react-icons/fa'

const SearchModal = () => {
  return (
    <div className="nxl-h-item nxl-header-search">
      <a 
        href="https://api.whatsapp.com/send?phone=923400205187" 
        target="_blank" 
        rel="noopener noreferrer"
        className="nxl-head-link me-0"
      >
        <FaWhatsapp size={20} />
      </a>
    </div>
  )
}

export default SearchModal