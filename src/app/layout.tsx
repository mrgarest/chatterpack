import { Outlet } from "react-router-dom";
import { Footer } from "@/app/components/footer";
import { Navbar } from "@components/navbar";

export const Layout = () => {
    return (
        <div className="container pt-6 grid grid-cols-[auto_1fr] gap-8 min-h-screen">
            <Navbar />
            <div className="grid grid-rows-[1fr_auto]">
                <Outlet />
                <Footer />
            </div>
        </div>
    );
}
