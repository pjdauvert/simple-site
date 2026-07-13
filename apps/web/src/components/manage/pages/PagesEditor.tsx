import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
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
} from '@mui/material';
import {
  FileDownloadOutlined as DownloadIcon,
  FileUploadOutlined as UploadIcon,
  Save as SaveIcon,
  SwapVert as ReorderIcon,
  ViewSidebarOutlined as DrawerIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  type PageConfiguration,
  type SectionProps,
  type SectionType,
  SiteConfigSchema,
  isHomePage,
} from '@simple-site/interfaces';
import { loadDraftConfig, saveDraftConfig } from '../../../services/configVersionService';
import { useNotifications } from '../../../hooks/useNotifications';
import { PageSelector } from './PageSelector';
import { ReorderPagesDialog } from './ReorderPagesDialog';
import { SectionPreview } from './SectionPreview';
import { PageDrawer } from './PageDrawer';
import { createPage, createSection, moveItem, pagesAreValid, validatePages } from './pagesDraft';
import { downloadPageJson, downloadPagesJson, parsePageFile, parsePagesFile } from './pagesImportExport';

/**
 * Pages tab of /manage/site: a full page & section editor. Reads the working
 * draft (`GET /api/config/draft`); a left-aligned page picker + reorder control
 * sit alongside import/export/save, the preview fills the width, and page settings
 * / the section editor live in a foldable right drawer. Saves the whole draft
 * (`POST /api/config`) — re-fetching first so concurrent edits to `site`/`themes`
 * are preserved. Changes go live only when published from the Config Versions panel.
 */
export const PagesEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [pages, setPages] = useState<PageConfiguration[]>([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
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
      .then((config) => { if (active) setPages(config.pages); })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.pages.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const errors = useMemo(() => validatePages(pages), [pages]);
  const currentPage: PageConfiguration | undefined = pages[selectedPage];
  const isHome = currentPage ? isHomePage(currentPage) : false;

  const updatePage = (index: number, next: PageConfiguration) =>
    setPages((prev) => prev.map((p, i) => (i === index ? next : p)));

  // Adding or importing a page opens the drawer on its settings; selecting an
  // existing page leaves the drawer as the user last set it (closed by default).
  const addPage = () => {
    setPages((prev) => {
      const page = createPage(prev.map((p) => p.route), prev.map((p) => p.pageName));
      setSelectedPage(prev.length);
      return [...prev, page];
    });
    setSelectedSection(null);
    setDrawerOpen(true);
  };

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    setSelectedPage((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
    setSelectedSection(null);
    setDrawerOpen(false);
  };

  // Reorder keeps the same page selected by tracking its object reference.
  const movePage = (from: number, to: number) => {
    setPages((prev) => {
      const selectedRef = prev[selectedPage];
      const next = moveItem(prev, from, to);
      const newIndex = next.indexOf(selectedRef);
      if (newIndex >= 0) setSelectedPage(newIndex);
      return next;
    });
  };

  const selectPage = (index: number) => {
    setSelectedPage(index);
    setSelectedSection(null);
    setDrawerOpen(false);
  };

  const selectSection = (index: number) => {
    setSelectedSection(index);
    setDrawerOpen(true);
  };

  const addSection = (type: SectionType) => {
    if (!currentPage) return;
    const section = createSection(type, currentPage.sections.map((s) => s.sectionName));
    updatePage(selectedPage, { ...currentPage, sections: [...currentPage.sections, section] });
    setSelectedSection(currentPage.sections.length);
    setDrawerOpen(true);
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
    setDrawerOpen(false);
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
    setDrawerOpen(true);
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
      const parsed = SiteConfigSchema.safeParse({ ...current, pages: normalized });
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
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }
  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

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
        <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.reorder' })}>
          <span>
            <IconButton onClick={() => setReorderOpen(true)} disabled={pages.length < 2} aria-label={intl.formatMessage({ id: 'page.manage.pages.reorder' })}>
              <ReorderIcon />
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
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={submitting}>
          {submitting ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.manage.pages.save" />}
        </Button>
        <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.drawer.toggle' })}>
          <span>
            <IconButton
              onClick={() => setDrawerOpen((o) => !o)}
              disabled={!currentPage}
              color={drawerOpen ? 'primary' : 'default'}
              aria-label={intl.formatMessage({ id: 'page.manage.pages.drawer.toggle' })}
            >
              <DrawerIcon />
            </IconButton>
          </span>
        </Tooltip>
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

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {currentPage ? (
            <SectionPreview
              page={currentPage}
              selectedSectionIndex={selectedSection}
              onSelectSection={selectSection}
              onMoveSection={moveSection}
              onRemoveSection={removeSection}
              onAddSection={addSection}
            />
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

        <Collapse in={drawerOpen && Boolean(currentPage)} orientation="horizontal" unmountOnExit>
          <Paper
            variant="outlined"
            sx={{
              width: { xs: 300, sm: 360, md: 400 },
              p: 2,
              position: 'sticky',
              top: 88,
              maxHeight: 'calc(100vh - 104px)',
              overflowY: 'auto',
            }}
          >
            {currentPage && (
              <PageDrawer
                page={currentPage}
                selectedSection={selectedSection}
                errors={errors[selectedPage] ?? {}}
                showErrors={showErrors}
                isHome={isHome}
                onChangePage={(next) => updatePage(selectedPage, next)}
                onChangeSection={changeSection}
                onBack={() => setSelectedSection(null)}
                onClose={() => setDrawerOpen(false)}
                onDelete={() => setDeletePageIndex(selectedPage)}
              />
            )}
          </Paper>
        </Collapse>
      </Box>

      <ReorderPagesDialog open={reorderOpen} pages={pages} onClose={() => setReorderOpen(false)} onMove={movePage} />

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
    </Box>
  );
};
