const Footer = () => {
    return (
        <footer className="footer">
            <p className="fs-11 text-muted fw-medium text-uppercase mb-0 copyright">
                <span>©</span>
                {new Date().getFullYear()} Copyright Merchantlify. All Rights Reserved
            </p>
        </footer>
    )
}

export default Footer