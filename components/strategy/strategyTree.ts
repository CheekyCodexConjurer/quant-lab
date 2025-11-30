import { CustomIndicator, StrategyFile } from '../../types';
import { FileTreeNode } from '../files/FileTree';
import { ensureRootedPath, normalizeSlashes, toRelativePath } from '../../utils/path';

export const STRATEGY_ROOT = 'strategies';
export const INDICATOR_ROOT = 'indicators';

export const derivePath = (strategy: StrategyFile) => {
  const base = strategy.filePath || `${strategy.name || strategy.id}.py`;
  const rooted = ensureRootedPath(STRATEGY_ROOT, base);
  const rel = toRelativePath(STRATEGY_ROOT, rooted);
  return rel ? `${STRATEGY_ROOT}/${rel}` : STRATEGY_ROOT;
};

export const deriveIndicatorPath = (indicator: CustomIndicator) => {
  const base = indicator.filePath || `${indicator.name || indicator.id}.py`;
  const rooted = ensureRootedPath(INDICATOR_ROOT, base);
  const rel = toRelativePath(INDICATOR_ROOT, rooted);
  return rel ? `${INDICATOR_ROOT}/${rel}` : INDICATOR_ROOT;
};

export const buildTree = (strategies: StrategyFile[], extraFolders: string[], order: string[]): FileTreeNode => {
  const root: FileTreeNode = {
    id: STRATEGY_ROOT,
    name: STRATEGY_ROOT,
    path: STRATEGY_ROOT,
    type: 'folder',
    children: [],
  };
  const byFolder: Record<string, FileTreeNode> = { [STRATEGY_ROOT]: root };

  const registerFolder = (folderPath: string) => {
    const normalized = ensureRootedPath(STRATEGY_ROOT, folderPath);
    const rel = toRelativePath(STRATEGY_ROOT, normalized);
    const parts = rel ? rel.split('/').filter(Boolean) : [];
    let current = root;
    parts.forEach((segment, index) => {
      const currentPath = `${STRATEGY_ROOT}/${parts.slice(0, index + 1).join('/')}`;
      if (!byFolder[currentPath]) {
        const node: FileTreeNode = {
          id: currentPath,
          name: segment,
          path: currentPath,
          type: 'folder',
          children: [],
        };
        byFolder[currentPath] = node;
        current.children?.push(node);
      }
      current = byFolder[currentPath];
    });
  };

  extraFolders.forEach(registerFolder);

  strategies.forEach((strategy) => {
    const fullPath = derivePath(strategy);
    const rel = toRelativePath(STRATEGY_ROOT, fullPath);
    const parts = rel ? rel.split('/').filter(Boolean) : [];
    const folderParts = parts.slice(0, -1);
    let current = root;
    folderParts.forEach((segment, index) => {
      const currentPath = `${STRATEGY_ROOT}/${folderParts.slice(0, index + 1).join('/')}`;
      if (!byFolder[currentPath]) {
        const node: FileTreeNode = {
          id: currentPath,
          name: segment,
          path: currentPath,
          type: 'folder',
          children: [],
        };
        byFolder[currentPath] = node;
        current.children?.push(node);
      }
      current = byFolder[currentPath];
    });
    const fileName = parts[parts.length - 1] || `${strategy.name || strategy.id}.py`;
    current.children?.push({
      id: strategy.id,
      name: fileName,
      path: fullPath,
      type: 'file',
    });
  });

  const sortNodes = (nodes?: FileTreeNode[]) =>
    (nodes || [])
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        const idxA = order.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(a.path));
        const idxB = order.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(b.path));
        const wa = idxA >= 0 ? idxA : Number.MAX_SAFE_INTEGER;
        const wb = idxB >= 0 ? idxB : Number.MAX_SAFE_INTEGER;
        if (wa !== wb) return wa - wb;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({ ...node, children: sortNodes(node.children) }));

  return { ...root, children: sortNodes(root.children) };
};

