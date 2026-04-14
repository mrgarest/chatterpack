import { useEffect } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { CirclePlus, Trash2 } from 'lucide-react';
import toast from "react-hot-toast";
import { Field, FieldError } from '@components/ui/field';
import { Button } from '@components/ui/button';
import { Switch } from '@components/ui/switch';
import { Input } from '@components/ui/input';
import { db } from '@/database';
import i18n from '@/lib/i18n';
import { PageDescription, PageHeader } from '@components/ui/page-header';
import { RuntimeMessageType } from '@/enums/message';

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
});

const formSchema = z.object({
    commands: z.array(commandSchema),
}).superRefine((data, ctx) => {
    // Checking for unique triggers
    const triggers = data.commands.map(c => c.trigger.toLowerCase());
    data.commands.forEach((cmd, idx) => {
        if (triggers.indexOf(cmd.trigger.toLowerCase()) !== idx) {
            ctx.addIssue({
                code: "custom",
                message: i18n.t("errors.duplicateTrigger"),
                path: ['commands', idx, 'trigger'],
            });
        }
    });
});

type CommandsFormValues = z.infer<typeof formSchema>;

// Empty command
const EMPTY_COMMAND = {
    id: undefined,
    enabled: true,
    trigger: '!',
    command: '',
} as const;

export default function CommandsPage() {
    const { control, handleSubmit, reset, formState } = useForm<CommandsFormValues>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            commands: []
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "commands",
    });

    /**
     * Load commands from the database during the first render.
     * Ensure that there is a “!” at the beginning of the trigger in case older records were saved without it.
     */
    useEffect(() => {
        const load = async () => {
            const data = await db.commands.toArray();
            reset({
                commands: data.map(item => ({
                    id: item.id,
                    enabled: item.enabled,
                    trigger: item.trigger.startsWith('!') ? item.trigger : `!${item.trigger}`,
                    command: item.command,
                }))
            });
        };
        load();
    }, [reset]);

    /**
     * Delete the command from the form.
     * @param index 
     */
    const handleDelete = async (index: number) => {
        remove(index);
    };

    /**
     * Saves changes to the database via a transaction.
     */
    const onSubmit = async (values: CommandsFormValues) => {
        try {
            await db.transaction('rw', db.commands, async () => {
                const allInDb = await db.commands.toArray();
                const dbIds = allInDb.map(item => item.id);
                const formIds = values.commands
                    .map(item => item.id)
                    .filter((id): id is number => typeof id === 'number');

                // Delete those that are no longer in the form
                const idsToDelete = dbIds.filter(id => id !== undefined && !formIds.includes(id as number));
                if (idsToDelete.length > 0) {
                    await db.commands.bulkDelete(idsToDelete as number[]);
                }

                // Update existing ones or add new ones
                await db.commands.bulkPut(values.commands);
            });
            toast.success(i18n.t("changesSaved"));

            // Get fresh data from the database
            const updatedData = await db.commands.toArray();

            // Notify content scripts about the update
            chrome?.runtime?.sendMessage({ type: RuntimeMessageType.SYNC_COMMANDS });
            reset({ commands: updatedData });
        } catch (error) {
            if (__DEBUG__) {
                console.error(error);
            }
            toast.error(i18n.t("errors.unknown"));
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader title={i18n.t('commands')}>
                <PageDescription>{i18n.t("commandsDescription")}</PageDescription>
            </PageHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="grid grid-cols-[auto_1fr_2fr_auto] gap-3 items-center">
                            {/* Enables/disables the command without deleting it */}
                            <Controller
                                name={`commands.${index}.enabled`}
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                    <div className="pt-2">
                                        <Switch checked={value} onCheckedChange={onChange} />
                                    </div>
                                )}
                            />

                            {/* Command trigger */}
                            <Controller
                                name={`commands.${index}.trigger`}
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} className="w-full">
                                        <Input
                                            {...field}
                                            placeholder="!hello"
                                            aria-invalid={fieldState.invalid}
                                            autoComplete="off"
                                            onChange={(e) => {
                                                let val = e.target.value.toLowerCase();
                                                val = val.replace(/\s+/g, '');
                                                val = val.replace(/[ыъёэ;%:~#$^*()\-_+\/\\<>{}|@"№`']/g, '');

                                                // Guaranteed ”!” at the beginning
                                                if (val.length > 0 && !val.startsWith('!')) {
                                                    val = '!' + val;
                                                }

                                                // If you've deleted everything, leave the “!”
                                                if (val === "") val = "!";

                                                field.onChange(val);
                                            }}
                                        />
                                        {fieldState.invalid && fieldState.error && (
                                            <FieldError className="text-[10px] mt-1 italic">
                                                {fieldState.error.message}
                                            </FieldError>
                                        )}
                                    </Field>
                                )}
                            />

                            {/* Command */}
                            <Controller
                                name={`commands.${index}.command`}
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} className="w-full">
                                        <Input
                                            {...field}
                                            placeholder="Hello World!"
                                            aria-invalid={fieldState.invalid}
                                            autoComplete="off"
                                        />
                                        {fieldState.invalid && fieldState.error && (
                                            <FieldError>
                                                {fieldState.error.message}
                                            </FieldError>
                                        )}
                                    </Field>
                                )}
                            />

                            {/* Delete button */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(index)}
                                className="h-9 w-9 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                                <Trash2 size={18} />
                            </Button>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed py-5"
                        onClick={() => append(EMPTY_COMMAND)}>
                        <CirclePlus className="mr-2" size={18} />
                        {i18n.t("add")}
                    </Button>
                </div>

                <Button type="submit" disabled={formState.isSubmitting || !formState.isValid}>{i18n.t("save")}</Button>
            </form>
        </div>
    );
}