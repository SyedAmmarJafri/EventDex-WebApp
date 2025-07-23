import { Outlet, Navigate } from "react-router-dom";

const ProtectedRoutes = () => {
    const user = null
    return user ? <Outlet/> : <Navigate to="/authentication/login/cover"/>
}

export default ProtectedRoutes