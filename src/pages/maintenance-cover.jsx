import React from 'react'
import MaintenaceForm from '@/components/authentication/MaintenaceForm'

const MaintenanceCover = () => {
    return (
        <main className="auth-cover-wrapper">
            <div className="auth-cover-content-inner">
                <div className="auth-cover-content-wrapper">
                    <div className="auth-img">
                        <img src="/images/auth/auth-cover-maintenance-bg.svg" alt="img" className="img-fluid" />
                    </div>
                </div>
            </div>
            <div className="auth-cover-sidebar-inner">
                <div className="auth-cover-card-wrapper">
                    <div className="auth-cover-card p-sm-5">
                        <div className="w-100 mb-5 d-flex flex-column align-items-center justify-content-center">
                            <img
                                src="/images/Merchantlify Logo 1.svg"
                                alt="Merchantlify Logo"
                                className="img-fluid mx-auto"
                                style={{ width: '300px', maxWidth: '100%' }}
                            />
                        </div>
                        <MaintenaceForm />
                    </div>
                </div>
            </div>
        </main>

    )
}

export default MaintenanceCover