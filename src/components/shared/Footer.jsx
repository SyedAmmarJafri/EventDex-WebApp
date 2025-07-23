const Footer = () => {
    return (
        <footer className="footer">
            <p className="fs-11 text-muted fw-medium text-uppercase mb-0 copyright">
                <span>©</span>
                {new Date().getFullYear()} Copyright Merchantlify. All Rights Reserved - DEVELOPTED BY <a href="https://ioservices.ca/" target="_blank" className="fs-11 fw-semibold text-uppercase">IOSERVICES</a> X <a href="https://www.metatf.ca/" target="_blank" className="fs-11 fw-semibold text-uppercase">METATF</a>
            </p>
            <div className="d-flex align-items-center gap-4">
                <a href="#" className="fs-11 fw-semibold text-uppercase">Help</a>
                <a href="#" className="fs-11 fw-semibold text-uppercase">Terms</a>
                <a href="#" className="fs-11 fw-semibold text-uppercase">Privacy</a>
            </div>
        </footer>
    )
}

export default Footer