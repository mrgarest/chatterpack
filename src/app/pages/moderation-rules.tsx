import { useEffect } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { CirclePlus, Trash2, Volume2, Highlighter } from 'lucide-react';
import toast from "react-hot-toast";
import { Button } from '@components/ui/button';
import { Switch } from '@components/ui/switch';
import { Input } from '@components/ui/input';
import { Toggle } from "@components/ui/toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { PageDescription, PageHeader } from '@components/ui/page-header';
import { db } from '@/database';
import i18n from '@/lib/i18n';
import { ModerationAction } from '@/enums/database';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/tooltip';
import SettingsCard from '@components/settings-card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@components/ui/alert-dialog";
import type { ModerationRule } from '@/interfaces/database';
import { RuntimeMessageType } from '@/enums/message';

/**
 * Validation scheme
 */
export const ruleSchema = z.object({
    id: z.number().optional(),
    enabled: z.boolean(),
    trigger: z.string().min(1, i18n.t("errors.required")),
    regex: z.boolean(),
    action: z.enum(Object.values(ModerationAction) as [string, ...string[]]),
    extraValue: z.string().optional(),
    highlight: z.boolean(),
    sound: z.boolean(),
}).superRefine((data, ctx) => {
    // For /timeout, you must specify a duration
    if (data.action === ModerationAction.TIMEOUT) {
        if (!data.extraValue || data.extraValue.trim() === "") {
            ctx.addIssue({
                code: "custom",
                message: i18n.t("errors.required"),
                path: ["extraValue"],
            });
        }
    }
});

type ModerationFormValues = {
    rules: z.infer<typeof ruleSchema>[];
};

// Empty rule
const EMPTY_RULE = {
    enabled: true,
    trigger: '',
    regex: false,
    action: ModerationAction.NONE,
    extraValue: undefined,
    highlight: true,
    sound: false,
} as const;

