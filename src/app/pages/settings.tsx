import { PageHeader } from "@components/ui/page-header";
import i18n from "@/lib/i18n";

export default function SettingsPage() {

    return (
        <div className="space-y-8">
            <PageHeader title={i18n.t('settings')} />
            <div className="space-y-4">

            </div>
        </div>
    );
}