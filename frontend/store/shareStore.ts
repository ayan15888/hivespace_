import { create } from "zustand";
import { generateShareLink, revokeShareLink, ShareableLinkResponse } from "@/lib/api/share";
import { gooeyToast } from "@/components/ui/goey-toaster";

interface ShareState {
  // Map of projectId -> ShareableLinkResponse
  shareLinks: Record<string, ShareableLinkResponse | null>;
  loading: boolean;
  error: string | null;
  fetchOrCreateShareLink: (projectId: string) => Promise<ShareableLinkResponse | null>;
  revokeProjectShareLink: (projectId: string, linkId: string) => Promise<void>;
  setShareLink: (projectId: string, link: ShareableLinkResponse | null) => void;
}

export const useShareStore = create<ShareState>((set, get) => ({
  shareLinks: {},
  loading: false,
  error: null,

  fetchOrCreateShareLink: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const link = await generateShareLink(projectId);
      set((state) => ({
        shareLinks: {
          ...state.shareLinks,
          [projectId]: link,
        },
        loading: false,
      }));
      return link;
    } catch (err: any) {
      const msg = err.message || "Failed to generate share link";
      set({ error: msg, loading: false });
      return null;
    }
  },

  revokeProjectShareLink: async (projectId: string, linkId: string) => {
    set({ loading: true, error: null });
    try {
      await revokeShareLink(linkId);
      set((state) => ({
        shareLinks: {
          ...state.shareLinks,
          [projectId]: null,
        },
        loading: false,
      }));
      gooeyToast.success("Share link revoked successfully");
    } catch (err: any) {
      const msg = err.message || "Failed to revoke share link";
      set({ error: msg, loading: false });
      gooeyToast.error(msg);
      throw err;
    }
  },

  setShareLink: (projectId: string, link: ShareableLinkResponse | null) => {
    set((state) => ({
      shareLinks: {
        ...state.shareLinks,
        [projectId]: link,
      },
    }));
  },
}));
