import React, { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import toast from "react-hot-toast";
import { Button } from '@components/ui/button';
import { PageDescription, PageHeader } from '@components/ui/page-header';
import { db } from '@/database';
import i18n from '@/lib/i18n';
import { ruleSchema } from './moderation-rules';
import { highlightSchema } from './highlight';
import { commandSchema } from './commands';

export default function BackupPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Helper to remove 'id' field from objects in an array
     */
    const stripIds = (arr: any[]) => arr.map(({ id, ...rest }) => rest);

    /**
     * Export data to JSON format.
     */
    const handleExport = async () => {
        const loadingToast = toast.loading(i18n.t("preparingFiles"));
        try {
            const backupData = {
                commands: stripIds(await db.commands.toArray()),
                moderationRule: stripIds(await db.moderationRule.toArray()),
                highlights: stripIds(await db.highlights.toArray()),
                version: 1,
                exportedAt: Date.now(),
            };

            // Create a temporary blob and immediately remove the URL after the click
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `chatterpack_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            URL.revokeObjectURL(url);
            toast.success(i18n.t("exportSuccess"), { id: loadingToast });
        } catch (error) {
            if (__DEBUG__) {
                console.error("[Export]:", error);
            }
            toast.error(i18n.t("errors.unknown"), { id: loadingToast });
        }
    };

    /**
     *  Imports data from a JSON file.
     * @param event
     */
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const loadingToast = toast.loading(i18n.t("updatingData"));
            try {
                const json = JSON.parse(e.target?.result as string);

                // Use standard bulkPut to update existing records
                await db.transaction('rw', [db.commands, db.moderationRule, db.highlights], async () => {
                    // Validation
                    const validation = async (table: any, incomingData: any[], schema: any) => {
                        if (!Array.isArray(incomingData)) return [];

                        const validatedData = [];
                        for (const item of incomingData) {
                            const result = schema.safeParse(item);

                            if (!result.success) {
                                // If even one object is invalid, we abort the entire process
                                if (__DEBUG__) {
                                    console.error("Validation failed for item:", item, result.error);
                                }
                                throw new Error(`Invalid data format in ${table.name}`);
                            }

                            // Search for an existing record by a unique trigger
                            const existing = await table.where('trigger').equals(result.data.trigger).first();

                            validatedData.push({
                                ...result.data,
                                id: existing?.id,
                            });
                        }
                        return validatedData;
                    };

                    // The import process for each table
                    if (json.commands) {
                        const data = await validation(db.commands, json.commands, commandSchema);
                        await db.commands.bulkPut(data);
                    }

                    if (json.moderationRule) {
                        const data = await validation(db.moderationRule, json.moderationRule, ruleSchema);
                        await db.moderationRule.bulkPut(data);
                    }

                    if (json.highlights) {
                        const data = await validation(db.highlights, json.highlights, highlightSchema);
                        await db.highlights.bulkPut(data);
                    }
                });

                toast.success(i18n.t("importSuccess"), { id: loadingToast });
                // Clear the input so that the same file can be imported again
                if (fileInputRef.current) fileInputRef.current.value = '';
            } catch (error: any) {
                if (__DEBUG__) {
                    console.error("[Import]:", error);
                }
                toast.error(i18n.t("errors.unknown"), { id: loadingToast });
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-8">
            <PageHeader title={i18n.t('backup')}>
                <PageDescription>{i18n.t("backupDescription")}</PageDescription>
            </PageHeader>

            <div className="space-y-8">
                <div className="flex flex-col gap-4">
                    <div className="space-y-1">
                        <h3 className="text-base font-medium flex items-center gap-2">
                            <Download size={18} strokeWidth={2.75} className="text-primary" />
                            {i18n.t("exportData")}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-normal">
                            {i18n.t("exportDescription")}
                        </p>
                    </div>
                    <Button onClick={handleExport} className="w-fit">{i18n.t("downloadFile")}</Button>
                </div>

                <hr />

                <div className="flex flex-col gap-4">
                    <div className="space-y-1">
                        <h3 className="text-base font-medium flex items-center gap-2">
                            <Upload size={18} strokeWidth={2.75} className="text-primary" />
                            {i18n.t("importData")}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-normal">{i18n.t("importMergeDescription")}</p>
                    </div>

                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImport} />

                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-fit">{i18n.t("selectFileToImport")}</Button>
                </div>
            </div>
        </div>
    );
}