/**
 * Curated MUI icon map for user shortcuts.
 * @module features/dashboard/lib
 */

import type { SvgIconProps } from '@mui/material';
import type { ComponentType } from 'react';

import LanguageIcon from '@mui/icons-material/Language';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import StorageIcon from '@mui/icons-material/Storage';
import ScienceIcon from '@mui/icons-material/Science';
import BuildIcon from '@mui/icons-material/Build';
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import ComputerIcon from '@mui/icons-material/Computer';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import CloudIcon from '@mui/icons-material/Cloud';
import SecurityIcon from '@mui/icons-material/Security';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BookIcon from '@mui/icons-material/Book';
import SchoolIcon from '@mui/icons-material/School';
import EngineeringIcon from '@mui/icons-material/Engineering';
import FactoryIcon from '@mui/icons-material/Factory';
import InsightsIcon from '@mui/icons-material/Insights';
import TerminalIcon from '@mui/icons-material/Terminal';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import ArticleIcon from '@mui/icons-material/Article';
import HomeIcon from '@mui/icons-material/Home';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WorkIcon from '@mui/icons-material/Work';

export const ICON_MAP: Record<string, ComponentType<SvgIconProps>> = {
    Language: LanguageIcon,
    FolderOpen: FolderOpenIcon,
    Storage: StorageIcon,
    Science: ScienceIcon,
    Build: BuildIcon,
    Description: DescriptionIcon,
    Link: LinkIcon,
    Computer: ComputerIcon,
    Email: EmailIcon,
    CalendarToday: CalendarTodayIcon,
    Dashboard: DashboardIcon,
    Settings: SettingsIcon,
    Search: SearchIcon,
    Cloud: CloudIcon,
    Security: SecurityIcon,
    Assessment: AssessmentIcon,
    Book: BookIcon,
    School: SchoolIcon,
    Engineering: EngineeringIcon,
    Factory: FactoryIcon,
    Insights: InsightsIcon,
    Terminal: TerminalIcon,
    PhotoCamera: PhotoCameraIcon,
    Map: MapIcon,
    People: PeopleIcon,
    Inventory: InventoryIcon,
    Article: ArticleIcon,
    Home: HomeIcon,
    OpenInNew: OpenInNewIcon,
    Work: WorkIcon,
};

export const ICON_NAMES = Object.keys(ICON_MAP);
