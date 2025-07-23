import { FiEye, FiKey } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { BASE_URL } from '/src/paths.js';

const TabPassword = () => {
    // Get token from localStorage
    const authData = JSON.parse(localStorage.getItem('authData')) || {}
    const token = authData.token
    
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Auto-dismiss messages after 1000ms
    useEffect(() => {
        const timer = setTimeout(() => {
            if (error) setError('')
            if (success) setSuccess('')
        }, 2000)
        
        return () => clearTimeout(timer)
    }, [error, success])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        // Validation
        if (!token) {
            setError('You need to be logged in to change password')
            return
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('New password and confirm password do not match')
            return
        }

        if (formData.currentPassword === formData.newPassword) {
            setError('New password must be different from current password')
            return
        }

        try {
            setIsLoading(true)
            const response = await fetch(`${BASE_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Failed to change password')
            }

            setSuccess('Password changed successfully!')
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            })
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const getPasswordStrength = () => {
        const length = formData.newPassword.length
        if (length === 0) return 0
        if (length < 4) return 1
        if (length < 8) return 2
        if (length < 12) return 3
        return 4
    }

    const getStrengthColor = () => {
        const strength = getPasswordStrength()
        switch(strength) {
            case 1: return 'bg-danger'
            case 2: return 'bg-warning'
            case 3: return 'bg-info'
            case 4: return 'bg-success'
            default: return 'bg-light'
        }
    }

    return (
        <div className="tab-pane fade" id="passwordTab" role="tabpanel">
            <div className="card-body pass-info">
                <div className="mb-4 d-flex align-items-center justify-content-between">
                    <h5 className="fw-bold mb-0 me-4">
                        <span className="d-block mb-2">Password Information:</span>
                        <span className="fs-12 fw-normal text-muted text-truncate-1-line">You can only change your password twice within 24 hours! </span>
                    </h5>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="row mb-4 align-items-center">
                        <div className="col-lg-4">
                            <label htmlFor="currentPassword" className="fs-12 fw-normal text-muted text-truncate-1-line"><b>Current Password: </b></label>
                        </div>
                        <div className="col-lg-8">
                            <div className="input-group">
                                <div className="input-group-text"><FiKey /></div>
                                <input 
                                    type={showCurrentPassword ? "text" : "password"} 
                                    className="form-control" 
                                    id="currentPassword" 
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    placeholder="Current Password" 
                                    required
                                />
                                <div 
                                    className="input-group-text border-start bg-gray-2 c-pointer"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                    <FiEye />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row mb-4 align-items-center">
                        <div className="col-lg-4">
                            <label htmlFor="newPassword" className="fs-12 fw-normal text-muted text-truncate-1-line"><b>New Password: </b></label>
                        </div>
                        <div className="col-lg-8">
                            <div className="input-group">
                                <div className="input-group-text"><FiKey /></div>
                                <input 
                                    type={showNewPassword ? "text" : "password"} 
                                    className="form-control" 
                                    id="newPassword" 
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    placeholder="New Password" 
                                    required
                                />
                                <div 
                                    className="input-group-text border-start bg-gray-2 c-pointer"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    <FiEye />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row mb-4 align-items-center">
                        <div className="col-lg-4">
                            <label htmlFor="confirmPassword" className="fs-12 fw-normal text-muted text-truncate-1-line"><b>Confirm Password: </b></label>
                        </div>
                        <div className="col-lg-8">
                            <div className="input-group">
                                <div className="input-group-text"><FiKey /></div>
                                <input 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    className="form-control" 
                                    id="confirmPassword" 
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm Password" 
                                    required
                                />
                                <div 
                                    className="input-group-text border-start bg-gray-2 c-pointer"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <FiEye />
                                </div>
                            </div>
                            <div className="progress mt-2" style={{ height: '5px' }}>
                                <div 
                                    className={`progress-bar ${getStrengthColor()}`} 
                                    role="progressbar" 
                                    style={{ width: `${(getPasswordStrength() / 4) * 100}%` }}
                                    aria-valuenow={getPasswordStrength()}
                                    aria-valuemin="0"
                                    aria-valuemax="4"
                                ></div>
                            </div>
                        </div>
                    </div>
                    <div className="pass-hint mb-4">
                        <p className="fs-12 fw-normal text-muted text-truncate-1-line"><b>Password Requirements:</b></p>
                        <ul className="fs-12 ps-1 ms-2 text-muted">
                            <li className="mb-1">At least one lowercase character</li>
                            <li className="mb-1">Minimum 8 characters long - the more, the better</li>
                            <li>At least one number, symbol, or whitespace character</li>
                        </ul>
                    </div>
                    <div className="text-end">
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Error Popup */}
            {error && (
                <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4">
                    <div className="alert alert-danger d-flex align-items-center shadow-lg" role="alert">
                        <div className="flex-grow-1">{error}</div>
                        <button 
                            type="button" 
                            className="btn-close ms-3" 
                            onClick={() => setError('')}
                            aria-label="Close"
                        >
                        </button>
                    </div>
                </div>
            )}

            {/* Success Popup */}
            {success && (
                <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4">
                    <div className="alert alert-success d-flex align-items-center shadow-lg" role="alert">
                        <div className="flex-grow-1">{success}</div>
                        <button 
                            type="button" 
                            className="btn-close ms-3" 
                            onClick={() => setSuccess('')}
                            aria-label="Close"
                        >
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TabPassword