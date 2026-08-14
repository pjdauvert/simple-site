import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  FileDownloadOutlined as DownloadIcon,
  FileUploadOutlined as UploadIcon,
  Save as SaveIcon,
  TuneOutlined as SettingsIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  type PageConfiguration,
  type SectionProps,
  type SectionType,
  type SiteThemeConfig,
  type ThemeConfig,
  SiteConfigSchema,
} from '@simple-site/interfaces';
import { loadDraftConfig, saveDraftConfig } from '../../../services/configVersionService';
import { reconcileMenu } from '../../../router/publicMenu';
import { useNotifications } from '../../../hooks/useNotifications';
import { ScopedAppTheme } from '../../../features/theme/ScopedAppTheme';
import { PageSelector } from './PageSelector';
import { ThemeSelector } from './ThemeSelector';
import { SectionPreview } from './SectionPreview';
import { Loader } from '../../Loader';
import { StickySaveButton } from '../StickySaveButton';
import { PageSettingsDialog } from './PageSettingsDialog';
import { createPage, createSection, isHomePage, moveItem, pagesAreValid, validatePages } from './pagesDraft';
import { downloadPageJson, downloadPagesJson, parsePageFile, parsePagesFile } from './pagesImportExport';

/**
 * Pages tab of /manage/site: a full page & section editor. Reads the working
 * draft (`GET /api/config/draft`); a left-aligned page picker sits alongside
 * import/export/save, the preview fills the width, and page settings / the
 * section editor live in a foldable right drawer. Navigation ordering/visibility
 * lives on the Menu tab. Saves the whole draft (`POST /api/config`) — re-fetching
 * first so concurrent edits to `site`/`themes` are preserved, and reconciling the
 * draft's menu with the new pages set. Changes go live only when published from
 * the Config Versions panel.
 */
