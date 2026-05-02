import { useEffect, useState } from 'react';
import { useFieldArray, useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { CirclePlus } from 'lucide-react';
import toast from "react-hot-toast";
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { PageDescription, PageHeader } from '@components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { db } from '@/database';
import i18n from '@/lib/i18n';
import { HighlightType } from '@/enums/database';
import { cn } from '@/lib/utils';
import { DEFAULT_SETTINGS, settings } from '@/utils/settings';
import { HighlightRow } from '@components/ui/highlight-row';
import { RuntimeMessageType } from '@/enums/message';
import type { CustomHighlight } from '@/types/settings';

/**
 * Validation scheme
 */
export const highlightSchema = z.object({
    id: z.number().optional(),
    type: z.enum(Object.values(HighlightType) as [string, ...string[]]),
    enabled: z.boolean(),
    trigger: z.string().min(1, i18n.t("errors.required")),
    color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, i18n.t("errors.invalidColor")),
    regex: z.boolean(),
    sound: z.boolean(),
}).superRefine((data, ctx) => {
    // If the type is USER, we check the validity of the Twitch username
    if (data.type === HighlightType.USER) {
        const twitchUserRegex = /^[a-zA-Z0-9_]+$/;
        if (!twitchUserRegex.test(data.trigger)) {
            ctx.addIssue({
                code: "custom",
                message: i18n.t("errors.invalidUsername"),
                path: ["trigger"],
            });
        }
    }
});

type HighlightFormValues = {
    rules: z.infer<typeof highlightSchema>[];
};

