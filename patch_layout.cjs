const fs = require('fs');
let content = fs.readFileSync('src/components/workflow/WorkflowCardCollapsed.tsx', 'utf-8');

// Replace WORKFLOW_ROW_GRID with flex layout
content = content.replace(
  'WORKFLOW_ROW_GRID, isExpanded',
  '"flex items-center gap-3 w-full flex-nowrap overflow-hidden", isExpanded'
);

// We need to assign specific widths to each child div so they don't squash.
// 1. DateBlock
content = content.replace(
  '<div className="hidden md:flex min-w-0">',
  '<div className="hidden md:flex min-w-0 w-[56px] shrink-0">'
);
// 2. ClientCell
content = content.replace(
  '<div className="min-w-0 flex items-center">',
  '<div className="min-w-0 flex items-center w-[180px] lg:w-[220px] shrink-0">'
);
// 3. Description (flex-1 so it grows)
content = content.replace(
  '<div className="hidden md:flex items-center px-1 min-w-0" onClick={e => e.stopPropagation()}>',
  '<div className="hidden md:flex items-center px-1 min-w-0 flex-1" onClick={e => e.stopPropagation()}>'
);
// 4. Package Combobox
content = content.replace(
  '<div className="hidden md:flex items-center min-w-0" onClick={e => e.stopPropagation()}>\n          <WorkflowPackageCombobox',
  '<div className="hidden md:flex items-center min-w-0 w-[160px] shrink-0" onClick={e => e.stopPropagation()}>\n          <WorkflowPackageCombobox'
);
// 5. Status
content = content.replace(
  '<div className="hidden md:flex items-center justify-center min-w-0" onClick={e => e.stopPropagation()}>\n          <SessionStatusSelect',
  '<div className="hidden md:flex items-center justify-center min-w-0 w-[140px] shrink-0" onClick={e => e.stopPropagation()}>\n          <SessionStatusSelect'
);
// 6. Products
content = content.replace(
  '<div className="hidden @4xl:flex items-center justify-center min-w-0" onClick={e => e.stopPropagation()}>\n          <ProductStatusChip',
  '<div className="hidden xl:flex items-center justify-center min-w-0 w-[84px] shrink-0" onClick={e => e.stopPropagation()}>\n          <ProductStatusChip'
);
// 7. Extra Photos
content = content.replace(
  '<div className="hidden @6xl:flex items-center justify-center min-w-0" onClick={e => e.stopPropagation()}>\n          {fin.hasGaleria ? (',
  '<div className="hidden 2xl:flex items-center justify-center min-w-0 w-[70px] shrink-0" onClick={e => e.stopPropagation()}>\n          {fin.hasGaleria ? ('
);
// 8. Metric Cell
content = content.replace(
  '<div className="hidden md:flex flex-col items-end justify-center min-w-0">\n          <SessionMetricCell',
  '<div className="hidden md:flex flex-col items-end justify-center min-w-0 w-[96px] shrink-0">\n          <SessionMetricCell'
);
// 9. Gallery buttons
content = content.replace(
  '<div className="hidden md:flex items-center min-w-0" onClick={e => e.stopPropagation()}>\n          <CardGalleryButtons',
  '<div className="hidden md:flex items-center min-w-0 w-[110px] shrink-0 justify-end" onClick={e => e.stopPropagation()}>\n          <CardGalleryButtons'
);
// 10. Menu
content = content.replace(
  '<div className="hidden md:flex items-center justify-end min-w-0">\n          <SessionRowMenu',
  '<div className="hidden md:flex items-center justify-end min-w-0 w-[32px] shrink-0">\n          <SessionRowMenu'
);

fs.writeFileSync('src/components/workflow/WorkflowCardCollapsed.tsx', content);
console.log('Layout patched!');
