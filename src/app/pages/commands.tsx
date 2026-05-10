import { useEffect, useState } from 'react';
import { Controller, useForm as useDialogForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { CirclePlus, Trash2, Pencil } from 'lucide-react';
import toast from "react-hot-toast";
import { Field, FieldError } from '@components/ui/field';
import { Button } from '@components/ui/button';
import { Switch } from '@components/ui/switch';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { db } from '@/database';
import i18n from '@/lib/i18n';
import { PageDescription, PageHeader } from '@components/ui/page-header';
import { RuntimeMessageType } from '@/enums/message';
import type { Command } from '@/types/database';
import { CommandAccess, CommandReplyType, CommandScope } from '@/enums/database';
import { Label } from '@components/ui/label';

/**
 * Validation scheme
 */
export const commandSchema = z.object({
    id: z.number().optional(),
    enabled: z.boolean(),
    trigger: z
        .string()
        .min(2, i18n.t("errors.tooShort"))
        .refine((val) => val.startsWith('!'), i18n.t("errors.mustStartWithExclamation"))
        .refine((val) => !val.includes(' '), i18n.t("errors.noSpacesAllowed")),
    command: z.string().min(1, i18n.t("errors.required")).max(500),
    scope: z.enum(Object.values(CommandScope) as [string, ...string[]]),
    scopeChannel: z.string().optional(),
    access: z.enum(Object.values(CommandAccess) as [string, ...string[]]),
    replyType: z.enum(Object.values(CommandReplyType) as [string, ...string[]]),
}).superRefine((data, ctx) => {
    if (data.scope === CommandScope.CHANNEL && !data.scopeChannel?.trim()) {
        ctx.addIssue({
            code: "custom",
            message: i18n.t("errors.required"),
            path: ['scopeChannel'],
        });
    }
});

// Types

type CommandItem = z.infer<typeof commandSchema>;

type DialogMode =
    | { type: 'closed' }
    | { type: 'add' }
    | { type: 'edit'; index: number; data: CommandItem };

// Constants

const EMPTY_COMMAND: CommandItem = {
    enabled: true,
    trigger: '!',
    command: '',
    scope: CommandScope.ALL,
    scopeChannel: '',
    access: CommandAccess.ME,
    replyType: CommandReplyType.MESSAGE,
};

/**
 * Checks if a trigger already exists among existing commands, considering the scope and channel.
 *
 * Rules:
 * - If either command has scope ALL — conflict (ALL blocks everything)
 * - If both have scope CHANNEL — conflict only if the channel name matches
 */
function isDuplicateTrigger(
    trigger: string,
    scope: CommandScope | string,
    scopeChannel: string | undefined,
    existing: CommandItem[],
    skipId?: number,
): boolean {
    const lower = trigger.toLowerCase();
    return existing.some(cmd => {
        if (cmd.id !== undefined && cmd.id === skipId) return false;
        if (cmd.trigger.toLowerCase() !== lower) return false;
        if (scope === CommandScope.ALL || cmd.scope === CommandScope.ALL) return true;
        return cmd.scopeChannel?.toLowerCase() === scopeChannel?.toLowerCase();
    });
}

export default function CommandsPage() {
    const [commands, setCommands] = useState<CommandItem[]>([]);
    const [dialogMode, setDialogMode] = useState<DialogMode>({ type: 'closed' });
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

    const loadCommands = async () => {
        const data = await db.commands.toArray();
        setCommands(data.map(item => ({
            ...item,
            trigger: item.trigger.startsWith('!') ? item.trigger : `!${item.trigger}`,
            scope: item.scope ?? CommandScope.ALL,
            access: item.access ?? CommandAccess.EVERYONE,
            replyType: item.replyType ?? CommandReplyType.MESSAGE,
            scopeChannel: item.scopeChannel ?? '',
        })));
    };

    useEffect(() => { loadCommands(); }, []);

    /**
     * Deletes the command confirmed in the alert dialog.
     */
    const handleDelete = async () => {
        if (deleteIndex === null) return;
        const cmd = commands[deleteIndex];
        if (cmd.id !== undefined) await db.commands.delete(cmd.id);
        setCommands(prev => prev.filter((_, i) => i !== deleteIndex));
        toast.success(i18n.t("changesSaved"));
        chrome?.runtime?.sendMessage({ type: RuntimeMessageType.SYNC_COMMANDS });
        setDeleteIndex(null);
    };

    /** 
     * Toggles the enabled state of a command without opening the dialog.
     * @param index 
     */
    const handleToggleEnabled = async (index: number) => {
        const cmd = commands[index];
        const updated = { ...cmd, enabled: !cmd.enabled };
        if (cmd.id !== undefined) await db.commands.put(updated as Command);
        setCommands(prev => prev.map((c, i) => i === index ? updated : c));
        chrome?.runtime?.sendMessage({ type: RuntimeMessageType.SYNC_COMMANDS });
    };

    /**
     * Saves a command from the dialog — either adds a new one or updates an existing one.
     * @param data 
     */
    const handleDialogSave = async (data: CommandItem) => {
        if (data.scope !== CommandScope.CHANNEL) {
            data.scopeChannel = undefined;
        }
        const skipId = dialogMode.type === 'edit' ? data.id : undefined;
        if (isDuplicateTrigger(data.trigger, data.scope, data.scopeChannel, commands, skipId)) {
            toast.error(i18n.t("errors.duplicateTrigger"));
            return;
        }
        try {
            if (dialogMode.type === 'add') {
                const id = await db.commands.add(data as Command);
                setCommands(prev => [...prev, { ...data, id: id as number }]);
            } else if (dialogMode.type === 'edit') {
                await db.commands.put(data as Command);
                setCommands(prev => prev.map((c, i) => i === dialogMode.index ? data : c));
            }
            toast.success(i18n.t("changesSaved"));
            chrome?.runtime?.sendMessage({ type: RuntimeMessageType.SYNC_COMMANDS });
            setDialogMode({ type: 'closed' });
        } catch {
            toast.error(i18n.t("errors.unknown"));
        }
    };

    return (
        <div className="space-y-8 min-w-0">
            <PageHeader title={i18n.t('commands')}>
                <PageDescription>{i18n.t("commandsDescription")}</PageDescription>
            </PageHeader>

            <div className="space-y-0 w-full overflow-hidden">
                <div className="divide-y divide-border">
                    {commands.map((cmd, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 py-3 transition-colors">

                            <Switch checked={cmd.enabled} onCheckedChange={() => handleToggleEnabled(index)} />

                            <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">{cmd.trigger}</span>
                                    {cmd.scope === CommandScope.CHANNEL && <>
                                        <span className="bg-muted-foreground/50 size-1 rounded-full" />
                                        <span className="text-xs text-muted-foreground">@{cmd.scopeChannel}</span>
                                    </>}
                                    {cmd.access === CommandAccess.ME && <>
                                        <span className="bg-muted-foreground/50 size-1 rounded-full" />
                                        <span className="text-xs text-muted-foreground">{i18n.t("onlyMe")}</span>
                                    </>}
                                </div>
                                <p className="text-xs text-foreground/70 truncate">{cmd.command}</p>
                            </div>

                            <div className="flex items-center gap-1 transition-opacity shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => setDialogMode({ type: 'edit', index, data: cmd })}
                                    className="size-9 text-muted-foreground hover:text-foreground">
                                    <Pencil size={18} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteIndex(index)}
                                    className="size-9 text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed py-5"
                    onClick={() => setDialogMode({ type: 'add' })}>
                    <CirclePlus className="mr-2" size={18} />
                    {i18n.t("add")}
                </Button>
            </div>

            <CommandDialog
                mode={dialogMode}
                onSave={handleDialogSave}
                onClose={() => setDialogMode({ type: 'closed' })}
            />

            <AlertDialog
                open={deleteIndex !== null}
                onOpenChange={(open) => { if (!open) setDeleteIndex(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{i18n.t("confirmAction")}</AlertDialogTitle>
                        <AlertDialogDescription>{i18n.t("deleteCommandAlert")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{i18n.t("no")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            variant="destructive">
                            {i18n.t("yes")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Dialog

interface CommandDialogProps {
    mode: DialogMode;
    onSave: (data: CommandItem) => Promise<void>;
    onClose: () => void;
}

function CommandDialog({ mode, onSave, onClose }: CommandDialogProps) {
    const isOpen = mode.type !== 'closed';
    const isEdit = mode.type === 'edit';

    const { control, handleSubmit, reset, watch, formState } = useDialogForm<CommandItem>({
        resolver: zodResolver(commandSchema),
        mode: "onChange",
        defaultValues: EMPTY_COMMAND,
    });

    const scope = watch('scope');

    useEffect(() => {
        if (mode.type === 'add') reset(EMPTY_COMMAND);
        else if (mode.type === 'edit') reset(mode.data);
    }, [mode, reset]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? i18n.t("editCommand") : i18n.t("addCommand")}
                    </DialogTitle>
                </DialogHeader>
                <DialogDescription />
                <form onSubmit={handleSubmit(onSave)} className="space-y-4 py-2">

                    {/* Trigger + Enabled */}
                    <div className="flex items-end gap-3">
                        <Controller
                            name="trigger"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="flex-1">
                                    <Label>{i18n.t("trigger")}</Label>
                                    <Input
                                        {...field}
                                        placeholder="!hello"
                                        aria-invalid={fieldState.invalid}
                                        autoComplete="off"
                                        onChange={(e) => {
                                            let val = e.target.value.toLowerCase();
                                            val = val.replace(/\s+/g, '');
                                            val = val.replace(/[ыъёэ;%:~#$^*()\-_+\/\\<>{}|@"№`']/g, '');
                                            if (val.length > 0 && !val.startsWith('!')) val = '!' + val;
                                            if (val === "") val = "!";
                                            field.onChange(val);
                                        }}
                                    />
                                    <FieldError className="text-[10px] mt-1 italic">{fieldState?.error?.message}</FieldError>
                                </Field>
                            )}
                        />

                        <Controller
                            name="enabled"
                            control={control}
                            render={({ field: { value, onChange } }) => (
                                <div className="flex items-center justify-center pb-2.5">
                                    <Switch checked={value} onCheckedChange={onChange} />
                                </div>
                            )}
                        />
                    </div>

                    {/* Scope + scopeChannel */}
                    <div className="flex gap-3">
                        <Controller
                            name="scope"
                            control={control}
                            render={({ field }) => (
                                <Field className="flex-1">
                                    <Label>{i18n.t("scope")}</Label>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={CommandScope.ALL}>{i18n.t("allChannels")}</SelectItem>
                                            <SelectItem value={CommandScope.CHANNEL}>{i18n.t("specificChannel")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        />

                        {scope === CommandScope.CHANNEL && (
                            <Controller
                                name="scopeChannel"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} className="flex-1">
                                        <Label>{i18n.t("channelName")}</Label>
                                        <Input
                                            {...field}
                                            placeholder="garest_"
                                            aria-invalid={fieldState.invalid}
                                            autoComplete="off"
                                            onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        />
                                        <FieldError>{fieldState?.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                        )}
                    </div>

                    {/* Access + ReplyType */}
                    <div className="grid grid-cols-2 gap-3">
                        <Controller
                            name="access"
                            control={control}
                            render={({ field }) => (
                                <Field>
                                    <Label>{i18n.t("access")}</Label>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={CommandAccess.ME}>{i18n.t("onlyMe")}</SelectItem>
                                            <SelectItem value={CommandAccess.EVERYONE}>{i18n.t("everyone")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        />

                        <Controller
                            name="replyType"
                            control={control}
                            render={({ field }) => (
                                <Field>
                                    <Label>{i18n.t("replyType")}</Label>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={CommandReplyType.MESSAGE}>{i18n.t("replyMessage")}</SelectItem>
                                            <SelectItem value={CommandReplyType.MENTION}>{i18n.t("replyMention")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        />
                    </div>

                    {/* Command text */}
                    <Controller
                        name="command"
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <Label>{i18n.t("command")}</Label>
                                <Textarea
                                    {...field}
                                    placeholder="Hello World!"
                                    aria-invalid={fieldState.invalid}
                                    autoComplete="off"
                                    rows={3}
                                    className="resize-none break-all"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.preventDefault();
                                    }}
                                />
                                <FieldError>{fieldState?.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>{i18n.t("cancel")}</Button>
                        <Button type="submit" disabled={formState.isSubmitting || !formState.isValid}>{i18n.t("save")}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}