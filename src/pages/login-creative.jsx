import LoginForm from '../components/authentication/LoginForm'

const LoginCreative = () => {
    return (
        <main className="auth-creative-wrapper">
            <div className="auth-creative-inner">
                <div className="creative-card-wrapper">
                    <div className="card my-4 overflow-hidden" style={{ zIndex: 1 }}>
                        <div className="row flex-1 g-0">
                            <div className="col-lg-6 h-100 my-auto order-1 order-lg-0">
                                <div className="creative-card-body card-body p-sm-5">
                                    <LoginForm registerPath={"/authentication/register/creative"} resetPath={"/authentication/reset/creative"} />
                                </div>
                            </div>
                            <div className="col-lg-6 bg-primary order-0 order-lg-1">
                                <div className="h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#af0000ff', color: 'white' }}>
                                    <img src="/images/auth/auth-user.png" alt="img" className="img-fluid" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

    )
}

export default LoginCreative