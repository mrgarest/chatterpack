import { Trash2, Volume2, Palette } from 'lucide-react';
import { Button } from './button';
import { Switch } from './switch';
import { Toggle } from "./toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import i18n from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface RootProps {
    children: React.ReactNode
    enabled: boolean;
    onEnabledChange: (val: boolean) => void;
    color: string;
    onColorChange: (val: string) => void;
    sound: boolean;
    onSoundChange: (val: boolean) => void;
    regex?: boolean;
    onRegexChange?: (val: boolean) => void;
    onDelete?: () => void;
}

export const HighlightRow = ({
    children,
    enabled, onEnabledChange,
    color, onColorChange,
    sound, onSoundChange,
    regex, onRegexChange,
    onDelete,
}: RootProps) => {
    return (
        <div className={cn(
            "grid gap-3 items-center animate-in fade-in",
            onDelete ? "grid-cols-[auto_1fr_auto_auto_auto]" : "grid-cols-[auto_1fr_auto_auto]"
        )}>
            <Switch checked={enabled} onCheckedChange={onEnabledChange} />

            <div className="relative flex items-center">
                {children}

                {onRegexChange && typeof regex === 'boolean' && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                type="button"
                                pressed={regex}
                                onPressedChange={onRegexChange}
                                size="sm"
                                className="absolute right-1.5 h-8 px-1.5 font-mono text-[10px] hover:bg-primary/20 aria-pressed:bg-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >.*</Toggle>
                        </TooltipTrigger>
                        <TooltipContent>{i18n.t('regularExpression')}</TooltipContent>
                    </Tooltip>
                )}
            </div>

            <div className="flex items-center gap-2 bg-background/50 border rounded-md px-2 h-10.5">
                <Palette size={16} className="text-muted-foreground" />
                <input
                    type="color"
                    value={color}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="w-8 h-6 bg-transparent cursor-pointer border-none shadow-none focus:ring-0"
                />
            </div>

            <div className="flex items-center bg-background/50 rounded-md border overflow-hidden">
                <Toggle
                    type="button"
                    pressed={sound}
                    onPressedChange={onSoundChange}
                    className="size-10.5 p-0 rounded-none hover:bg-primary/20 aria-pressed:bg-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    <Volume2 size={16} />
                </Toggle>
            </div>

            {onDelete && <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="size-9 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                <Trash2 size={18} />
            </Button>}
        </div>
    );
};