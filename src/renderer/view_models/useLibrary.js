import { useCallback, useEffect, useState } from 'react';

export function useLibrary(api) {
  const [documents, setDocuments] = useState([]);
  const [libraryRoot, setLibraryRoot] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!api?.library) return;
    setLoading(true);
    const [docs, root] = await Promise.all([
      api.library.listDocuments(),
      api.library.getRoot()
    ]);
    setDocuments(docs || []);
    setLibraryRoot(root || '');
    setLoading(false);
    return { documents: docs || [], libraryRoot: root || '' };
  }, [api]);

  useEffect(() => {
    refresh();
    if (!api?.onLibraryChanged) return undefined;
    const unsubscribe = api.onLibraryChanged(() => refresh());
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [api, refresh]);

  const chooseLibraryRoot = useCallback(async () => {
    if (!api?.library) return null;
    const root = await api.library.setRoot();
    if (root) await refresh();
    return root;
  }, [api, refresh]);

  const importFiles = useCallback(async () => {
    if (!api?.library) {
      return { importedPaths: [], documents: [] };
    }
    const imported = await api.library.importFiles();
    const result = await refresh();
    return {
      importedPaths: imported,
      documents: result?.documents || []
    };
  }, [api, refresh]);

  return {
    documents,
    libraryRoot,
    loading,
    refresh,
    chooseLibraryRoot,
    importFiles
  };
}
