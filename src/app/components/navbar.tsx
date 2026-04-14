import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HardDriveDownload, Highlighter, Settings, Sword, Terminal, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import i18n from "@/lib/i18n";

export const Navbar = () => {
    const navItems: { ico?: LucideIcon; svg?: ReactNode; to: string; text: string; }[] = [
        // {
        //     ico: Settings,
        //     to: '/',
        //     text: i18n.t('settings')
        // },
        {
            ico: Terminal,
            to: '/commands',
            text: i18n.t('commands')
        },
        {
            ico: Sword,
            to: '/moderation/rules',
            text: i18n.t('moderation')
        },
        {
            ico: Highlighter,
            to: '/highlight',
            text: i18n.t('highlight')
        },
        {
            ico: HardDriveDownload,
            to: '/backup',
            text: i18n.t('backup')
        }
    ]

    const { pathname } = useLocation();
    return (
        <div className="relative">
            <div className="flex flex-col space-y-0.5 w-48 sticky top-6">
                {navItems.map((item, index) => (
                    <Link
                        key={index}
                        to={item.to}
                        className={cn('flex items-center font-medium gap-2 px-3 py-2 rounded-md text-sm select-none cursor-pointer', (item.to == pathname ? 'bg-primary/95 text-primary-foreground' : 'hover:bg-primary/15'))}>
                        {item.ico && <item.ico size={16} />}
                        {item.svg && item.svg}
                        {item.text}
                    </Link>
                ))}
            </div>
        </div>
    );
}
