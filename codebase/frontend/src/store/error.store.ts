import { create } from 'zustand';

interface ErrorState {
  errorMsg: string | null;
  isOpen: boolean;
  title: string;
  showError: (msg: string, title?: string) => void;
  closeError: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  errorMsg: null,
  isOpen: false,
  title: 'Error Encountered',
  showError: (msg, title = 'Error Encountered') => set({ errorMsg: msg, isOpen: true, title }),
  closeError: () => set({ errorMsg: null, isOpen: false }),
}));
