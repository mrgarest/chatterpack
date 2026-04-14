
export function PageHeader({ title, children = undefined }: { title: string, children?: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <h1 className="text-h1">{title}</h1>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

export function PageDescription({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-sm text-foreground font-normal">{children}</p>
    );
}