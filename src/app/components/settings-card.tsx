interface SettingsCardProps {
    title: string;
    description?: string;
    hotkey?: string;
    children: React.ReactNode;
}

export default function SettingsCard({ title, description = undefined, hotkey = undefined, children }: SettingsCardProps) {

    const TitleComp = ({ children }: { children: string }): React.ReactNode => (<div className="text-base font-medium">{children}</div>);

    return (
        <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div className="space-y-1">
                {hotkey ? <div className="flex gap-1.5 items-center">
                    <div className="text-sm text-foreground font-medium bg-secondary px-1 py-0.5 border border-border leading-none rounded-sm select-none">{hotkey}</div>
                    <TitleComp>{title}</TitleComp>
                </div>
                    : <TitleComp>{title}</TitleComp>}
                {description && <p className="description">{description}</p>}
            </div>
            <div>
                {children}
            </div>
        </div>
    );
}