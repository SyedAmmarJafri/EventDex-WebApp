import { FiHelpCircle } from 'react-icons/fi'

const SearchModal = () => {
  return (
    <div className="nxl-h-item nxl-header-search d-flex align-items-center gap-3">
      {/* WhatsApp Support */}
      <a 
        href="https://api.whatsapp.com/send?phone=923400205187" 
        target="_blank" 
        rel="noopener noreferrer"
        className="nxl-head-link me-0"
        title="WhatsApp Support"
      >
        <FiHelpCircle size={20} />
      </a>
    </div>
  )
}

export default SearchModal