export default function HighlightPage() {
    const [highlightMyUsername, setHighlightMyUsername] = useState<CustomHighlight>(DEFAULT_SETTINGS.highlightMyUsername);

    const { control, handleSubmit, reset, formState, setValue } = useForm<HighlightFormValues>({
        resolver: zodResolver(z.object({ rules: z.array(highlightSchema) })),
        mode: "onChange",
        defaultValues: { rules: [] },
    });

    const watchedRules = useWatch({
        control,
        name: "rules",
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "rules",
    });

    useEffect(() => {
        setHighlightMyUsername(settings.get("highlightMyUsername"));
    }, []);

    /**
     * Loading data from the database.
     */
    useEffect(() => {
        const load = async () => {
            const data = await db.highlights.toArray();
            reset({ rules: data.length > 0 ? data : [] });
        };
        load();
    }, [reset]);

    /**
     * Helper for creating a new element
     */
    const createEmptyHighlight = (type: HighlightType) => ({
        type,
        enabled: true,
        trigger: '',
        color: '#1c9eff',
        regex: false,
        sound: false,
    });

    /**
     * Saves changes to the database via a transaction.
     */
    const onSubmit = async (values: HighlightFormValues) => {
        try {
            //  Chrome Storage
            await chrome?.storage?.local.set({ highlightMyUsername });

            // IndexedDB
            await db.transaction('rw', db.highlights, async () => {
                const allInDb = await db.highlights.toArray();
                const formIds = values.rules.map(r => r.id).filter((id): id is number => !!id);

                // Delete those that are no longer in the form
                const toDelete = allInDb
                    .filter(r => r.id && !formIds.includes(r.id))
                    .map(r => r.id!);

                if (toDelete.length > 0) {
                    await db.highlights.bulkDelete(toDelete);
                }

                // Update existing ones or add new ones
                await db.highlights.bulkPut(values.rules.map(r => ({
                    ...r,
                    type: r.type as HighlightType,
                })));
            });

            toast.success(i18n.t("changesSaved"));

            // Get fresh data from the database
            const updatedData = await db.highlights.toArray();
            reset({ rules: updatedData });

            // Notify content scripts about the update
            chrome?.runtime?.sendMessage({ type: RuntimeMessageType.SYNC_HIGHLIGHTS });
        } catch (error) {
            if (__DEBUG__) {
                console.error(error);
            }
            toast.error(i18n.t("errors.unknown"));
        }
    };

    /**
     * Rendering a single line of code
     */
    const renderRuleRow = (index: number) => {
        const field = fields[index];
        const isUser = field.type === HighlightType.USER;

        const currentRule = watchedRules[index] || field;

        return (
            <HighlightRow
                key={field.id}
                enabled={currentRule.enabled}
                onEnabledChange={(val) => setValue(`rules.${index}.enabled`, val, { shouldDirty: true })}
                color={currentRule.color}
                onColorChange={(val) => setValue(`rules.${index}.color`, val, { shouldDirty: true })}
                sound={currentRule.sound}
                onSoundChange={(val) => setValue(`rules.${index}.sound`, val, { shouldDirty: true })}
                regex={!isUser ? currentRule.regex : undefined}
                onRegexChange={!isUser ? (val) => setValue(`rules.${index}.regex`, val, { shouldDirty: true }) : undefined}
                onDelete={() => remove(index)}
            >
                <Controller
                    name={`rules.${index}.trigger`}
                    control={control}
                    render={({ field: triggerField }) => (
                        <Input
                            {...triggerField}
                            placeholder={isUser ? i18n.t("username") : i18n.t("wordPlaceholder")}
                            className={cn("focus-visible:ring-1", !isUser && "pr-12")}
                            onChange={(e) => {
                                let val = e.target.value;
                                if (isUser) val = val.replace(/[@\s]/g, "").replace(/[^a-zA-Z0-9_]/g, "");
                                triggerField.onChange(val);
                            }}
                        />
                    )}
                />
            </HighlightRow>
        );
    };


    return (
        <div className="space-y-8">
            <PageHeader title={i18n.t('highlight')}>
                <PageDescription>{i18n.t("highlightDescription")}</PageDescription>
            </PageHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue={HighlightType.MESSAGE} className="w-full flex flex-col">
                    <TabsList variant="line">
                        <TabsTrigger value={HighlightType.MESSAGE}>{i18n.t('messages')}</TabsTrigger>
                        <TabsTrigger value={HighlightType.USER}>{i18n.t('users')}</TabsTrigger>
                    </TabsList>

                    {/* Messages tab */}
                    <TabsContent value={HighlightType.MESSAGE} className="space-y-4 outline-none">
                        <div className="space-y-3">
                            <HighlightRow
                                enabled={highlightMyUsername.enabled}
                                onEnabledChange={(enabled) => setHighlightMyUsername(prev => ({ ...prev, enabled }))}
                                color={highlightMyUsername.color}
                                onColorChange={(color) => setHighlightMyUsername(prev => ({ ...prev, color }))}
                                sound={highlightMyUsername.sound}
                                onSoundChange={(sound) => setHighlightMyUsername(prev => ({ ...prev, sound }))}>
                                <Input
                                    value={i18n.t("highlightMyUsername")}
                                    readOnly
                                    className="cursor-default focus-visible:ring-0 shadow-none"
                                />
                            </HighlightRow>
                            {fields.map((field, index) =>
                                field.type === HighlightType.MESSAGE ? renderRuleRow(index) : null
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full border-dashed py-5"
                            onClick={() => append(createEmptyHighlight(HighlightType.MESSAGE))}>
                            <CirclePlus className="mr-2" size={18} />
                            {i18n.t("add")}
                        </Button>
                    </TabsContent>

                    {/* User tab */}
                    <TabsContent value={HighlightType.USER} className="space-y-4 outline-none">
                        <div className="space-y-3">
                            {fields.map((field, index) =>
                                field.type === HighlightType.USER ? renderRuleRow(index) : null
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full border-dashed py-5"
                            onClick={() => append(createEmptyHighlight(HighlightType.USER))}>
                            <CirclePlus className="mr-2" size={18} />
                            {i18n.t("add")}
                        </Button>
                    </TabsContent>
                </Tabs>

                <Button
                    type="submit"
                    disabled={formState.isSubmitting || !formState.isValid}>{i18n.t("save")}</Button>
            </form>
        </div>
    );
}