export const PagesEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();
  // Captured here (outside the previewed theme) so the section selection accent
  // always uses the admin theme's secondary colour, not the page's preview theme.
  const selectionColor = useTheme().palette.secondary.main;

  const [pages, setPages] = useState<PageConfiguration[]>([]);
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [site, setSite] = useState<SiteThemeConfig | null>(null);
  const [selectedThemeName, setSelectedThemeName] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState(0);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [deletePageIndex, setDeletePageIndex] = useState<number | null>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [importAnchor, setImportAnchor] = useState<null | HTMLElement>(null);
  const [replacePages, setReplacePages] = useState<PageConfiguration[] | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const addPageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (!active) return;
        setPages(config.pages);
        setThemes(config.themes);
        setSite(config.site);
        // Preview under the first theme when there's a choice (mirrors the app's
        // "2+ themes" switcher rule); no theme scoping when there are fewer.
        setSelectedThemeName(config.themes.length >= 2 ? config.themes[0].themeName : null);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.pages.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const errors = useMemo(() => validatePages(pages), [pages]);
  const currentPage: PageConfiguration | undefined = pages[selectedPage];
  const isHome = currentPage ? isHomePage(currentPage) : false;
  const previewTheme = useMemo(
    () => themes.find((t) => t.themeName === selectedThemeName),
    [themes, selectedThemeName],
  );

  const updatePage = (index: number, next: PageConfiguration) =>
    setPages((prev) => prev.map((p, i) => (i === index ? next : p)));

  // Creating or importing a page opens its settings; selecting an existing page
  // just switches the preview.
  const addPage = () => {
    setPages((prev) => {
      const page = createPage(prev.map((p) => p.route), prev.map((p) => p.pageName));
      setSelectedPage(prev.length);
      return [...prev, page];
    });
    setSelectedSection(null);
    setSettingsOpen(true);
  };

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    setSelectedPage((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
    setSelectedSection(null);
    setSettingsOpen(false);
  };

  const selectPage = (index: number) => {
    setSelectedPage(index);
    setSelectedSection(null);
    setSettingsOpen(false);
  };

  const selectSection = (index: number) => setSelectedSection(index);

  const addSection = (type: SectionType) => {
    if (!currentPage) return;
    const section = createSection(type, currentPage.sections.map((s) => s.sectionName));
    updatePage(selectedPage, { ...currentPage, sections: [...currentPage.sections, section] });
    setSelectedSection(currentPage.sections.length);
  };

  const removeSection = (index: number) => {
    if (!currentPage) return;
    updatePage(selectedPage, { ...currentPage, sections: currentPage.sections.filter((_, i) => i !== index) });
    setSelectedSection((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  };

  const moveSection = (from: number, to: number) => {
    if (!currentPage) return;
    const sections = moveItem(currentPage.sections, from, to);
    if (sections === currentPage.sections) return;
    updatePage(selectedPage, { ...currentPage, sections });
    setSelectedSection((prev) => (prev === from ? to : prev));
  };

  const changeSection = (index: number, next: SectionProps<SectionType>) => {
    if (!currentPage) return;
    updatePage(selectedPage, {
      ...currentPage,
      sections: currentPage.sections.map((s, i) => (i === index ? next : s)),
    });
  };

  const exportAll = () => { setExportAnchor(null); downloadPagesJson(pages); };
  const exportCurrent = () => { setExportAnchor(null); if (currentPage) downloadPageJson(currentPage); };

  const onReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = parsePagesFile(await file.text());
    if (!res.ok) { notify.error(intl.formatMessage({ id: 'page.manage.pages.import.error' })); return; }
    setReplacePages(res.pages);
  };

  const confirmReplace = () => {
    if (!replacePages) return;
    setPages(replacePages);
    setSelectedPage(0);
    setSelectedSection(null);
    setSettingsOpen(false);
    setShowErrors(false);
    setReplacePages(null);
    notify.success(intl.formatMessage({ id: 'page.manage.pages.import.success' }));
  };

  const onAddPageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = parsePageFile(await file.text());
    if (!res.ok) { notify.error(intl.formatMessage({ id: 'page.manage.pages.import.error' })); return; }
    setPages((prev) => {
      setSelectedPage(prev.length);
      return [...prev, res.page];
    });
    setSelectedSection(null);
    setSettingsOpen(true);
    notify.success(intl.formatMessage({ id: 'page.manage.pages.import.pageSuccess' }));
  };

  const handleSave = async () => {
    setShowErrors(true);
    if (!pagesAreValid(errors)) {
      notify.error(intl.formatMessage({ id: 'page.manage.pages.error.invalid' }));
      return;
    }
    // Normalize identity fields so stored routes/pageNames are clean and uniqueness holds.
    const normalized = pages.map((p) => ({ ...p, route: p.route.trim(), pageName: p.pageName.trim() }));
    setSubmitting(true);
    try {
      // Re-fetch so a concurrent edit to site/themes on the draft isn't clobbered.
      const current = await loadDraftConfig();
      // Keep the draft's menu consistent with the new pages set (deleted/renamed
      // pages are pruned, new ones appended); feature entries are left untouched.
      const menu = current.menu ? reconcileMenu(current.menu, normalized, []) : undefined;
      const parsed = SiteConfigSchema.safeParse({ ...current, pages: normalized, menu });
      if (!parsed.success) {
        notify.error(intl.formatMessage({ id: 'page.manage.pages.error.invalid' }));
        return;
      }
      await saveDraftConfig(parsed.data);
      notify.success(intl.formatMessage({ id: 'page.manage.pages.saved' }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.pages.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><Loader variant="triskelion" size={48} /></Box>;
  }
  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  const sectionPreview = currentPage ? (
    <SectionPreview
      page={currentPage}
      selectedSectionIndex={selectedSection}
      selectionColor={selectionColor}
      onSelectSection={selectSection}
      onMoveSection={moveSection}
      onRemoveSection={removeSection}
      onAddSection={addSection}
      onChangeSection={changeSection}
    />
  ) : null;

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
        <PageSelector
          pages={pages}
          errors={errors}
          showErrors={showErrors}
          selectedIndex={selectedPage}
          onSelect={selectPage}
          onAdd={addPage}
        />
        {themes.length >= 2 && (
          <ThemeSelector themes={themes} selected={selectedThemeName} onSelect={setSelectedThemeName} />
        )}
        <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.settings.title' })}>
          <span>
            <IconButton
              onClick={() => setSettingsOpen(true)}
              disabled={!currentPage}
              aria-label={intl.formatMessage({ id: 'page.manage.pages.settings.title' })}
            >
              <SettingsIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />

        <Button variant="outlined" startIcon={<UploadIcon />} onClick={(e) => setImportAnchor(e.currentTarget)}>
          <FormattedMessage id="page.manage.pages.import" />
        </Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} disabled={pages.length === 0} onClick={(e) => setExportAnchor(e.currentTarget)}>
          <FormattedMessage id="page.manage.pages.export" />
        </Button>
      </Stack>

      <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
        <MenuItem onClick={exportAll}><FormattedMessage id="page.manage.pages.export.all" /></MenuItem>
        <MenuItem onClick={exportCurrent} disabled={!currentPage}><FormattedMessage id="page.manage.pages.export.page" /></MenuItem>
      </Menu>
      <Menu anchorEl={importAnchor} open={Boolean(importAnchor)} onClose={() => setImportAnchor(null)}>
        <MenuItem onClick={() => { setImportAnchor(null); replaceInputRef.current?.click(); }}>
          <FormattedMessage id="page.manage.pages.import.replace" />
        </MenuItem>
        <MenuItem onClick={() => { setImportAnchor(null); addPageInputRef.current?.click(); }}>
          <FormattedMessage id="page.manage.pages.import.addPage" />
        </MenuItem>
      </Menu>
      <input ref={replaceInputRef} type="file" accept="application/json,.json" hidden onChange={onReplaceFile} />
      <input ref={addPageInputRef} type="file" accept="application/json,.json" hidden onChange={onAddPageFile} />

      {/* The preview takes the full width; content is edited in place on it. */}
      <Box sx={{ minWidth: 0 }}>
        {currentPage ? (
          previewTheme && site ? (
            <ScopedAppTheme themeConfig={previewTheme} siteThemeConfig={site}>{sectionPreview}</ScopedAppTheme>
          ) : (
            sectionPreview
          )
        ) : (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <FormattedMessage id="page.manage.pages.empty" />
            </Typography>
            <Button variant="outlined" onClick={addPage}>
              <FormattedMessage id="page.manage.pages.add" />
            </Button>
          </Paper>
        )}
      </Box>

      {currentPage && (
        <PageSettingsDialog
          open={settingsOpen}
          page={currentPage}
          errors={errors[selectedPage] ?? {}}
          showErrors={showErrors}
          isHome={isHome}
          onChange={(next) => updatePage(selectedPage, next)}
          onDelete={() => { setSettingsOpen(false); setDeletePageIndex(selectedPage); }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <Dialog open={deletePageIndex !== null} onClose={() => setDeletePageIndex(null)} maxWidth="xs" fullWidth>
        <DialogTitle><FormattedMessage id="page.manage.pages.confirmDelete.title" /></DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage
              id="page.manage.pages.confirmDelete.body"
              values={{ name: deletePageIndex !== null ? (pages[deletePageIndex]?.menuTitle || pages[deletePageIndex]?.route) : '' }}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePageIndex(null)}><FormattedMessage id="page.manage.pages.confirmDelete.cancel" /></Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => { if (deletePageIndex !== null) removePage(deletePageIndex); setDeletePageIndex(null); }}
          >
            <FormattedMessage id="page.manage.pages.confirmDelete.confirm" />
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={replacePages !== null} onClose={() => setReplacePages(null)} maxWidth="xs" fullWidth>
        <DialogTitle><FormattedMessage id="page.manage.pages.import.replaceTitle" /></DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage id="page.manage.pages.import.replaceBody" values={{ count: replacePages?.length ?? 0 }} />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplacePages(null)}><FormattedMessage id="page.manage.pages.cancel" /></Button>
          <Button variant="contained" onClick={confirmReplace}>
            <FormattedMessage id="page.manage.pages.import.replaceConfirm" />
          </Button>
        </DialogActions>
      </Dialog>

      <StickySaveButton onClick={handleSave} disabled={submitting} submitting={submitting} startIcon={<SaveIcon />}>
        <FormattedMessage id="page.manage.pages.save" />
      </StickySaveButton>
    </Box>
  );
};
