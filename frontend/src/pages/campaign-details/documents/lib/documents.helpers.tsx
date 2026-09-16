/**
 * Document Browser Icon Helpers & Shared UI
 * @module pages/campaign-details/documents/lib
 */

import { IconButton } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleIcon from '@mui/icons-material/Article';
import TableChartIcon from '@mui/icons-material/TableChart';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderIcon from '@mui/icons-material/Folder';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { copyToClipboard } from '@shared/lib';
import { useNotification } from '@shared/ui';

export const getFileIcon = (name: string, size = 24) => {
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith('.pdf')) return <PictureAsPdfIcon sx={{ color: '#d32f2f', fontSize: size }} />;
    if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx'))
        return <TableChartIcon sx={{ color: '#2e7d32', fontSize: size }} />;
    if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx'))
        return <ArticleIcon sx={{ color: '#1976d2', fontSize: size }} />;
    return <InsertDriveFileIcon sx={{ color: '#757575', fontSize: size }} />;
};

export const getFolderIcon = (name: string, size = 28, color = '#999') => {
    const lowerName = name.toLowerCase();
    const hasExtension = lowerName.includes('.');
    if (hasExtension) {
        return getFileIcon(name, size);
    }
    return <FolderIcon sx={{ color: color, fontSize: size }} />;
};

interface CopyPathButtonProps {
    path: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export function CopyPathButton({ path, onClick }: CopyPathButtonProps) {
    const { showNotification } = useNotification();

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
        e.stopPropagation();
        // copyToClipboard gère le repli hors contexte sécurisé ; on notifie le
        // résultat réel au lieu d'échouer silencieusement.
        void copyToClipboard(path).then((copied) => {
            if (copied) {
                showNotification('Chemin copié', 'success');
            } else {
                showNotification('Impossible de copier le chemin', 'error');
            }
        });
        onClick?.(e);
    };

    return (
        <IconButton
            color="primary"
            size="small"
            onClick={handleClick}
            sx={{
                borderRadius: 1,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
            }}
        >
            <ContentCopyIcon fontSize="small" />
        </IconButton>
    );
}