export default function ModerationRulesPage() {
    const { control, handleSubmit, reset, formState } = useForm<ModerationFormValues>({
        resolver: zodResolver(z.object({ rules: z.array(ruleSchema) })),
        mode: "onChange",
        defaultValues: {
            rules: []
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "rules",
    });

    /**
     * Load rules from the database on the first render.
     * If the database is empty, display a single empty rule so the form isn't blank.
     */
    useEffect(() => {
        const load = async () => {
            const data = await db.moderationRule.toArray();
            reset({ rules: data.length > 0 ? data : [] });
        };
        load();
    }, [reset]);

    /**
     * Saves changes to the database via a transaction.
     */
    const onSubmit = async (values: ModerationFormValues) => {
        try {
            await db.transaction('rw', db.moderationRule, async () => {
                const allInDb = await db.moderationRule.toArray();
                const formIds = values.rules.map(r => r.id).filter((id): id is number => !!id);

                // Delete those that are no longer in the form
                const toDelete = allInDb
                    .filter(r => r.id && !formIds.includes(r.id))
                    .map(r => r.id!);

                if (toDelete.length > 0) {
                    await db.moderationRule.bulkDelete(toDelete);
                }

                // Update existing ones or add new ones
                await db.moderationRule.bulkPut(values.rules.map(r => ({
                    ...r,
                    action: r.action as ModerationAction,
                })));
            });

            toast.success(i18n.t("changesSaved"));

            // Get fresh data from the database
            const updatedData = await db.moderationRule.toArray();
            reset({ rules: updatedData });

            // Notify content scripts about the update
            chrome?.runtime?.sendMessage({ type: RuntimeMessageType.SYNC_MODERATION_RULES });
        } catch (error) {
            if (__DEBUG__) {
                console.error(error);
            }
            toast.error(i18n.t("errors.unknown"));
        }
    };

    /**
     * Fetches a preset of moderation rules from a GitHub repository and imports them into the database.
     */
    const handleImport = async () => {
        const loadingToast = toast.loading(i18n.t("updatingData"));
        try {
            const response = await fetch("https://raw.githubusercontent.com/mrgarest/chatterpack/refs/heads/main/presets/moderation-rules.json");

            if (!response.ok) throw new Error("Failed to fetch rules");

            const remoteData: { trigger: string; regex: boolean }[] = await response.json();

            // Get data directly from the database to reliably check for duplicates
            const allInDb = await db.moderationRule.toArray();
            const currentTriggers = new Set(allInDb.map(r => r.trigger.toLowerCase()));

            const rulesToAdd: ModerationRule[] = [];

            remoteData.forEach((remoteRule) => {
                const lowTrigger = remoteRule.trigger.toLowerCase();

                if (!currentTriggers.has(lowTrigger)) {
                    rulesToAdd.push({
                        trigger: remoteRule.trigger,
                        regex: !!remoteRule.regex,
                        action: ModerationAction.NONE,
                        enabled: true,
                        highlight: true,
                        sound: false,
                        extraValue: "",
                    });
                    currentTriggers.add(lowTrigger);
                }
            });

            if (rulesToAdd.length > 0) {
                // Using a transaction to write to the database
                await db.transaction('rw', db.moderationRule, async () => {
                    await db.moderationRule.bulkPut(rulesToAdd);
                });

                // Refresh the form so the user can see the new rules
                const updatedData = await db.moderationRule.toArray();
                reset({ rules: updatedData });

                toast.success(i18n.t("importedRulesCount", { count: rulesToAdd.length }), { id: loadingToast });
            } else {
                toast.success(i18n.t("noNewRulesFound"), { id: loadingToast });
            }

        } catch (error) {
            if (__DEBUG__) console.error(error);
            toast.error(i18n.t("errors.unknown"), { id: loadingToast });
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader title={i18n.t('moderation')}>
                <PageDescription>{i18n.t("moderationDescription")}</PageDescription>
            </PageHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center">
                            {/* Enables/disables the rule without deleting it */}
                            <Controller
                                name={`rules.${index}.enabled`}
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                    <Switch checked={value} onCheckedChange={onChange} />
                                )}
                            />

                            <div className="relative flex items-center">
                                {/* Rule trigger */}
                                <Controller
                                    name={`rules.${index}.trigger`}
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            placeholder={i18n.t("keywordPlaceholder")}
                                            className="pr-12 focus-visible:ring-1"
                                        />
                                    )}
                                />

                                {/* Allows the use of regular expressions in the trigger */}
                                <Controller
                                    name={`rules.${index}.regex`}
                                    control={control}
                                    render={({ field: { value, onChange } }) => (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Toggle
                                                    type="button"
                                                    pressed={value}
                                                    onPressedChange={onChange}
                                                    size="sm"
                                                    className="absolute right-1.5 h-8 px-1.5 font-mono text-[10px] hover:bg-primary/20 aria-pressed:bg-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                >.*</Toggle>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{i18n.t('regularExpression')}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                />
                            </div>

                            {/* Automatic action when a rule is triggered */}
                            <div className="flex items-center">
                                <Controller
                                    name={`rules.${index}.action`}
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="w-36">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={ModerationAction.BAN}>/ban</SelectItem>
                                                <SelectItem value={ModerationAction.TIMEOUT}>/timeout</SelectItem>
                                                <SelectItem value={ModerationAction.DELETE}>/delete</SelectItem>
                                                <SelectItem value={ModerationAction.NONE}>{i18n.t('noAction')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <Controller
                                    name={`rules.${index}.action`}
                                    control={control}
                                    render={({ field: { value } }) =>
                                        value === ModerationAction.TIMEOUT ? (
                                            <Controller
                                                name={`rules.${index}.extraValue`}
                                                control={control}
                                                render={({ field }) => (
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        placeholder="60s"
                                                        className="w-24 ml-3"
                                                        min="1"
                                                    />
                                                )}
                                            />
                                        ) : <div className="w-0" />
                                    }
                                />
                            </div>

                            {/* Group of additional effects */}
                            <div className="flex items-center bg-background/50 rounded-md border overflow-hidden" >
                                <Controller
                                    name={`rules.${index}.highlight`}
                                    control={control}
                                    render={({ field: { value, onChange } }) => (
                                        <Toggle
                                            pressed={value}
                                            onPressedChange={onChange}
                                            className="size-10.5 p-0 rounded-none hover:bg-primary/20 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                                            <Highlighter size={16} />
                                        </Toggle>
                                    )}
                                />
                                <div className="bg-border w-px h-10.5" />
                                <Controller
                                    name={`rules.${index}.sound`}
                                    control={control}
                                    render={({ field: { value, onChange } }) => (
                                        <Toggle
                                            pressed={value}
                                            onPressedChange={onChange}
                                            className="size-10.5 p-0 rounded-none hover:bg-primary/20 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                                            <Volume2 size={16} />
                                        </Toggle>
                                    )}
                                />
                            </div>

                            {/* Delete button */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="size-9 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                                <Trash2 size={18} />
                            </Button>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed py-5"
                        onClick={() => append(EMPTY_RULE)}>
                        <CirclePlus className="mr-2" size={18} />
                        {i18n.t("add")}
                    </Button>
                </div>

                <Button
                    type="submit"
                    disabled={formState.isSubmitting || !formState.isValid}>{i18n.t("save")}</Button>
            </form>

            <hr />

            <SettingsCard
                title={i18n.t("importFromGitHub")}
                description={i18n.t("importModerationRuleFromGitHubDescription")}>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="w-fit">{i18n.t("import")}</Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{i18n.t("confirmAction")}</AlertDialogTitle>
                            <AlertDialogDescription>{i18n.t("importModerationRuleFromGitHubAlert")}</AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <AlertDialogCancel>{i18n.t("no")}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleImport}>{i18n.t("yes")}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SettingsCard>
        </div>
    );
}