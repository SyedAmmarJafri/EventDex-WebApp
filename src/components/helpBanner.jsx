const HelpBanner = () => {
    return (
        <div className="row g-0 align-items-center border-bottom help-center-content-header">
            <div className="col-lg-6 offset-lg-3 text-center">
                <h2 className="fw-bolder mb-2 text-dark">Merchantlify Help Center</h2>
                <p className="text-muted">A premium web applications with integrate knowledge base.</p>
                <div className="mt-2 d-none d-sm-block">
                    <a className="badge bg-primary shadow-sm text-light mx-1">Started</a>
                    <a className="badge bg-primary shadow-sm text-light mx-1">Integrations</a>
                    <a className="badge bg-primary shadow-sm text-light mx-1">Directory</a>
                    <a className="badge bg-primary shadow-sm text-light mx-1">Administrator</a>
                    <a className="badge bg-primary shadow-sm text-light mx-1">Support</a>
                </div>
            </div>
        </div>

    )
}

export default HelpBanner