export const buildIndicatorTree = (
  indicators: CustomIndicator[],
  order: string[],
  folders: string[],
  workspaceItems: { path: string; type: 'file' | 'folder'; isMain?: boolean }[]
): FileTreeNode => {
  const root: FileTreeNode = {
    id: INDICATOR_ROOT,
    name: INDICATOR_ROOT,
    path: INDICATOR_ROOT,
    type: 'folder',
    children: [],
  };
  const byFolder: Record<string, FileTreeNode> = { [INDICATOR_ROOT]: root };

  const registerFolder = (folderPath: string) => {
    const normalized = ensureRootedPath(INDICATOR_ROOT, folderPath);
    const rel = toRelativePath(INDICATOR_ROOT, normalized);
    const parts = rel ? rel.split('/').filter(Boolean) : [];
    let current = root;
    parts.forEach((segment, index) => {
      const currentPath = `${INDICATOR_ROOT}/${parts.slice(0, index + 1).join('/')}`;
      if (!byFolder[currentPath]) {
        const node: FileTreeNode = {
          id: currentPath,
          name: segment,
          path: currentPath,
          type: 'folder',
          children: [],
        };
        byFolder[currentPath] = node;
        current.children?.push(node);
      }
      current = byFolder[currentPath];
    });
  };

  indicators.forEach((indicator) => {
    if (indicator.filePath) {
      const folder = indicator.filePath.split('/').slice(0, -1).join('/');
      if (folder && folder !== INDICATOR_ROOT) {
        registerFolder(folder);
      }
    }
  });
  (folders || []).forEach((folderPath) => registerFolder(folderPath));

  (workspaceItems || []).forEach((item) => {
    const rawPath = item.path || '';
    if (!rawPath.toLowerCase().startsWith('indicators/')) return;
    const rel = toRelativePath(INDICATOR_ROOT, rawPath);
    const parts = rel ? rel.split('/').filter(Boolean) : [];
    if (!parts.length) return;
    const folderParts = item.type === 'folder' ? parts : parts.slice(0, -1);
    let current = root;
    folderParts.forEach((segment, index) => {
      const currentPath = `${INDICATOR_ROOT}/${folderParts.slice(0, index + 1).join('/')}`;
      if (!byFolder[currentPath]) {
        const node: FileTreeNode = {
          id: currentPath,
          name: segment,
          path: currentPath,
          type: 'folder',
          children: [],
        };
        byFolder[currentPath] = node;
        current.children?.push(node);
      }
      current = byFolder[currentPath];
    });

    if (item.type === 'file' && !item.isMain) {
      const filePath = rawPath;
      const fileName = parts[parts.length - 1];
      const existing = current.children?.some((child) => normalizeSlashes(child.path) === normalizeSlashes(filePath));
      if (!existing) {
        current.children = current.children || [];
        current.children.push({
          id: filePath,
          name: fileName,
          path: filePath,
          type: 'file',
        });
      }
    }
  });

  indicators.forEach((indicator) => {
    const fullPath = deriveIndicatorPath(indicator);
    const rel = toRelativePath(INDICATOR_ROOT, fullPath);
    const parts = rel ? rel.split('/').filter(Boolean) : [];
    const folderParts = parts.slice(0, -1);
    let current = root;
    folderParts.forEach((segment, index) => {
      const currentPath = `${INDICATOR_ROOT}/${folderParts.slice(0, index + 1).join('/')}`;
      if (!byFolder[currentPath]) {
        const node: FileTreeNode = {
          id: currentPath,
          name: segment,
          path: currentPath,
          type: 'folder',
          children: [],
        };
        byFolder[currentPath] = node;
        current.children?.push(node);
      }
      current = byFolder[currentPath];
    });
    const fileName = parts[parts.length - 1] || `${indicator.name || indicator.id}.py`;
    current.children?.push({
      id: indicator.id,
      name: fileName,
      path: fullPath,
      type: 'file',
    });
  });

  const sortNodes = (nodes?: FileTreeNode[]) =>
    (nodes || [])
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        const idxA = order.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(a.path));
        const idxB = order.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(b.path));
        const wa = idxA >= 0 ? idxA : Number.MAX_SAFE_INTEGER;
        const wb = idxB >= 0 ? idxB : Number.MAX_SAFE_INTEGER;
        if (wa !== wb) return wa - wb;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({ ...node, children: sortNodes(node.children) }));

  return { ...root, children: sortNodes(root.children) };
};

export const buildWorkspaceFolders = (folders: string[]): FileTreeNode[] =>
  (folders || [])
    .map((folder) => ({
      id: folder,
      name: folder.split('/').pop() || folder,
      path: folder,
      type: 'folder' as const,
      children: [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

