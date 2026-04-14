import { Routes, Route, Navigate } from "react-router-dom";
import NotFoundPage from "./pages/not-found";
import CommandsPage from "./pages/commands";
import { Layout } from "./layout";
import ModerationRulesPage from "./pages/moderation-rules";
import SettingsPage from "./pages/settings";
import HighlightPage from "./pages/highlight";
import BackupPage from "./pages/backup";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<SettingsPage />} />
                <Route path="commands" element={<CommandsPage />} />
                <Route path="moderation/rules" element={<ModerationRulesPage />} />
                <Route path="highlight" element={<HighlightPage />} />
                <Route path="backup" element={<BackupPage />} />
            </Route>
            <Route index element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}