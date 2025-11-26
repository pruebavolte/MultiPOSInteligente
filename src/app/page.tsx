import MaxWidthWrapper from "@/components/global/max-width-wrapper";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

const HomePage = () => {
    return (
        <MaxWidthWrapper className="flex flex-col items-center w-full relative">
            <div className="flex flex-col items-center justify-center w-full min-h-70vh py-20 text-center">
                <div className="flex items-center justify-center lg:gap-16 w-full absolute top-[15%] left-1/2 -translate-x-1/2 -z-10">
                    <div className="w-52 h-52 rounded-full bg-[#0c8df9] blur-[10rem] opacity-70 -z-10"></div>
                    <div className="hidden lg:w-52 h-52 rounded-full bg-[#0c8df9] blur-[10rem] opacity-70 -z-10"></div>
                </div>
                <img src="/images/logo_salvadorx.png" alt="Logo SalvadorX" className="w-full lg:max-w-2xl"/>
                <p className="text-muted-foreground text-base md:text-lg max-w-xl py-2">
                    Más que un Punto de Venta, el mejor socio para tu negocio.
                </p>
                <div className="flex flex-row md:flex-row items-center justify-center gap-4 mt-8 w-full">
                    <Link href="#" className={buttonVariants()}>
                        Descargar para Windows
                        <img src="/icons/windows.svg" alt="Windows" className="w-4 h-4 ml-1.5" />
                    </Link>
                    <Link href="#" className={buttonVariants({ variant: "secondary" })}>
                        Descargar para Android
                    </Link>
                </div>
                <img src="/images/dashboard1.png" alt="Dashboard" className="max-w-6xl mt-10 border border-[#0F91F7] rounded-md"/>
            </div>
        </MaxWidthWrapper>
    )
};

export default HomePage
