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
    if (root) {
      setLibraryRoot(root);
      await refresh();
    }
    return root;
  }, [api, refresh]);

  const importFiles = useCallback(async () => {
    if (!api?.library) return [];
    const imported = await api.library.importFiles();
    await refresh();
    return imported;
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
